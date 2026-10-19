import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateApplication,
  createApplication,
  updateApplication,
  setStatus,
  saveInterview,
  removeInterview,
  saveContact,
  validateContact,
  completeNextAction,
  upcomingItems,
  applicationStats,
  filterApplications,
  matchApplication,
  daysUntil,
  normalizeTracker,
} from '../src/lib/applications.js';
import { roleFor } from '../src/data/roles.js';
import { analyzeRole } from '../src/lib/analysis.js';

const NOW = new Date('2026-10-14T10:00:00');
const plus = (days) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const JD = `Backend Engineer
Requirements
- Strong JavaScript and Node.js
- REST APIs and PostgreSQL
- Docker
Nice to have
- Kubernetes`;

test('validation catches missing fields, bad links and dates', () => {
  assert.deepEqual(Object.keys(validateApplication({}).errors).sort(), ['company', 'role']);
  const bad = validateApplication({ company: 'Acme', role: 'SDE', url: 'acme.com/jobs', deadline: '2026-13-40' });
  assert.ok(bad.errors.url && bad.errors.deadline);
  assert.equal(validateApplication({ company: 'Acme', role: 'SDE', url: 'https://acme.com/jobs/1', deadline: '2026-11-01' }).ok, true);
  assert.equal(validateApplication({ company: 'Acme', role: 'SDE', status: 'ghosted' }).errors.status, 'Choose a status.');
});

test('create parses the job description and records history', () => {
  const app = createApplication({ company: ' Acme ', role: 'Backend Engineer', description: JD, status: 'applied', nextActionText: 'Follow up with recruiter', nextActionDue: plus(3) }, NOW);
  assert.equal(app.company, 'Acme');
  assert.equal(app.appliedOn, '2026-10-14');
  assert.ok(app.parsed.required.some((s) => s.id === 'nodejs'));
  assert.ok(app.parsed.preferred.some((s) => s.id === 'kubernetes'));
  assert.deepEqual(app.history.map((h) => h.status), ['applied']);
  assert.equal(app.nextAction.done, false);
  // Saved jobs have no applied date yet.
  assert.equal(createApplication({ company: 'X', role: 'Y' }, NOW).appliedOn, null);
});

test('status changes, edits, interviews and contacts', () => {
  let app = createApplication({ company: 'Acme', role: 'SDE' }, NOW);
  app = setStatus(app, 'applied', 'Applied on careers site', NOW);
  assert.equal(app.appliedOn, '2026-10-14');
  assert.equal(setStatus(app, 'applied', '', NOW), app, 'same status is a no-op');

  app = updateApplication(app, { description: JD, notes: 'Referral from Priya' }, NOW);
  assert.ok(app.parsed.required.length > 0);
  assert.equal(app.notes, 'Referral from Priya');

  app = saveInterview(app, { round: 'Technical round 1', type: 'technical', date: plus(2), time: '15:30' }, NOW);
  assert.equal(app.status, 'interview', 'scheduling an interview moves the application forward');
  assert.equal(app.interviews[0].outcome, 'scheduled');
  const [round] = app.interviews;
  app = saveInterview(app, { ...round, outcome: 'passed', notes: 'Went well' }, NOW);
  assert.equal(app.interviews.length, 1);
  assert.equal(app.interviews[0].outcome, 'passed');
  app = removeInterview(app, round.id, NOW);
  assert.equal(app.interviews.length, 0);

  assert.equal(validateContact({ name: '' }).ok, false);
  assert.ok(validateContact({ name: 'Ravi', email: 'not-an-email' }).errors.email);
  app = saveContact(app, { name: 'Ravi', title: 'Recruiter', email: 'ravi@acme.com' }, NOW);
  assert.equal(app.contacts[0].name, 'Ravi');

  assert.deepEqual(app.history.map((h) => h.status), ['saved', 'applied', 'interview']);
});

test('upcoming items include deadlines, interviews and overdue next actions', () => {
  const a = createApplication({ company: 'Acme', role: 'SDE', deadline: plus(5) }, NOW);
  const b = saveInterview(createApplication({ company: 'Globex', role: 'Backend', status: 'applied' }, NOW), { round: 'HR round', type: 'hr', date: plus(1) }, NOW);
  const c = createApplication({ company: 'Initech', role: 'Intern', status: 'applied', nextActionText: 'Send thank-you email', nextActionDue: plus(-2) }, NOW);
  const d = createApplication({ company: 'Old', role: 'Closed', status: 'rejected', nextActionText: 'Ignore me', nextActionDue: plus(-1) }, NOW);
  const far = createApplication({ company: 'Later', role: 'SDE', deadline: plus(40) }, NOW);
  const items = upcomingItems([a, b, c, d, far], { now: NOW });
  assert.deepEqual(items.map((i) => i.kind), ['action', 'interview', 'deadline']);
  assert.equal(items[0].overdue, true);
  assert.equal(items[1].days, 1);
  assert.equal(daysUntil(plus(-2), NOW), -2);
  // Completed actions disappear, and closed applications raise no reminders.
  assert.ok(!upcomingItems([completeNextAction(c, NOW)], { now: NOW }).length);
  assert.ok(!upcomingItems([setStatus(b, 'offer', '', NOW)], { now: NOW }).length);
});

test('stats count what applications reached, not only where they are now', () => {
  const apps = [
    createApplication({ company: 'A', role: 'R' }, NOW),
    setStatus(createApplication({ company: 'B', role: 'R', status: 'applied' }, NOW), 'rejected', '', NOW),
    setStatus(setStatus(createApplication({ company: 'C', role: 'R', status: 'applied' }, NOW), 'interview', '', NOW), 'rejected', '', NOW),
    setStatus(createApplication({ company: 'D', role: 'R', status: 'interview' }, NOW), 'offer', '', NOW),
  ];
  const s = applicationStats(apps);
  assert.equal(s.total, 4);
  assert.equal(s.active, 1);
  assert.equal(s.submitted, 3);
  assert.equal(s.responseRate, 67);
  assert.equal(s.interviewRate, 67);
  assert.equal(s.offers, 1);
  assert.equal(applicationStats([]).responseRate, null);
});

test('filter, search and sort', () => {
  const apps = [
    createApplication({ company: 'Zeta', role: 'Frontend', status: 'applied', deadline: plus(9) }, NOW),
    createApplication({ company: 'Alpha', role: 'Backend', deadline: plus(2) }, NOW),
    createApplication({ company: 'Mid', role: 'Data', status: 'rejected' }, NOW),
  ];
  assert.deepEqual(filterApplications(apps, { status: 'active', sort: 'company' }).map((a) => a.company), ['Alpha', 'Zeta']);
  assert.deepEqual(filterApplications(apps, { search: 'back' }).map((a) => a.company), ['Alpha']);
  assert.deepEqual(filterApplications(apps, { sort: 'deadline' }).map((a) => a.company), ['Alpha', 'Zeta', 'Mid']);
  const matches = { [apps[0].id]: 40, [apps[1].id]: 90 };
  assert.deepEqual(filterApplications(apps, { sort: 'match', matches }).map((a) => a.company), ['Alpha', 'Zeta', 'Mid']);
});

test('job match reuses the existing engine and finds critical gaps', () => {
  const skills = [
    { id: 'javascript', name: 'JavaScript', level: 70 },
    { id: 'nodejs', name: 'Node.js', level: 30 },
  ];
  const levels = analyzeRole(roleFor('backend-developer'), skills).levels;
  const app = createApplication({ company: 'Acme', role: 'Backend Engineer', description: JD }, NOW);
  const m = matchApplication(app, levels, skills);
  assert.ok(m.match > 0 && m.match < 100);
  assert.ok(m.missing.some((r) => r.id === 'docker'));
  assert.ok(m.criticalMissing.length > 0);
  assert.equal(matchApplication(createApplication({ company: 'X', role: 'Y' }, NOW), levels, skills), null);
});

test('stored tracker data is normalised', () => {
  assert.deepEqual(normalizeTracker(null), { applications: [] });
  assert.deepEqual(normalizeTracker({ applications: 'oops' }).applications, []);
});

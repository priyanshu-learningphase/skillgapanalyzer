import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SKILL_MAP } from '../src/data/skills.js';
import { ROLE_MAP, roleFor, buildCustomRole } from '../src/data/roles.js';
import { applyCompany } from '../src/data/companies.js';
import { PROJECTS } from '../src/data/projects.js';
import { ASSESSMENT_SKILL_IDS, getAssessment } from '../src/data/assessments/index.js';
import { analyzeRole } from '../src/lib/analysis.js';
import { planRoadmap } from '../src/lib/roadmap.js';
import { detectSkills } from '../src/lib/textSkills.js';
import { parseResume, compareResumeToRole } from '../src/lib/resume.js';
import { parseJobDescription, matchJob, jobToCustomRole } from '../src/lib/jobDescription.js';
import { levelAfterAssessment, scoreAssessment, recommendationFor } from '../src/lib/assessment.js';
import { simulateCareer, prepLabel } from '../src/lib/simulator.js';
import { buildWeekPlan } from '../src/lib/weekPlan.js';
import { buildDependencyGraph, ancestorsOf } from '../src/lib/dependencyGraph.js';
import { buildInterviewPlan } from '../src/lib/interview.js';
import { recommendProjects } from '../src/lib/projects.js';
import { analyzeGithub, readmeScore } from '../src/lib/github.js';

const SKILLS = [
  { id: 'javascript', name: 'JavaScript', level: 60 },
  { id: 'html', name: 'HTML', level: 70 },
  { id: 'git', name: 'Git', level: 60 },
];
const profile = (o = {}) => ({ targetRoleId: 'backend-developer', level: 'intermediate', dailyMinutes: 120, timelineWeeks: null, skills: SKILLS, roadmapOverrides: {}, ...o });

test('companies adjust requirements for the role', () => {
  const swe = ROLE_MAP['software-engineer'];
  const google = applyCompany(swe, { id: 'google', name: 'Google' });
  assert.equal(google.requirements.find((r) => r.key === 'dsa').level, 90);
  assert.ok(google.requirements.some((r) => r.key === 'distributed-systems' && r.companyAdded === 'Google'));
  const startup = applyCompany(swe, { id: 'startup', name: 'Startup' });
  assert.equal(startup.requirements.find((r) => r.key === 'dsa').level, 70);
  const custom = applyCompany(swe, { id: 'custom', name: 'Acme' });
  assert.deepEqual(custom.requirements, swe.requirements);
  assert.equal(custom.company.name, 'Acme');
  const ms = roleFor('backend-developer', { id: 'microsoft', name: 'Microsoft' });
  assert.equal(ms.requirements.find((r) => r.key === 'cloud').label, 'Cloud (Azure)');
  // Data roles don't get engineering-only additions.
  assert.ok(!applyCompany(ROLE_MAP['data-analyst'], { id: 'google', name: 'Google' }).requirements.some((r) => r.key === 'distributed-systems'));
});

test('company targets lower readiness when the bar is higher', () => {
  const base = analyzeRole(roleFor('software-engineer'), SKILLS).readiness;
  const google = analyzeRole(roleFor('software-engineer', { id: 'google', name: 'Google' }), SKILLS).readiness;
  assert.ok(google <= base);
});

test('assessment banks are well-formed', () => {
  assert.ok(ASSESSMENT_SKILL_IDS.length >= 25);
  const ids = new Set();
  for (const skillId of ASSESSMENT_SKILL_IDS) {
    assert.ok(SKILL_MAP[skillId], `bank for unknown skill ${skillId}`);
    const questions = getAssessment(skillId);
    assert.equal(questions.length, 8, skillId);
    for (const question of questions) {
      assert.ok(!ids.has(question.id));
      ids.add(question.id);
      assert.ok(question.options.length === 4, `${question.id} needs 4 options`);
      assert.ok(question.answer >= 0 && question.answer < question.options.length, question.id);
      assert.ok(question.explanation.length > 10, question.id);
      assert.ok(['concept', 'code', 'scenario'].includes(question.type));
      assert.equal(new Set(question.options).size, 4, `${question.id} has duplicate options`);
    }
  }
});

test('correct answers are spread across option positions and stable', () => {
  const counts = [0, 0, 0, 0];
  let total = 0;
  for (const skillId of ASSESSMENT_SKILL_IDS) {
    for (const question of getAssessment(skillId)) {
      counts[question.answer] += 1;
      total += 1;
    }
  }
  for (const count of counts) assert.ok(count / total > 0.15, `answer positions too skewed: ${counts.join(', ')}`);
  assert.deepEqual(getAssessment('docker'), getAssessment('docker'), 'order is deterministic');
});

test('assessment scoring and level update match the product example', () => {
  assert.equal(levelAfterAssessment(48, 80), 67);
  assert.equal(levelAfterAssessment(0, 100), 80);
  const questions = getAssessment('docker');
  const answers = Object.fromEntries(questions.map((qn, i) => [qn.id, i < 6 ? qn.answer : (qn.answer + 1) % 4]));
  const result = scoreAssessment(questions, answers);
  assert.equal(result.correct, 6);
  assert.equal(result.pct, 75);
  assert.equal(recommendationFor(50, 'Docker').action, 'repeat');
  assert.equal(recommendationFor(90, 'Docker').action, 'advance');
});

test('roadmap phases follow Learn → Practice → Build → Assess and react to assessments', () => {
  const role = roleFor('backend-developer');
  const p = profile({ skills: [...SKILLS, { id: 'docker', name: 'Docker', level: 40 }] });
  const base = planRoadmap({ role, profile: p, analysis: analyzeRole(role, p.skills) });
  const docker = base.phases.find((ph) => ph.skills.some((s) => s.id === 'docker'));
  const order = ['learn', 'stretch', 'practice', 'build', 'assess'];
  const types = docker.tasks.filter((t) => t.skillId === 'docker').map((t) => t.type);
  assert.equal(types.at(-1), 'assess');
  assert.deepEqual([...types].sort((a, b) => order.indexOf(a) - order.indexOf(b)), types);
  assert.equal(docker.project.id, 'dockerized-rest-api', 'phase links the catalog project');
  const fresh = profile();
  const fromZero = planRoadmap({ role, profile: fresh, analysis: analyzeRole(role, fresh.skills) });
  const dockerFromZero = fromZero.phases.find((ph) => ph.skills.some((s) => s.id === 'docker'));
  assert.ok(dockerFromZero.tasks.some((t) => t.projectId === 'dockerized-rest-api'), 'larger gaps get a build task for the project');

  const failed = planRoadmap({ role, profile: p, analysis: analyzeRole(role, p.skills), signals: { assessments: { docker: { pct: 40 } } } });
  const failedDocker = failed.phases.find((ph) => ph.skills.some((s) => s.id === 'docker'));
  assert.ok(failedDocker.tasks.some((t) => t.id === 'docker:review'));
  assert.equal(failedDocker.skippedTopics.filter((t) => t.startsWith('Docker')).length, 0);

  const aced = planRoadmap({ role, profile: p, analysis: analyzeRole(role, p.skills), signals: { assessments: { docker: { pct: 90 } } } });
  const acedDocker = aced.phases.find((ph) => ph.skills.some((s) => s.id === 'docker'));
  assert.ok(acedDocker.skippedTopics.length >= 3);
  assert.ok(acedDocker.tasks.some((t) => t.type === 'stretch'));
});

test('skill detection avoids common false positives', () => {
  const ids = (text) => detectSkills(text).map((s) => s.id);
  assert.ok(!ids('Exchange semester, Spring 2023').includes('spring-boot'));
  assert.ok(ids('Built services with Spring Boot').includes('spring-boot'));
  assert.ok(!ids('Learned to react to feedback and go the extra mile').includes('react'));
  assert.ok(ids('Frontend in React and Next.js').includes('react'));
  assert.ok(ids('Backend in Go and PostgreSQL').includes('go'));
  assert.ok(!ids('Attached my CV').includes('computer-vision'));
  assert.ok(ids('Wrote C++ and Node.js tools').includes('cpp'));
});

const RESUME = `Aditya Kumar
aditya@example.com | github.com/aditya | linkedin.com/in/aditya

SUMMARY
Final-year CS student focused on backend development.

EDUCATION
B.Tech in Computer Science, ABC Institute of Technology, 2021 - 2025
CGPA: 8.4/10

EXPERIENCE
Software Engineering Intern, Acme Corp
Jun 2024 - Aug 2024
• Built REST APIs in Node.js and Express serving 20k daily requests
• Worked on SQL query optimisation, reducing p95 latency by 35%
• Responsible for writing unit tests with Jest

PROJECTS
Task Tracker – React, Node.js, MongoDB
• Built a task tracker with authentication and real-time updates
Portfolio Website
• Designed a responsive portfolio with HTML and CSS

SKILLS
Languages: JavaScript, Python, SQL, C++
Tools: Git, Docker, Linux

CERTIFICATIONS
AWS Certified Cloud Practitioner`;

test('resume parsing extracts sections, skills with evidence and quality signals', () => {
  const parsed = parseResume(RESUME);
  assert.ok(['education', 'experience', 'projects', 'skills', 'certifications', 'summary'].every((s) => parsed.sectionsFound.includes(s)));
  const skill = (id) => parsed.skills.find((s) => s.id === id);
  assert.equal(skill('nodejs').evidence, 'experience');
  assert.equal(skill('react').evidence, 'project');
  assert.equal(skill('docker').evidence, 'listed');
  assert.ok(parsed.projects.length >= 2);
  assert.equal(parsed.projects[0].title, 'Task Tracker');
  assert.equal(parsed.experience.length, 1);
  assert.equal(parsed.experience[0].bullets, 3);
  assert.ok(parsed.education.some((e) => /B\.Tech/.test(e)));
  assert.ok(parsed.certifications.some((c) => /AWS Certified/.test(c)));
  assert.equal(parsed.links.github, true);
  assert.equal(parsed.bullets.weak.length, 2);
  assert.equal(parsed.bullets.quantified, 2);

  const report = compareResumeToRole(parsed, roleFor('backend-developer'));
  assert.ok(report.match > 30 && report.match < 100);
  assert.ok(report.missing.some((m) => m.skillName === 'System Design'));
  assert.ok(report.listedOnly.some((m) => m.skillName === 'Docker'));
  assert.ok(report.weakSections.some((w) => w.section === 'Wording'));
  assert.ok(report.projectIdeas.length > 0);
});

const JD = `Backend Engineer
About the role
You will build and scale APIs for our payments platform.

Requirements
- 3+ years of experience building backend services
- Strong JavaScript and Node.js
- Experience designing REST APIs and working with PostgreSQL
- Bachelor's degree in Computer Science or related field
- Excellent communication and collaboration skills

Nice to have
- Docker and Kubernetes
- Experience with AWS`;

test('job description parsing separates required and preferred skills', () => {
  const job = parseJobDescription(JD);
  assert.equal(job.title, 'Backend Engineer');
  const req = job.required.map((s) => s.id);
  const pref = job.preferred.map((s) => s.id);
  for (const id of ['javascript', 'nodejs', 'rest-apis', 'sql']) assert.ok(req.includes(id), `required ${id}`);
  for (const id of ['docker', 'kubernetes', 'cloud']) assert.ok(pref.includes(id), `preferred ${id}`);
  assert.equal(job.experience.min, 3);
  assert.match(job.education, /Bachelor/);
  assert.ok(job.softSkills.includes('Communication'));
  assert.ok(job.softSkills.includes('Teamwork'));

  const result = matchJob(job, Object.fromEntries(SKILLS.map((s) => [s.id, s.level])));
  assert.ok(result.match > 0 && result.match < 100);
  assert.ok(result.have.some((r) => r.id === 'javascript'));
  assert.ok(result.missing.some((r) => r.id === 'docker'));

  const role = buildCustomRole(jobToCustomRole(job));
  const analysis = analyzeRole(role, SKILLS);
  assert.ok(analysis.gaps.length > 0);
});

test('career simulator estimates match and preparation time', () => {
  const result = simulateCareer({ roleId: 'backend-developer', company: { id: 'microsoft', name: 'Microsoft' }, profile: profile() });
  assert.ok(result.match >= 0 && result.match < 100);
  assert.ok(result.missing.length > 0);
  assert.match(result.prep, /weeks|months/);
  assert.equal(prepLabel(20), '4–6 months');
});

test('weekly plan fits the weekly budget and includes DSA practice when needed', () => {
  const role = roleFor('software-engineer');
  const p = profile({ targetRoleId: 'software-engineer' });
  const analysis = analyzeRole(role, p.skills);
  const roadmap = planRoadmap({ role, profile: p, analysis });
  const plan = buildWeekPlan({ roadmap, completedTasks: {}, analysis });
  assert.ok(plan.length >= 3 && plan.length <= 6);
  assert.ok(plan.some((i) => i.kind === 'habit'));
});

test('dependency graph lays prerequisites in earlier layers', () => {
  const role = roleFor('backend-developer');
  const graph = buildDependencyGraph(role, analyzeRole(role, SKILLS));
  const node = (id) => graph.nodes.find((n) => n.id === id);
  assert.ok(graph.edges.some((e) => e.from === 'javascript' && e.to === 'nodejs'));
  for (const edge of graph.edges) assert.ok(node(edge.from).depth < node(edge.to).depth, `${edge.from} -> ${edge.to}`);
  assert.ok(ancestorsOf(graph, 'express').has('javascript'));
});

test('interview plan reflects company, weak assessments and projects', () => {
  const role = roleFor('backend-developer', { id: 'amazon', name: 'Amazon' });
  const analysis = analyzeRole(role, SKILLS);
  const plan = buildInterviewPlan({ role, analysis, company: role.company, latestAssessments: { sql: { skillId: 'sql', pct: 40 } }, projectTitles: ['Task Tracker'] });
  assert.ok(plan.behavioral.some((b) => /Leadership|Ownership|Customer/.test(b.question)));
  assert.ok(plan.weakAreas.some((w) => w.skillId === 'sql'));
  assert.ok(plan.projects.some((pq) => pq.question.includes('Task Tracker')));
  assert.ok(plan.technical.length > 0 && plan.coding.length > 0 && plan.systemDesign.length > 0);
  // Only focus-area skills are flagged, and they come first.
  const focus = new Set(plan.weakAreas.map((w) => w.skillId));
  assert.ok(plan.technical.every((q) => q.weak === focus.has(q.skillId)));
  assert.equal(plan.technical[0].weak, true);
});

test('project recommendations cover critical gaps and respect completion', () => {
  const role = roleFor('backend-developer');
  const analysis = analyzeRole(role, SKILLS);
  const recs = recommendProjects({ analysis, roleId: role.id });
  assert.ok(recs.length > 0);
  const coveredNames = new Set(recs.flatMap((r) => r.covers));
  for (const gap of analysis.gaps.filter((g) => g.priority === 'critical')) assert.ok(coveredNames.has(gap.skillName), `no project for ${gap.skillName}`);
  const without = recommendProjects({ analysis, roleId: role.id, statuses: { [recs[0].project.id]: 'completed' } });
  assert.ok(!without.some((r) => r.project.id === recs[0].project.id));
  for (const project of PROJECTS) for (const id of project.skills) assert.ok(SKILL_MAP[id], `${project.id} -> ${id}`);
});

test('GitHub analysis scores a portfolio and finds role gaps', () => {
  const now = Date.parse('2026-10-01T00:00:00Z');
  const repo = (name, language, extra = {}) => ({ name, language, fork: false, stargazers_count: 2, pushed_at: '2026-09-20T00:00:00Z', html_url: `https://github.com/u/${name}`, description: `${name} project`, topics: [], ...extra });
  const data = {
    user: { login: 'u', name: 'U', avatar_url: '', html_url: 'https://github.com/u', public_repos: 4, followers: 1, created_at: '2020-01-01' },
    repos: [repo('web-app', 'JavaScript', { topics: ['react'] }), repo('site', 'HTML'), repo('scripts', 'Python'), repo('fork', 'Go', { fork: true })],
    events: [{ type: 'PushEvent', created_at: '2026-09-25T00:00:00Z', payload: { size: 5 } }],
    readmes: { 'web-app': '# Web app\n## Setup\nnpm install\n```bash\nnpm run dev\n```\n## Tests\nRun jest' },
  };
  const result = analyzeGithub(data, roleFor('backend-developer'), now);
  assert.ok(result.score > 0 && result.score <= 100);
  assert.equal(result.forks, 1);
  assert.ok(result.detectedSkills.some((s) => s.id === 'javascript'));
  assert.ok(result.needsWork.some((n) => n.label === 'Backend projects'));
  assert.ok(readmeScore(data.readmes['web-app']) > readmeScore('# hi'));
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROLE_MAP } from '../src/data/roles.js';
import { analyzeRole } from '../src/lib/analysis.js';
import { buildInterviewPlan } from '../src/lib/interview.js';
import { analyzeAnswer, formatDuration, pickMockQuestions, pointCoverage, recentMockQuestionIds, summarizeMock } from '../src/lib/mockInterview.js';
import { buildFeedbackRequest, feedbackPayload, validateFeedback, validateFeedbackRequest } from '../src/lib/interviewFeedbackSchema.js';

const planFor = (projectTitles = []) => {
  const role = ROLE_MAP['frontend-developer'];
  const analysis = analyzeRole(role, [{ id: 'html', name: 'HTML', level: 70 }, { id: 'css', name: 'CSS', level: 60 }]);
  return buildInterviewPlan({ role, analysis, projectTitles });
};

const EVENT_LOOP_POINTS = ['Call stack and task queues', 'Promises run before timers', 'Why long sync work blocks rendering'];
const GOOD_TECHNICAL =
  'JavaScript runs on a single call stack. When the stack is empty, the event loop takes work from the queues. Promise callbacks go to the microtask queue, which is drained before the next macrotask such as a setTimeout timer, so promises run before timers. For example, in my project a long synchronous loop froze the page because the browser cannot render until the stack clears, so I moved it to a web worker.';

test('mock questions mix technical, behavioral and project questions', () => {
  const plan = planFor(['Weather dashboard']);
  const picked = pickMockQuestions(plan, { count: 5 });
  assert.equal(picked.length, 5);
  assert.deepEqual(picked.map((q) => q.kind), ['technical', 'behavioral', 'project', 'technical', 'behavioral']);
  assert.equal(new Set(picked.map((q) => q.id)).size, 5);
  for (const q of picked) assert.ok(q.question && Array.isArray(q.points));
});

test('without projects, the project turn goes to another pool', () => {
  const picked = pickMockQuestions(planFor(), { count: 3 });
  assert.equal(picked.length, 3);
  assert.ok(!picked.some((q) => q.kind === 'project'));
});

test('recently answered questions are asked last', () => {
  const plan = planFor();
  const first = pickMockQuestions(plan, { count: 3 });
  const second = pickMockQuestions(plan, { count: 3, recent: first.map((q) => q.id) });
  assert.ok(second.every((q) => !first.some((f) => f.id === q.id)));
  assert.deepEqual(pickMockQuestions(null), []);
});

test('point coverage matches word forms, not exact strings', () => {
  const terms = ['queue', 'stack', 'call', 'render'];
  assert.equal(pointCoverage('Call stack and task queues', terms).covered, true);
  assert.equal(pointCoverage('Why long sync work blocks rendering', ['render']).covered, false);
  assert.equal(pointCoverage('', terms).covered, false);
});

test('a strong technical answer passes every check', () => {
  const result = analyzeAnswer({ kind: 'technical', answer: GOOD_TECHNICAL, points: EVENT_LOOP_POINTS });
  assert.equal(result.status, 'ok');
  assert.equal(result.coverage.covered, 3);
  assert.ok(result.checks.every((c) => c.ok), JSON.stringify(result.checks));
  assert.deepEqual(result.tips, []);
});

test('a thin behavioral answer gets specific, ordered tips', () => {
  const result = analyzeAnswer({
    kind: 'behavioral',
    question: 'Describe a time you disagreed with a teammate.',
    points: ['Listen first', 'Data over opinions', 'How it was resolved'],
    answer: 'During our final year project we disagreed about the database. We wanted MongoDB but one teammate wanted Postgres. We talked about it and we picked Postgres.',
  });
  const failed = result.checks.filter((c) => !c.ok).map((c) => c.id);
  assert.deepEqual(failed, ['length', 'coverage', 'star', 'ownership', 'numbers']);
  assert.equal(result.structure.situation, true);
  assert.equal(result.structure.result, false);
  assert.equal(result.tips.length, 3);
  assert.match(result.tips[0], /STAR/);
});

test('a STAR answer with a number and first-person actions passes structure checks', () => {
  const answer =
    'In my second year our team project was late because builds took twenty minutes. My role was to fix the pipeline. I analysed the build logs, I split the test suite and I added caching for dependencies. As a result the build dropped to 6 minutes and we shipped the demo on time. I learned to measure before changing things.';
  const result = analyzeAnswer({ kind: 'project', question: 'What was the hardest problem you hit building CI Dashboard, and how did you solve it?', answer, points: [] });
  const byId = Object.fromEntries(result.checks.map((c) => [c.id, c.ok]));
  assert.equal(byId.star, true);
  assert.equal(byId.ownership, true);
  assert.equal(byId.numbers, true);
  assert.equal(result.coverage, null);
});

test('STAR checks only apply to questions that ask for a story', () => {
  const answer = 'I am a final year computer science student. We built a few web apps in college and I like frontend work, so this role fits what I want to do next.';
  const intro = analyzeAnswer({ kind: 'behavioral', question: 'Tell me about yourself.', answer, points: [] });
  const ids = intro.checks.map((c) => c.id);
  assert.ok(!ids.includes('star') && !ids.includes('numbers') && !ids.includes('example'), ids.join());
  assert.ok(!intro.tips.some((t) => /result/.test(t)));
  assert.match(intro.tips[0], /tie them to this role/);

  const architecture = analyzeAnswer({ kind: 'project', question: 'Walk me through the architecture of Notes App. Why did you choose that stack?', answer: `${answer} I used React with Firebase instead of my own server because it was faster to ship.`, points: [] });
  const byId = Object.fromEntries(architecture.checks.map((c) => [c.id, c.ok]));
  assert.equal(byId.tradeoffs, true);
  assert.equal(byId.star, undefined);
});

test('design answers are checked for trade-offs, and hedging is flagged', () => {
  const answer = 'I think I would maybe use a database and probably a cache in front. I guess it would scale fine with a load balancer and some servers behind it, basically.';
  const result = analyzeAnswer({ kind: 'design', answer, points: [] });
  const byId = Object.fromEntries(result.checks.map((c) => [c.id, c.ok]));
  assert.equal(byId.tradeoffs, false);
  assert.equal(byId.confidence, false);
});

test('empty and very short answers', () => {
  assert.equal(analyzeAnswer({ answer: '   ' }).status, 'empty');
  const brief = analyzeAnswer({ kind: 'technical', answer: 'A closure keeps variables alive.', points: [] });
  assert.equal(brief.status, 'brief');
  assert.match(brief.tips[0], /Expand it/);
});

test('session summary and recent ids', () => {
  const session = {
    questions: [
      { id: 'a', kind: 'technical', answer: GOOD_TECHNICAL, points: EVENT_LOOP_POINTS, seconds: 150 },
      { id: 'b', kind: 'behavioral', answer: '', points: ['x'], seconds: 4 },
    ],
  };
  assert.deepEqual(summarizeMock(session), { asked: 2, answered: 1, pointsCovered: 3, pointsTotal: 3, seconds: 154 });
  assert.deepEqual(recentMockQuestionIds([session]), ['a']);
  assert.equal(formatDuration(154), '2:34');
  assert.equal(formatDuration(-3), '0:00');
});

test('feedback requests are validated and trimmed to what the model needs', () => {
  const body = buildFeedbackRequest({ role: 'Frontend Developer', question: { kind: 'technical', question: 'Explain the event loop.', points: EVENT_LOOP_POINTS, answer: GOOD_TECHNICAL } });
  assert.equal(validateFeedbackRequest(body), null);
  assert.deepEqual(Object.keys(feedbackPayload({ ...body, extra: 'ignore me' })), ['role', 'questionType', 'question', 'strongAnswerCovers', 'answer']);
  assert.match(validateFeedbackRequest({ ...body, answer: 'too short' }), /at least 15 words/);
  assert.match(validateFeedbackRequest({ ...body, kind: 'riddle' }), /kind/);
  assert.match(validateFeedbackRequest({ ...body, points: ['x'.repeat(200)] }), /points/);
  assert.match(validateFeedbackRequest({ ...body, answer: 'word '.repeat(1000) }), /answer/);
  assert.match(validateFeedbackRequest(null), /JSON object/);
});

test('model replies are cleaned and malformed ones rejected', () => {
  const ok = validateFeedback({
    verdict: 'solid',
    summary: '**Good** structure overall.',
    strengths: ['Clear `call stack` explanation', '', 'a', 'b', 'c'],
    improvements: ['Mention requestAnimationFrame'],
    strongerOpening: '',
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.feedback.summary, 'Good structure overall.');
  assert.deepEqual(ok.feedback.strengths, ['Clear call stack explanation', 'a', 'b']);
  assert.equal(ok.feedback.strongerOpening, null);
  assert.equal(validateFeedback({ verdict: 'hire', summary: 'x', strengths: ['y'], improvements: [] }).ok, false);
  assert.equal(validateFeedback({ verdict: 'strong', summary: '', strengths: ['y'], improvements: [] }).ok, false);
  assert.equal(validateFeedback({ verdict: 'strong', summary: 'x', strengths: [], improvements: [] }).ok, false);
});

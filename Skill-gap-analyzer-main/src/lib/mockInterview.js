/**
 * Mock interviews: picks a mix of questions from the interview plan and runs
 * automatic, rule-based checks on typed answers. The checks look for key
 * terms, structure cues and length, so they are prompts to reflect on rather
 * than a grade: a point explained in other words can show as not mentioned.
 */

export const MOCK_KINDS = {
  technical: { label: 'Technical', words: [60, 250] },
  behavioral: { label: 'Behavioral', words: [120, 300] },
  project: { label: 'Your project', words: [100, 300] },
  design: { label: 'System design', words: [150, 400] },
};

export const MOCK_LENGTHS = [3, 5, 8];
export const MOCK_MINUTES = [2, 3, 5];
export const MAX_ANSWER_CHARS = 4000;
export const MAX_MOCK_SESSIONS = 10;
const BRIEF_WORDS = 15;
const SPOKEN_WPM = 130;

const ORDER = ['technical', 'behavioral', 'project', 'technical', 'behavioral', 'design', 'technical', 'project'];

const shape = (item, kind) => ({
  id: item.id,
  kind,
  question: item.question,
  points: item.points || [],
  skill: item.skill || null,
  company: item.company || null,
  project: item.project || null,
});

/**
 * Pick `count` questions: technical (the plan lists focus areas first),
 * behavioral, your own projects and system design, in rotation. Questions in
 * `recent` are used last, so repeated sessions don't ask the same things.
 */
export const pickMockQuestions = (plan, { count = 5, recent = [] } = {}) => {
  if (!plan) return [];
  const recentIds = new Set(recent);
  const pool = (items = [], kind) => {
    const all = items.map((item) => shape(item, kind));
    return [...all.filter((q) => !recentIds.has(q.id)), ...all.filter((q) => recentIds.has(q.id))];
  };
  const pools = {
    technical: pool(plan.technical, 'technical'),
    behavioral: pool(plan.behavioral, 'behavioral'),
    project: pool(plan.projects, 'project'),
    design: pool(plan.systemDesign, 'design'),
  };
  const picked = [];
  const taken = new Set();
  const take = (kind) => {
    const next = pools[kind].find((q) => !taken.has(q.id));
    if (!next) return false;
    taken.add(next.id);
    picked.push(next);
    return true;
  };
  for (let i = 0; picked.length < count && i < count * 4; i += 1) {
    // An empty pool (no projects yet, say) hands its turn to the next one that has questions.
    if (!take(ORDER[i % ORDER.length])) Object.keys(pools).some(take);
  }
  return picked;
};

const STOP = new Set(
  'a an and are as at be been but by can do does for from has have how i if in into is it its me my of on or our so than that the their them then there these they this to too us use was we were what when where which while who why will with would you your'.split(' '),
);
const ALIASES = { db: 'database', dbs: 'database', js: 'javascript', ts: 'typescript', k8s: 'kubernetes' };

const tokenize = (text) => String(text || '').toLowerCase().match(/[a-z0-9][a-z0-9+#]*(?:['.][a-z0-9+#]+)*/g) || [];

/** A light stemmer: enough to match "queues"/"queue" or "rendering"/"render". */
const stem = (word) => {
  let w = word.replace(/'s$/, '');
  if (w.length > 5 && w.endsWith('ies')) w = `${w.slice(0, -3)}y`;
  else if (w.length > 5 && w.endsWith('ing')) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith('ed')) w = w.slice(0, -2);
  else if (w.length > 4 && /(ss|x|ch|sh)es$/.test(w)) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
  return ALIASES[w] || w;
};

const keyTerms = (text) => [...new Set(tokenize(text).map(stem).filter((w) => w.length > 1 && !STOP.has(w)))];

const sameTerm = (a, b) => a === b || (Math.min(a.length, b.length) >= 4 && (a.startsWith(b) || b.startsWith(a)));

/** A point counts as mentioned when at least half of its key terms appear in the answer. */
export const pointCoverage = (point, answerTerms) => {
  const terms = keyTerms(point);
  const matched = terms.filter((t) => answerTerms.some((a) => sameTerm(t, a)));
  return { point, covered: terms.length > 0 && matched.length >= Math.max(1, Math.ceil(terms.length / 2)), matched };
};

const STAR = {
  situation:
    /\b(when i was|at my|during (my|our|a|the)|in my (first|second|third|final|last)|while (i|we) (was|were)|last (year|semester|summer|month)|in (college|school|class)|internship|hackathon|our (team|project|club|college)|the (team|project|client) (was|had|needed))\b/i,
  task: /\b(my (role|job|task|goal|responsibility|part)|i was (responsible|asked|tasked|assigned|in charge)|(i|we) needed to|the goal was|(i|we) had to|the (problem|challenge) was)\b/i,
  action:
    /\bi (then |also |first |quickly |finally )?(built|wrote|designed|created|led|organi[sz]ed|implemented|decided|suggested|proposed|set up|talked|met|reached out|learned|learnt|fixed|refactored|tested|automated|added|changed|started|took|spoke|asked|researched|analy[sz]ed|debugged|migrated|rewrote|introduced|scheduled|split|documented|reviewed|presented|explained|listened|focused|prioriti[sz]ed|volunteered|mentored|coordinated)\b/i,
  result:
    /\b(as a result|resulted in|the result|which (led|meant|reduced|increased|improved|saved|cut|helped)|in the end|ended up|the outcome|we (won|shipped|launched|delivered|finished|reduced|increased|improved|cut|saved)|(increased|reduced|improved|cut|saved|grew|doubled|halved) (the|our|it|by|from)|i learned|i learnt|taught me|lesson)\b/i,
};
const EXAMPLE = /\b(for example|for instance|e\.g|such as|in my (project|internship|code|app)|i('ve| have)? used|i implemented|when i (built|worked|used))\b/i;
const TRADE_OFF = /\b(trade-?offs?|downsides?|drawbacks?|on the other hand|whereas|instead of|it depends|depends on|the cost of|at the cost)\b/i;
const NUMBER = /\d|%|\bpercent\b|\b(twice|doubled?|halved?|tripled?)\b/i;
// Questions that ask for a story, where STAR applies ("Tell me about yourself" doesn't).
const STORY_QUESTION = /\b(a time|describe a|tell me about a (time|project|mistake|situation|decision)|an example of|hardest problem|how did you (solve|handle|fix))\b/i;
const HEDGES = /\b(i think|i guess|maybe|probably|kind of|sort of|i'?m not sure|i believe|basically|actually|literally)\b/gi;

const countMatches = (text, re) => (text.match(re) || []).length;

/** Automatic checks for one answer. Returns null fields where a check doesn't apply. */
export const analyzeAnswer = ({ kind = 'technical', question = '', answer = '', points = [] }) => {
  const text = String(answer || '').trim();
  const words = tokenize(text).length;
  const [min, max] = (MOCK_KINDS[kind] || MOCK_KINDS.technical).words;
  if (!words) return { status: 'empty', words: 0, checks: [], tips: [], coverage: null, structure: null };

  const answerTerms = [...new Set(tokenize(text).map(stem))];
  const coverageItems = points.map((p) => pointCoverage(p, answerTerms));
  const coverage = coverageItems.length ? { items: coverageItems, covered: coverageItems.filter((c) => c.covered).length, total: coverageItems.length } : null;
  const storyLike = (kind === 'behavioral' || kind === 'project') && STORY_QUESTION.test(question);
  // Architecture and "why this stack" questions about your project are judged like design answers.
  const wantsTradeOffs = kind === 'design' || (kind === 'project' && !storyLike);
  const structure = storyLike ? Object.fromEntries(Object.entries(STAR).map(([part, re]) => [part, re.test(text)])) : null;
  const firstPerson = countMatches(text, /\b(i|me|my|i'm|i've|i'd)\b/gi);
  const team = countMatches(text, /\b(we|us|our|we're|we've)\b/gi);
  const hedges = countMatches(text, HEDGES);
  const length = words < BRIEF_WORDS ? 'brief' : words < min ? 'short' : words > max ? 'long' : 'good';
  const spoken = Math.max(0.5, Math.round((words / SPOKEN_WPM) * 2) / 2);

  const checks = [
    { id: 'length', label: 'Length', ok: length === 'good', detail: `${words} words, about ${spoken} min spoken. Aim for ${min}–${max}.` },
  ];
  if (coverage) {
    checks.push({ id: 'coverage', label: 'Key points', ok: coverage.covered >= Math.ceil((coverage.total * 2) / 3), detail: `${coverage.covered} of ${coverage.total} mentioned` });
  }
  if (structure) {
    const parts = ['situation', 'task', 'action', 'result'];
    const present = parts.filter((p) => structure[p]);
    checks.push({ id: 'star', label: 'STAR structure', ok: present.length >= 3 && structure.result, detail: present.length ? `Found: ${present.join(', ')}` : 'No situation, task, action or result cues found' });
    checks.push({ id: 'ownership', label: 'Your part is clear', ok: firstPerson >= 3 || firstPerson >= team, detail: `“I” ${firstPerson}×, “we” ${team}×` });
    checks.push({ id: 'numbers', label: 'Measurable result', ok: NUMBER.test(text), detail: NUMBER.test(text) ? 'Includes a number' : 'No numbers yet' });
  } else if (kind === 'technical') {
    checks.push({ id: 'example', label: 'Concrete example', ok: EXAMPLE.test(text), detail: EXAMPLE.test(text) ? 'Grounded in an example' : 'No example yet' });
  }
  if (wantsTradeOffs) checks.push({ id: 'tradeoffs', label: 'Trade-offs', ok: TRADE_OFF.test(text), detail: TRADE_OFF.test(text) ? 'Names a trade-off' : 'No trade-off named' });
  const tooHedged = hedges >= 3 || (hedges >= 2 && words < 80);
  checks.push({ id: 'confidence', label: 'Direct wording', ok: !tooHedged, detail: hedges ? `${hedges} hedge${hedges === 1 ? '' : 's'} like “I think” or “maybe”` : 'No hedging' });

  const tips = [];
  if (length === 'brief' || length === 'short') {
    const how = storyLike
      ? 'with STAR: the situation, your task, what you did, and the result'
      : kind === 'technical'
        ? 'say what it is, how it works, and when you’d use it'
        : kind === 'behavioral'
          ? 'give specifics, and tie them to this role'
          : 'walk through the parts, then explain your choices';
    tips.push(`Expand it to ${min}–${max} words: ${how}.`);
  }
  const missing = coverage?.items.filter((c) => !c.covered) || [];
  if (missing.length) tips.push(`Cover “${missing[0].point}”${missing.length > 1 ? ` and ${missing.length - 1} more point${missing.length > 2 ? 's' : ''} below` : ''}.`);
  if (structure && !structure.result) tips.push('End with the result: what changed, ideally with a number (time saved, users, marks, %).');
  if (structure && firstPerson < 3 && team > firstPerson) tips.push('Say what you did: use “I” for your part, not only “we”.');
  if (structure && !structure.situation && !structure.task) tips.push('Open with one sentence of context: where you were and what had to happen.');
  if (kind === 'technical' && !EXAMPLE.test(text)) tips.push('Ground it with an example from your own code or projects.');
  if (wantsTradeOffs && !TRADE_OFF.test(text)) tips.push('Name a trade-off and why you would accept it.');
  if (length === 'long') tips.push(`Tighten it: past ~${max} words interviewers lose the thread. Lead with the answer, then support it.`);
  if (tooHedged) tips.push('Cut hedges like “I think” and “maybe”: state it, then qualify only where it matters.');

  return { status: length === 'brief' ? 'brief' : 'ok', words, spoken, length, coverage, structure, checks, tips: tips.slice(0, 3) };
};

/** Totals for a finished session. */
export const summarizeMock = (session) => {
  const questions = session?.questions || [];
  let covered = 0;
  let total = 0;
  let answered = 0;
  for (const q of questions) {
    if (!q.answer?.trim()) continue;
    answered += 1;
    const result = analyzeAnswer(q);
    if (result.coverage) {
      covered += result.coverage.covered;
      total += result.coverage.total;
    }
  }
  return {
    asked: questions.length,
    answered,
    pointsCovered: covered,
    pointsTotal: total,
    seconds: questions.reduce((sum, q) => sum + (q.seconds || 0), 0),
  };
};

/** Question ids answered in the last few sessions, newest first. */
export const recentMockQuestionIds = (sessions = [], take = 3) => sessions.slice(0, take).flatMap((s) => s.questions.filter((q) => q.answer?.trim()).map((q) => q.id));

export const formatDuration = (seconds) => {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

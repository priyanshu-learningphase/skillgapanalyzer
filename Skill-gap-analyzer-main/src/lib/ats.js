/**
 * ATS-style resume review against one job description.
 *
 * analyzeResumeForJob(draft, job) → keyword coverage (required vs preferred),
 *   relevant experience, per-section feedback and an estimated score.
 * suggestBullets(draft, job) → wording suggestions for existing bullets.
 *
 * Nothing here adds facts. Suggestions only reword what the user wrote, and
 * anything the user must supply appears as a visible "[…]" placeholder.
 * The score is an estimate of keyword and structure coverage, not a
 * prediction of passing any real screening system.
 */

import { detectTechnologies } from './textSkills.js';
import { parseResume, QUANTIFIED, WEAK_START } from './resume.js';
import { draftToText, findPlaceholders } from './resumeDraft.js';

export const ATS_DISCLAIMER =
  'This is an estimate of how well your resume covers the job’s keywords and standard structure. Real applicant tracking systems differ, so it can’t guarantee you’ll pass screening.';

const SOFT_PATTERNS = {
  Communication: /\b(communicat|present(ed|ation)|wrote|documentation|explained)/i,
  Teamwork: /\b(team|collaborat|cross-functional|pair(ed)? programm)/i,
  'Problem solving': /\b(solv|debug|troubleshoot|optimi[sz]|root cause)/i,
  Ownership: /\b(owned|ownership|led|initiated|drove|end-to-end)/i,
  Leadership: /\b(led|lead|mentor|captain|head of|president|coordinator)/i,
  Adaptability: /\b(adapt|learned|quickly|fast-paced|new technolog)/i,
  'Attention to detail': /\b(test(ed|ing)|review(ed)?|accura|quality|qa\b)/i,
  'Stakeholder management': /\b(stakeholder|client|customer|requirement)/i,
  'Time management': /\b(deadline|on time|priorit|schedul)/i,
  Curiosity: /\b(explor|research|self-taught|hackathon|open[- ]source)/i,
};

const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11 };

/** Rough months of experience from "Jun 2024 – Aug 2024" style ranges. */
const monthsFromRange = (range, now = new Date()) => {
  const parts = range.toLowerCase().split(/\s*(?:-|–|—|to)\s*/);
  const parse = (s) => {
    if (/present|current|now|ongoing/.test(s)) return now.getFullYear() * 12 + now.getMonth();
    const m = s.match(/([a-z]{3,4})[a-z]*\.?\s*'?(\d{2,4})/);
    if (m && MONTHS[m[1]] != null) return (m[2].length === 2 ? 2000 + Number(m[2]) : Number(m[2])) * 12 + MONTHS[m[1]];
    const y = s.match(/(19|20)\d{2}/);
    return y ? Number(y[0]) * 12 : null;
  };
  const start = parse(parts[0] || '');
  const end = parse(parts[1] || '');
  return start != null && end != null && end >= start ? end - start + 1 : 0;
};

const STRONG_VERB = /^(built|designed|developed|implemented|created|led|launched|reduced|improved|increased|automated|optimi[sz]ed|architected|migrated|shipped|delivered|engineered|analy[sz]ed|deployed|integrated|refactored|wrote|owned|mentored|cut|scaled|tested|maintained|managed|contributed|completed|trained|researched|presented|organi[sz]ed|coordinated)\b/i;

const sectionStatus = (issues, missing) => (missing ? 'missing' : issues.length ? 'improve' : 'good');

/**
 * Compare a resume draft with a parsed job description
 * (parseJobDescription output).
 */
export const analyzeResumeForJob = (draft, job, { now = new Date() } = {}) => {
  const text = draftToText(draft);
  const parsed = parseResume(text);
  const resumeSkills = new Map(parsed.skills.map((s) => [s.id, s]));

  const keywordRow = (s, kind) => {
    const found = resumeSkills.get(s.id);
    return { id: s.id, name: s.name, kind, found: Boolean(found), evidence: found?.evidence || null };
  };
  const required = (job?.required || []).map((s) => keywordRow(s, 'required'));
  const preferred = (job?.preferred || []).map((s) => keywordRow(s, 'preferred'));
  const weightTotal = required.length * 2 + preferred.length;
  const weightFound = required.filter((r) => r.found).length * 2 + preferred.filter((r) => r.found).length;
  const keywordCoverage = weightTotal ? Math.round((weightFound / weightTotal) * 100) : null;

  const softSkills = (job?.softSkills || []).map((name) => ({ name, found: Boolean(SOFT_PATTERNS[name]?.test(text)) }));

  // Bullets that show the job's skills in practice.
  const jobIds = new Set([...required, ...preferred].map((r) => r.id));
  const relevant = [];
  for (const [key, label] of [['experience', 'Experience'], ['projects', 'Projects']]) {
    for (const entry of draft[key]) {
      for (const bullet of entry.bullets) {
        const skills = detectTechnologies(bullet.text).filter((s) => jobIds.has(s.id));
        if (skills.length) relevant.push({ section: label, entry: entry.heading, text: bullet.text, skills: skills.map((s) => s.name) });
      }
    }
  }

  const months = draft.experience.reduce((sum, e) => sum + (e.dates ? monthsFromRange(e.dates, now) : 0), 0);
  const experience = {
    months,
    requiredYears: job?.experience?.min ?? null,
    meets: job?.experience?.min ? months >= job.experience.min * 12 : null,
  };

  // ── Section feedback ────────────────────────────────────────────────────
  const bullets = [...draft.experience, ...draft.projects].flatMap((e) => e.bullets.map((b) => b.text)).filter(Boolean);
  const quantified = bullets.filter((b) => QUANTIFIED.test(b)).length;
  const weak = bullets.filter((b) => WEAK_START.test(b)).length;
  const missingRequired = required.filter((r) => !r.found);
  const listedOnly = required.filter((r) => r.found && r.evidence === 'listed');
  const sections = [];

  const summaryIssues = [];
  if (draft.summary.trim()) {
    const words = draft.summary.trim().split(/\s+/).length;
    if (words > 80) summaryIssues.push('Keep the summary to 2–3 lines (under ~60 words).');
    const summarySkills = new Set(detectTechnologies(draft.summary).map((s) => s.id));
    const topRequired = required.filter((r) => r.found).slice(0, 3);
    if (topRequired.length && !topRequired.some((r) => summarySkills.has(r.id))) summaryIssues.push(`Mention one or two of the job’s core skills you actually have, such as ${topRequired.map((r) => r.name).join(', ')}.`);
  }
  sections.push({ key: 'summary', title: 'Summary', status: sectionStatus(summaryIssues, !draft.summary.trim()), issues: draft.summary.trim() ? summaryIssues : ['Add a 2–3 line summary: who you are, your strongest relevant skills, and the role you want.'] });

  const skillIssues = [];
  if (missingRequired.length) skillIssues.push(`Required keywords not found anywhere: ${missingRequired.map((r) => r.name).join(', ')}. Add them only if you genuinely have the skill.`);
  if (draft.skills.length === 1 && draft.skills[0].items.split(',').length > 12) skillIssues.push('Group skills (Languages, Frameworks, Tools) so they’re easy to scan.');
  sections.push({ key: 'skills', title: 'Technical skills', status: sectionStatus(skillIssues, !draft.skills.some((g) => g.items.trim())), issues: draft.skills.some((g) => g.items.trim()) ? skillIssues : ['Add a technical skills section; ATS keyword matching relies on it.'] });

  const expIssues = [];
  if (draft.experience.length) {
    if (weak) expIssues.push(`${weak} bullet${weak === 1 ? '' : 's'} start with weak phrases (“worked on”, “responsible for”). See the suggested wording below.`);
    if (bullets.length && quantified / bullets.length < 0.4) expIssues.push(`Only ${quantified} of ${bullets.length} bullets include a number. Add real results where you have them: users, % improvement, time saved.`);
    if (listedOnly.length) expIssues.push(`${listedOnly.map((r) => r.name).join(', ')} ${listedOnly.length === 1 ? 'is' : 'are'} only listed in skills. If you used ${listedOnly.length === 1 ? 'it' : 'them'} in a role or project, say so in a bullet.`);
    if (experience.requiredYears && experience.meets === false) expIssues.push(`The job asks for ${experience.requiredYears}+ years; your listed roles add up to about ${Math.max(1, Math.round(months / 12 * 10) / 10)} years (estimated from dates). Highlight internships and substantial projects.`);
  }
  sections.push({ key: 'experience', title: 'Experience', status: sectionStatus(expIssues, !draft.experience.length), issues: draft.experience.length ? expIssues : ['No experience section found. Add internships, freelance, open-source or teaching-assistant work if you have any.'] });

  const projectIssues = [];
  if (draft.projects.length) {
    const projectSkills = new Set(draft.projects.flatMap((p) => detectTechnologies(`${p.heading} ${p.subheading} ${p.bullets.map((b) => b.text).join(' ')}`).map((s) => s.id)));
    const covered = required.filter((r) => projectSkills.has(r.id)).length;
    if (required.length && covered === 0) projectIssues.push('None of your projects show the job’s required skills. Lead with the most relevant project, or build one that does.');
    if (draft.projects.some((p) => !p.subheading && !/\||—|-/.test(p.heading))) projectIssues.push('List the tech stack for each project (e.g. “React, Node.js, PostgreSQL”).');
  }
  sections.push({ key: 'projects', title: 'Projects', status: sectionStatus(projectIssues, !draft.projects.length), issues: draft.projects.length ? projectIssues : ['Add 2–3 projects that use the job’s required skills, each with its stack and a result.'] });

  const eduIssues = [];
  if (job?.education && !draft.education.length) eduIssues.push(`The job mentions: “${job.education}”. Add your education.`);
  if (draft.education.length && !draft.education.some((e) => /(19|20)\d{2}/.test(`${e.heading} ${e.subheading} ${e.dates}`))) eduIssues.push('Add your graduation year (or expected year).');
  sections.push({ key: 'education', title: 'Education', status: sectionStatus(eduIssues, !draft.education.length), issues: draft.education.length ? eduIssues : eduIssues.length ? eduIssues : ['Add your degree, institution and graduation year.'] });

  const achievementIssues = [];
  if (!draft.achievements.length && !draft.certifications.length) achievementIssues.push('If you have hackathon results, competitive programming ranks, scholarships or certifications, add them.');
  sections.push({ key: 'achievements', title: 'Achievements & certifications', status: achievementIssues.length ? 'improve' : 'good', issues: achievementIssues });

  const formatIssues = [];
  if (!draft.header.email) formatIssues.push('Add an email address in the header.');
  if (!draft.header.phone) formatIssues.push('Add a phone number in the header.');
  if (!/linkedin|github/i.test(draft.header.links)) formatIssues.push('Add LinkedIn and/or GitHub links so reviewers can verify your work.');
  if (parsed.wordCount < 250) formatIssues.push(`About ${parsed.wordCount} words: likely too thin. Expand projects and experience with specific bullets.`);
  if (parsed.wordCount > 900) formatIssues.push(`About ${parsed.wordCount} words: likely over one page. Trim older or less relevant items.`);
  const placeholders = findPlaceholders(draft);
  if (placeholders.length) formatIssues.push(`${placeholders.length} “[…]” placeholder${placeholders.length === 1 ? '' : 's'} still need real details.`);
  sections.push({ key: 'format', title: 'Contact & format', status: formatIssues.length ? 'improve' : 'good', issues: formatIssues });

  // ── Estimated score ─────────────────────────────────────────────────────
  const structure = ['summary', 'skills', 'education'].filter((k) => sections.find((s) => s.key === k).status !== 'missing').length + (draft.experience.length || draft.projects.length ? 1 : 0);
  const parts = {
    keywords: keywordCoverage == null ? 25 : Math.round((keywordCoverage / 100) * 50),
    structure: Math.round((structure / 4) * 20),
    impact: bullets.length ? Math.round(Math.min(1, quantified / bullets.length / 0.6) * 10 + Math.max(0, 5 - weak)) : 0,
    format: Math.max(0, 15 - formatIssues.length * 3),
  };
  const score = Math.max(0, Math.min(100, parts.keywords + parts.structure + parts.impact + parts.format));

  return {
    score,
    parts,
    keywordCoverage,
    required,
    preferred,
    missingRequired,
    missingPreferred: preferred.filter((r) => !r.found),
    softSkills,
    relevant: relevant.slice(0, 12),
    experience,
    sections,
    placeholders,
    stats: { bullets: bullets.length, quantified, weak, words: parsed.wordCount },
  };
};

// ── Bullet suggestions ─────────────────────────────────────────────────────

const IRREGULAR = { building: 'built', writing: 'wrote', leading: 'led', making: 'made', running: 'ran', setting: 'set', teaching: 'taught', getting: 'got', doing: 'did', putting: 'put', cutting: 'cut', sending: 'sent', spending: 'spent', meeting: 'met', finding: 'found', holding: 'held', giving: 'gave', taking: 'took', choosing: 'chose' };

/** "maintaining" → "maintained" (good enough for resume verbs). */
export const pastTense = (gerund) => {
  const word = gerund.toLowerCase();
  if (IRREGULAR[word]) return IRREGULAR[word];
  const stem = word.slice(0, -3);
  if (/[^aeiou]y$/.test(stem)) return `${stem.slice(0, -1)}ied`;
  if (/e$/.test(stem)) return `${stem}d`;
  return `${stem}ed`;
};

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const COMMON_VERBS = new Set(['build', 'develop', 'design', 'create', 'implement', 'test', 'fix', 'deploy', 'write', 'maintain', 'improve', 'migrate', 'set', 'run', 'debug', 'launch', 'organize', 'organise', 'plan', 'prepare', 'document', 'review', 'automate', 'analyze', 'analyse', 'optimize', 'optimise', 'integrate', 'refactor', 'ship', 'train', 'research', 'coordinate', 'manage', 'support', 'scale']);
const DOUBLE_FINAL = new Set(['set', 'run', 'debug', 'plan', 'ship']);

/** "build" → "building", "write" → "writing", "plan" → "planning". */
const gerund = (verb) => (DOUBLE_FINAL.has(verb) ? `${verb}${verb.slice(-1)}ing` : /[^e]e$/.test(verb) ? `${verb.slice(0, -1)}ing` : `${verb}ing`);

/** Rewrite a weak opening without changing what the bullet claims. */
export const strengthenOpening = (text) => {
  const t = text.trim();
  let m = t.match(/^(responsible for|tasked with|in charge of)\s+(\w+ing)\b\s*(.*)$/i);
  if (m) return capitalize(`${pastTense(m[2])} ${m[3]}`.trim());
  m = t.match(/^(responsible for|in charge of)\s+(.*)$/i);
  if (m) return capitalize(`Owned ${m[2]}`);
  m = t.match(/^(helped|assisted)(?:\s+(?:in|with|to))?\s+(\w+)\b\s*(.*)$/i);
  // "Helped" means a share of the work, so keep that meaning.
  if (m) {
    const verb = m[2].toLowerCase();
    const action = /ing$/.test(verb) ? verb : COMMON_VERBS.has(verb) ? gerund(verb) : null;
    return capitalize((action ? `Contributed to ${action} ${m[3]}` : `Supported ${m[2]} ${m[3]}`).replace(/\s+/g, ' ').trim());
  }
  // "Participated in an event" is accurate as written; advise instead of rewriting.
  m = t.match(/^(involved in|was part of)\s+(.*)$/i);
  if (m) return capitalize(`Contributed to ${m[2]}`);
  m = t.match(/^worked on\s+(\w+ing)\b\s*(.*)$/i);
  if (m) return capitalize(`${pastTense(m[1])} ${m[2]}`.trim());
  m = t.match(/^worked on\s+(.*)$/i);
  if (m) return capitalize(`Developed ${m[1]}`);
  m = t.match(/^handled\s+(.*)$/i);
  if (m) return capitalize(`Managed ${m[1]}`);
  m = t.match(/^did\s+(.*)$/i);
  if (m) return capitalize(`Completed ${m[1]}`);
  return null;
};

export const METRIC_PLACEHOLDER = '[add a real result, e.g. % faster, users served, time saved]';

/**
 * Suggestions for each experience/project bullet. Each keeps the original
 * text, the suggested text and why. `needsInput` marks suggestions that
 * contain a placeholder the user must replace with a real fact.
 */
export const suggestBullets = (draft) => {
  const suggestions = [];
  for (const [key, label] of [['experience', 'Experience'], ['projects', 'Projects']]) {
    for (const entry of draft[key]) {
      for (const bullet of entry.bullets) {
        const text = bullet.text.trim();
        if (!text) continue;
        const reasons = [];
        let suggested = text;
        const stronger = strengthenOpening(text);
        if (stronger && stronger !== text) {
          suggested = stronger;
          reasons.push('Starts with a clear action verb instead of a weak phrase.');
        } else if (/^participated in\b/i.test(text)) {
          reasons.push('Say what you did there (built, led, placed), not only that you took part.');
        } else if (!STRONG_VERB.test(text) && /^(i |we |my )/i.test(text)) {
          reasons.push('Drop “I/we” and start with an action verb.');
        }
        if (/\b(was|were|been|being)\s+\w+ed\b/i.test(text)) reasons.push('Passive voice: say what you did directly.');
        if (text.split(/\s+/).length > 32) reasons.push('Long bullet: aim for one line (under ~25 words).');
        let needsInput = false;
        if (!QUANTIFIED.test(text) && !text.includes('[')) {
          suggested = `${suggested.replace(/[.;\s]+$/, '')} — ${METRIC_PLACEHOLDER}`;
          needsInput = true;
          reasons.push('No measurable result. Add one only if you have the real number.');
        }
        if (suggested !== text || reasons.length) {
          suggestions.push({ id: bullet.id, section: label, entryId: entry.id, entry: entry.heading, original: text, suggested, changed: suggested !== text, needsInput, reasons });
        }
      }
    }
  }
  return suggestions;
};

/** A summary template built only from skills already on the resume. */
export const summaryTemplate = (draft, job) => {
  const resumeSkills = new Set(detectTechnologies(draftToText(draft)).map((s) => s.id));
  const shared = [...(job?.required || []), ...(job?.preferred || [])].filter((s) => resumeSkills.has(s.id)).slice(0, 3).map((s) => s.name);
  const skills = shared.length ? shared.join(', ') : '[your strongest relevant skills]';
  return `[Your degree / year, e.g. Final-year B.Tech CSE student] with hands-on experience in ${skills}. [One concrete highlight from your projects or internships]. Looking for ${job?.title && job.title !== 'Pasted job' ? `a ${job.title} role` : '[target role]'}.`;
};

export { monthsFromRange };

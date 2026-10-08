/**
 * Job description analysis.
 *
 * parseJobDescription(text) → title, required/preferred skills, experience,
 *                             education, soft skills
 * matchJob(parsed, levels)  → per-skill match and an overall job match %
 * jobToRole(parsed)         → a role object, so the existing gap analysis
 *                             and roadmap can target this exact job
 */

import { detectTechnologies } from './textSkills.js';
import { getSkill } from '../data/skills.js';

const REQUIRED_HEADINGS = /^(requirements|qualifications|what you('|’)ll need|what we('|’)re looking for|must[- ]haves?|minimum qualifications|basic qualifications|required (skills|qualifications)|you have|who you are|skills|technical skills|your profile)\b/i;
const PREFERRED_HEADINGS = /^(preferred( qualifications| skills)?|nice[- ]to[- ]haves?|bonus( points)?|good to have|pluses|it('|’)s a plus|desired( skills)?|additional qualifications)\b/i;
const RESPONSIBILITY_HEADINGS = /^(responsibilities|what you('|’)ll do|the role|about the role|your role|key responsibilities|day to day|role overview)\b/i;
const PREFERRED_INLINE = /\b(preferred|nice to have|a plus|bonus|is a plus|good to have|familiarity with|exposure to)\b/i;

const SOFT_SKILLS = [
  ['Communication', /\bcommunicat(e|ion|ing)\b/i],
  ['Teamwork', /\b(team ?work|team player|collaborat(e|ion|ive))\b/i],
  ['Problem solving', /\bproblem[- ]solving\b/i],
  ['Ownership', /\b(ownership|take ownership|self[- ]starter|proactive)\b/i],
  ['Leadership', /\b(leadership|lead(ing)? (a )?team|mentor(ing)?)\b/i],
  ['Adaptability', /\b(adaptab(le|ility)|fast[- ]paced|ambiguity)\b/i],
  ['Attention to detail', /\battention to detail|detail[- ]oriented\b/i],
  ['Stakeholder management', /\bstakeholders?\b/i],
  ['Time management', /\b(time management|prioriti[sz](e|ation))\b/i],
  ['Curiosity', /\b(curious|curiosity|eager to learn|growth mindset)\b/i],
];

const EDUCATION = /\b(bachelor[’']?s?|master[’']?s?|b\.?\s?tech|m\.?\s?tech|b\.?s\.?|m\.?s\.?|ph\.?d|degree)\b[^.\n]{0,80}/i;
const EXPERIENCE = /(\d{1,2})\s*\+?\s*(?:(?:-|–|to)\s*(\d{1,2})\s*)?(?:years?|yrs?)(?:\s+of)?(?:\s+\w+){0,4}\s+experience/i;
const EXPERIENCE_ALT = /experience[^.\n]{0,40}?(\d{1,2})\s*\+?\s*(?:years?|yrs?)/i;

/** Parse a pasted job description. */
export const parseJobDescription = (raw = '') => {
  const text = raw.replace(/\r/g, '\n').replace(/[ \t ]+/g, ' ').trim();
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  const buckets = { required: [], preferred: [], responsibilities: [], other: [] };
  let section = 'other';
  for (const line of lines) {
    const bare = line.replace(/^[^A-Za-z]+/, '').replace(/[:]+$/, '').trim();
    if (bare.length <= 60 && PREFERRED_HEADINGS.test(bare)) {
      section = 'preferred';
      continue;
    }
    if (bare.length <= 60 && REQUIRED_HEADINGS.test(bare)) {
      section = 'required';
      continue;
    }
    if (bare.length <= 60 && RESPONSIBILITY_HEADINGS.test(bare)) {
      section = 'responsibilities';
      continue;
    }
    buckets[PREFERRED_INLINE.test(line) && section !== 'preferred' ? 'preferred' : section].push(line);
  }

  const requiredText = [...buckets.required, ...buckets.responsibilities, ...buckets.other].join('\n');
  const required = detectTechnologies(requiredText);
  const requiredIds = new Set(required.map((s) => s.id));
  const preferred = detectTechnologies(buckets.preferred.join('\n')).filter((s) => !requiredIds.has(s.id));

  const exp = text.match(EXPERIENCE) || text.match(EXPERIENCE_ALT);
  const experience = exp ? { min: Number(exp[1]), max: exp[2] ? Number(exp[2]) : null, text: exp[0].trim() } : null;
  const education = text.match(EDUCATION)?.[0].trim() || null;
  const softSkills = SOFT_SKILLS.filter(([, regex]) => regex.test(text)).map(([name]) => name);

  const firstLine = lines[0] || '';
  const title =
    firstLine.length <= 80 && !REQUIRED_HEADINGS.test(firstLine) && !/[.!?]$/.test(firstLine) ? firstLine.replace(/^(job title|role|position)\s*[:-]\s*/i, '') : 'Pasted job';

  return {
    title,
    required: required.map((s) => ({ id: s.id, name: s.name, category: s.category, mentions: s.count })),
    preferred: preferred.map((s) => ({ id: s.id, name: s.name, category: s.category, mentions: s.count })),
    technologies: [...new Set([...required, ...preferred].map((s) => s.category))],
    experience,
    education,
    softSkills,
    wordCount: text.split(/\s+/).filter(Boolean).length,
  };
};

export const REQUIRED_TARGET = 70;
export const PREFERRED_TARGET = 60;

/**
 * Compare a job with the user's skill levels (analysis.levels shape or a
 * plain { id: level } map).
 */
export const matchJob = (job, levels = {}) => {
  const levelOf = (id) => levels[id]?.level ?? levels[id] ?? 0;
  let earned = 0;
  let total = 0;
  const rows = [
    ...job.required.map((s) => ({ ...s, kind: 'required', target: REQUIRED_TARGET, weight: 2 })),
    ...job.preferred.map((s) => ({ ...s, kind: 'preferred', target: PREFERRED_TARGET, weight: 1 })),
  ].map((row) => {
    const level = levelOf(row.id);
    const coverage = Math.min(1, level / row.target);
    earned += coverage * row.weight;
    total += row.weight;
    return { ...row, level, gap: Math.max(0, row.target - level), has: level >= row.target * 0.8 };
  });
  return {
    match: total ? Math.round((earned / total) * 100) : 0,
    rows,
    have: rows.filter((r) => r.has),
    missing: rows.filter((r) => !r.has),
  };
};

/** Turn a parsed job into a custom-role definition (see buildCustomRole). */
export const jobToCustomRole = (job) => ({
  name: job.title && job.title !== 'Pasted job' ? job.title : 'Target job',
  fromJob: true,
  skills: [
    ...job.required.map((s, index) => ({ id: s.id, name: s.name || getSkill(s.id)?.name, level: REQUIRED_TARGET + (index < 3 ? 10 : 0), importance: index < 3 ? 'critical' : 'high' })),
    ...job.preferred.map((s) => ({ id: s.id, name: s.name || getSkill(s.id)?.name, level: PREFERRED_TARGET, importance: 'medium' })),
  ].slice(0, 20),
});

/**
 * Detect catalog skills mentioned in free text (resumes, job descriptions,
 * READMEs). Matching is word-boundary based; terms that are also common
 * English words ("go", "react", "express", "excel"…) must appear with their
 * canonical capitalisation to count.
 */

import { SKILLS } from '../data/skills.js';

/** Terms that are risky as plain words, matched case-sensitively. */
const CASE_SENSITIVE = new Set(['go', 'r', 'react', 'express', 'excel', 'swift', 'spring', 'rest', 'flask', 'spark', 'vue', 'next', 'node', 'dart', 'ml', 'ai', 'nlp', 'oop', 'cv', 'ux', 'ui', 'security']);

/**
 * Forms that count for case-sensitive terms. An empty list means the alias is
 * too ambiguous to match on its own ("CV" is usually a résumé, "security" a
 * generic word); the skill's full name still matches.
 */
const CANONICAL = {
  go: ['Go', 'Golang'],
  r: ['R'],
  react: ['React', 'React.js', 'ReactJS'],
  express: ['Express', 'Express.js', 'ExpressJS'],
  excel: ['Excel', 'MS Excel', 'Microsoft Excel'],
  swift: ['Swift', 'SwiftUI'],
  spring: ['Spring Boot', 'Spring Framework'],
  security: [],
  rest: ['REST', 'RESTful'],
  flask: ['Flask'],
  spark: ['Spark', 'PySpark', 'Apache Spark'],
  vue: ['Vue', 'Vue.js'],
  next: ['Next.js', 'NextJS'],
  node: ['Node', 'Node.js', 'NodeJS'],
  dart: ['Dart'],
  ml: ['ML'],
  ai: ['AI'],
  nlp: ['NLP'],
  oop: ['OOP', 'OOPS', 'OOPs'],
  cv: [],
  ux: ['UX'],
  ui: ['UI'],
};

const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const boundary = (term) => {
  // Terms like "C++", "C#", ".NET", "Node.js" need custom boundaries.
  const body = escape(term);
  return `(?<![A-Za-z0-9+#])${body}(?![A-Za-z0-9+#])`;
};

/** Build one matcher per skill from its name and aliases. */
const MATCHERS = SKILLS.map((skill) => {
  const insensitive = new Set();
  const sensitive = new Set();
  for (const raw of [skill.name, ...(skill.aliases || [])]) {
    const term = raw.trim();
    const lower = term.toLowerCase();
    if (lower.length < 2 && !CANONICAL[lower]) continue;
    if (CASE_SENSITIVE.has(lower)) (CANONICAL[lower] || [term]).forEach((t) => sensitive.add(t));
    else insensitive.add(term);
  }
  const regexes = [];
  if (insensitive.size) regexes.push(new RegExp([...insensitive].map(boundary).join('|'), 'gi'));
  if (sensitive.size) regexes.push(new RegExp([...sensitive].map(boundary).join('|'), 'g'));
  return { skill, regexes };
});

/**
 * Find skills in text.
 * @returns {Array<{ id, name, category, count }>} sorted by mention count
 */
export const detectSkills = (text = '') => {
  if (!text) return [];
  const found = [];
  for (const { skill, regexes } of MATCHERS) {
    let count = 0;
    for (const regex of regexes) {
      regex.lastIndex = 0;
      const matches = text.match(regex);
      if (matches) count += matches.length;
    }
    if (count) found.push({ id: skill.id, name: skill.name, category: skill.category, count });
  }
  return found.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
};

/** Common technologies that map onto catalog skills but aren't aliases. */
const EXTRA_TECH = [
  [/\b(postgres(?:ql)?|mysql|sqlite|oracle db|sql server)\b/gi, 'sql'],
  [/\b(jest|pytest|junit|mocha|cypress|playwright|vitest)\b/gi, 'testing'],
  [/\b(github actions|jenkins|gitlab ci|circleci)\b/gi, 'ci-cd'],
  [/\b(aws|amazon web services|azure|gcp|google cloud)\b/gi, 'cloud'],
  [/\b(tensorflow|keras)\b/gi, 'pytorch'],
  [/\b(matplotlib|seaborn|plotly)\b/gi, 'data-visualization'],
  [/\b(numpy)\b/gi, 'numpy'],
];

/** detectSkills plus a few technology-to-skill mappings. */
export const detectTechnologies = (text = '') => {
  const skills = detectSkills(text);
  const byId = new Map(skills.map((s) => [s.id, s]));
  for (const [regex, skillId] of EXTRA_TECH) {
    regex.lastIndex = 0;
    const matches = text.match(regex);
    if (!matches) continue;
    const skill = SKILLS.find((s) => s.id === skillId);
    if (!skill) continue;
    const existing = byId.get(skillId);
    if (existing) existing.count += matches.length;
    else byId.set(skillId, { id: skill.id, name: skill.name, category: skill.category, count: matches.length });
  }
  return [...byId.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
};

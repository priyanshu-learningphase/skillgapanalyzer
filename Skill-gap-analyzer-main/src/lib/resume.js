/**
 * Resume analysis — runs entirely in the browser.
 *
 * parseResume(text)            → sections, skills (with evidence), projects,
 *                                education, experience, certifications, links
 * compareResumeToRole(parsed, role) → match %, missing skills/keywords,
 *                                weak sections and concrete suggestions
 */

import { detectTechnologies } from './textSkills.js';
import { getSkill } from '../data/skills.js';
import { IMPORTANCE, requirementLabel } from '../data/roles.js';
import { projectForSkill } from '../data/projects.js';

const SECTION_PATTERNS = [
  ['summary', /^(summary|profile|objective|about( me)?|professional summary|career objective)$/],
  ['education', /^(education|academic background|academics|education (and|&) training|academic qualifications)$/],
  ['experience', /^(experience|work experience|professional experience|employment( history)?|internships?|work history|relevant experience)$/],
  ['projects', /^(projects|personal projects|academic projects|key projects|selected projects|project experience|projects (and|&) publications)$/],
  ['skills', /^(skills|technical skills|technologies|tech stack|core competencies|skills (and|&) tools|tools (and|&) technologies|technical proficiencies|skill set)$/],
  ['certifications', /^(certifications?|certificates|licen[sc]es? (and|&) certifications|courses|courses (and|&) certifications|online courses)$/],
  ['achievements', /^(achievements|awards|honou?rs|accomplishments|awards (and|&) achievements)$/],
  ['leadership', /^(leadership|extra-?curricular( activities)?|activities|volunteering|positions of responsibility)$/],
];

const BULLET = /^[•\-–*▪◦●○■□➢►✓]\s*|^\d+[.)]\s+/;
const MONTH = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?';
const DATE = `(?:${MONTH}\\s*'?\\d{2,4}|\\d{1,2}/\\d{2,4}|(?:19|20)\\d{2})`;
const DATE_RANGE = new RegExp(`${DATE}\\s*(?:-|–|—|to)\\s*(?:${DATE}|present|current|now|ongoing)`, 'i');
const DEGREE = /\b(b\.?\s?tech|b\.?\s?e\b|b\.?\s?sc|bca|bachelor[’']?s?|b\.?s\.?\b|m\.?\s?tech|m\.?\s?sc|mca|master[’']?s?|m\.?s\.?\b|mba|ph\.?d|diploma|high school|higher secondary|senior secondary|class (x|xii|10|12))\b/i;
const INSTITUTION = /\b(university|college|institute|school|academy|iit|nit|iiit|bits)\b/i;
const GPA = /\b(c?gpa|cpi|percentage)\b[:\s]*([\d.]+%?)(?:\s*\/\s*([\d.]+))?/i;
const WEAK_START = /^(worked on|responsible for|helped|assisted|involved in|participated in|was part of|did|handled|tasked with)\b/i;
const QUANTIFIED = /(\d+(\.\d+)?\s*(%|x|k|m|\+)|\$\s?\d|\b\d{2,}\b|\bby \d)/i;
const CERT_PATTERN = /(aws certified[^,;\n]*|az-\d{3}[^,;\n]*|azure (fundamentals|administrator|developer|solutions architect)[^,;\n]*|google (cloud )?(certified|associate|professional)[^,;\n]*|comptia (security|network|a)\+?|\bckad\b|\bcka\b|\bccna\b|\boscp\b|\bceh\b|\bpmp\b|tensorflow developer certificate|meta (front-end|back-end) developer[^,;\n]*|ibm data science[^,;\n]*|google data analytics[^,;\n]*)/gi;

const normalizeText = (raw) =>
  raw
    .replace(/\r/g, '\n')
    .replace(/[ \t ]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const headingKey = (line) => {
  const cleaned = line
    .replace(/[:|_•\-–—]+$/g, '')
    .replace(/^[^A-Za-z]+/, '')
    .trim()
    .toLowerCase();
  if (!cleaned || cleaned.length > 40) return null;
  for (const [key, pattern] of SECTION_PATTERNS) if (pattern.test(cleaned)) return key;
  return null;
};

const stripBullet = (line) => line.replace(BULLET, '').trim();

const splitProjects = (lines) => {
  const projects = [];
  let current = null;
  for (const line of lines) {
    const isBullet = BULLET.test(line);
    const text = stripBullet(line);
    // A project title: a short non-bullet line, or "Title – description" / "Title | stack".
    const separated = text.match(/^(.{3,70}?)\s+(?:[–—|]|-\s|:\s)\s*(.+)$/);
    const looksLikeTitle = !isBullet && text.length <= 90 && !/[.!?]$/.test(text);
    if (looksLikeTitle || (isBullet && separated && !current)) {
      current = { title: (separated && !looksLikeTitle ? separated[1] : separated?.[1] || text).replace(DATE_RANGE, '').trim(), lines: [text] };
      projects.push(current);
    } else if (current) {
      current.lines.push(text);
    } else {
      current = { title: (separated?.[1] || text.slice(0, 60)).trim(), lines: [text] };
      projects.push(current);
    }
  }
  return projects
    .filter((p) => p.title.length >= 3)
    .slice(0, 8)
    .map((p) => {
      const body = p.lines.join(' ');
      return {
        title: p.title.replace(/\s{2,}/g, ' '),
        technologies: detectTechnologies(body).map((s) => s.name).slice(0, 8),
        bullets: Math.max(0, p.lines.length - 1),
      };
    });
};

const splitExperience = (lines) => {
  const entries = [];
  let current = null;
  lines.forEach((line, index) => {
    const text = stripBullet(line);
    if (DATE_RANGE.test(text) && !BULLET.test(line)) {
      const titleText = text.replace(DATE_RANGE, '').replace(/[|,–—-]\s*$/, '').trim();
      const previous = index > 0 && !BULLET.test(lines[index - 1]) && !DATE_RANGE.test(lines[index - 1]) ? stripBullet(lines[index - 1]) : '';
      current = { title: titleText || previous || 'Role', dates: text.match(DATE_RANGE)[0], bullets: [] };
      entries.push(current);
    } else if (current && BULLET.test(line)) {
      current.bullets.push(text);
    }
  });
  return entries.slice(0, 6).map((e) => ({ title: e.title, dates: e.dates, bullets: e.bullets.length }));
};

/** Parse resume text into structured data. */
export const parseResume = (raw = '') => {
  const text = normalizeText(raw);
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const sections = { header: [] };
  let current = 'header';
  for (const line of lines) {
    const key = headingKey(line);
    if (key) {
      current = key;
      sections[key] ||= [];
    } else {
      (sections[current] ||= []).push(line);
    }
  }
  const sectionText = (key) => (sections[key] || []).join('\n');

  // Skills with evidence strength: experience > project > listed.
  const evidenceText = { experience: sectionText('experience'), projects: sectionText('projects') };
  const technologies = detectTechnologies(text);
  const inExperience = new Set(detectTechnologies(evidenceText.experience).map((s) => s.id));
  const inProjects = new Set(detectTechnologies(evidenceText.projects).map((s) => s.id));
  const skills = technologies.map((s) => {
    const evidence = inExperience.has(s.id) ? 'experience' : inProjects.has(s.id) ? 'project' : 'listed';
    const base = { experience: 65, project: 55, listed: 35 }[evidence];
    return { ...s, evidence, suggestedLevel: Math.min(75, base + (s.count >= 3 ? 10 : 0)) };
  });

  const bullets = lines.filter((l) => BULLET.test(l)).map(stripBullet);
  const quantified = bullets.filter((b) => QUANTIFIED.test(b));
  const weakBullets = bullets.filter((b) => WEAK_START.test(b));

  const education = (sections.education || [])
    .filter((l) => DEGREE.test(l) || INSTITUTION.test(l) || GPA.test(l))
    .slice(0, 5)
    .map(stripBullet);

  const certifications = [
    ...new Set([
      ...(sections.certifications || []).map(stripBullet).filter((l) => l.length > 3).slice(0, 8),
      ...[...text.matchAll(CERT_PATTERN)].map((m) => m[0].trim()),
    ]),
  ].slice(0, 8);

  return {
    wordCount: text.split(/\s+/).filter(Boolean).length,
    sectionsFound: Object.keys(sections).filter((k) => k !== 'header' && sections[k].length),
    links: {
      email: /[\w.+-]+@[\w-]+\.[\w.]+/.test(text),
      phone: /(\+?\d[\d\s().-]{8,}\d)/.test(text),
      github: /github\.com\/[\w-]+/i.test(text),
      linkedin: /linkedin\.com\/in\/[\w-]+/i.test(text),
    },
    skills,
    projects: splitProjects(sections.projects || []),
    experience: splitExperience(sections.experience || []),
    education,
    certifications,
    bullets: { total: bullets.length, quantified: quantified.length, weak: weakBullets.slice(0, 5) },
  };
};

/** Compare a parsed resume with a role's requirements. */
export const compareResumeToRole = (parsed, role) => {
  const bySkill = new Map(parsed.skills.map((s) => [s.id, s]));
  let earned = 0;
  let total = 0;

  const requirements = role.requirements.map((req) => {
    const found = req.skills.map((id) => bySkill.get(id)).find(Boolean) || null;
    const weight = IMPORTANCE[req.importance]?.weight ?? 2;
    const credit = !found ? 0 : found.evidence === 'listed' ? 0.6 : 1;
    earned += weight * credit;
    total += weight;
    return {
      key: req.key,
      label: requirementLabel(req),
      skillId: found?.id || req.skills[0],
      skillName: found?.name || getSkill(req.skills[0])?.name || req.skills[0],
      importance: req.importance,
      found: Boolean(found),
      evidence: found?.evidence || null,
    };
  });

  const rank = { critical: 0, high: 1, medium: 2, low: 3 };
  const missing = requirements.filter((r) => !r.found).sort((a, b) => rank[a.importance] - rank[b.importance]);
  const listedOnly = requirements.filter((r) => r.evidence === 'listed');

  const missingKeywords = missing.slice(0, 8).map((r) => {
    const skill = getSkill(r.skillId);
    const alias = skill?.aliases?.find((a) => a.length > 2 && a.toLowerCase() !== skill.name.toLowerCase());
    return alias ? `${skill.name} (${alias})` : r.skillName;
  });

  const weakSections = [];
  const has = (key) => parsed.sectionsFound.includes(key);
  if (!has('projects')) weakSections.push({ section: 'Projects', issue: 'No projects section found.', fix: 'Add 2–3 projects relevant to the role, each with the stack and a measurable outcome.' });
  else if (parsed.projects.length < 2) weakSections.push({ section: 'Projects', issue: 'Only one project detected.', fix: 'Aim for 2–3 projects that show different skills the role needs.' });
  if (!has('skills')) weakSections.push({ section: 'Skills', issue: 'No dedicated skills section.', fix: 'Add a short, grouped skills section (Languages, Frameworks, Tools) so recruiters and ATS can scan it.' });
  if (!has('experience')) weakSections.push({ section: 'Experience', issue: 'No experience section.', fix: 'Add internships, freelance, open-source or teaching-assistant work — anything with real responsibility.' });
  if (!has('education')) weakSections.push({ section: 'Education', issue: 'No education section detected.', fix: 'Add your degree, institution and graduation year.' });
  if (parsed.bullets.total >= 4 && parsed.bullets.quantified / parsed.bullets.total < 0.3) {
    weakSections.push({
      section: 'Impact',
      issue: `Only ${parsed.bullets.quantified} of ${parsed.bullets.total} bullet points include numbers.`,
      fix: 'Quantify results: users, latency, % improvement, dataset size, time saved.',
    });
  }
  if (parsed.bullets.weak.length) {
    weakSections.push({
      section: 'Wording',
      issue: `${parsed.bullets.weak.length} bullet${parsed.bullets.weak.length === 1 ? '' : 's'} start with weak phrases like “${parsed.bullets.weak[0].split(' ').slice(0, 2).join(' ')}”.`,
      fix: 'Start with strong verbs — Built, Designed, Reduced, Automated, Led.',
    });
  }
  if (!parsed.links.github || !parsed.links.linkedin) {
    weakSections.push({
      section: 'Links',
      issue: `Missing ${[!parsed.links.github && 'GitHub', !parsed.links.linkedin && 'LinkedIn'].filter(Boolean).join(' and ')} link.`,
      fix: 'Add profile links in the header so reviewers can verify your work.',
    });
  }
  if (parsed.wordCount < 200) weakSections.push({ section: 'Length', issue: `Only ${parsed.wordCount} words — the resume may be too thin.`, fix: 'Expand projects and experience with specific, quantified bullets.' });
  if (parsed.wordCount > 950) weakSections.push({ section: 'Length', issue: `${parsed.wordCount} words — likely more than one page.`, fix: 'Cut older or less relevant items; keep it to one page as a student or early-career candidate.' });

  // Critical/high skills with no hands-on evidence → suggest a project that proves them.
  const needsProof = requirements.filter((r) => (r.importance === 'critical' || r.importance === 'high') && r.evidence !== 'experience' && r.evidence !== 'project');
  const projectIdeas = [];
  const seen = new Set();
  for (const r of needsProof) {
    const project = projectForSkill(r.skillId, role.id);
    if (project && !seen.has(project.id)) {
      seen.add(project.id);
      projectIdeas.push({ project, forSkill: r.skillName });
    }
    if (projectIdeas.length >= 3) break;
  }

  const suggestions = [];
  if (missing.length) suggestions.push(`Learn and add evidence for ${missing.slice(0, 3).map((m) => m.skillName).join(', ')} — they’re required for ${role.name} and missing from your resume.`);
  if (listedOnly.length) suggestions.push(`${listedOnly.slice(0, 3).map((m) => m.skillName).join(', ')} ${listedOnly.length === 1 ? 'is' : 'are'} only listed — show ${listedOnly.length === 1 ? 'it' : 'them'} in a project or experience bullet.`);
  if (missingKeywords.length) suggestions.push(`Include role keywords naturally where true: ${missingKeywords.slice(0, 4).join(', ')}.`);
  for (const w of weakSections.slice(0, 3)) suggestions.push(w.fix);

  return {
    match: total ? Math.round((earned / total) * 100) : 0,
    requirements,
    missing,
    listedOnly,
    missingKeywords,
    weakSections,
    projectIdeas,
    suggestions,
  };
};

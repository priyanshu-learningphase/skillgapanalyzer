/**
 * Editable resume model for the ATS tailor.
 *
 * toResumeDraft(text) → structured sections the user can edit
 * draftToText(draft)  → plain text in a standard, ATS-friendly order
 * findPlaceholders    → "[…]" gaps the user still has to fill with real facts
 *
 * Every bullet keeps its `original` text, so suggested wording is always
 * distinguishable from what the user actually wrote.
 */

import { BULLET, DATE_RANGE, headingKey, normalizeText, stripBullet } from './resume.js';

let counter = 0;
const uid = (prefix) => `${prefix}${Date.now().toString(36)}${(counter++).toString(36)}`;

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PHONE = /(\+?\d[\d\s().-]{8,}\d)/;
const LINK = /\b((?:https?:\/\/)?(?:www\.)?(?:linkedin\.com\/in\/|github\.com\/|gitlab\.com\/|leetcode\.com\/|[\w-]+\.(?:dev|io|me|com|in|app)\/?)[\w./?=#%-]*)/gi;
/** Non-global copy for .test(), which would otherwise carry lastIndex between calls. */
const HAS_LINK = new RegExp(LINK.source, 'i');

export const SECTION_ORDER = [
  ['summary', 'Summary'],
  ['skills', 'Technical Skills'],
  ['experience', 'Experience'],
  ['projects', 'Projects'],
  ['education', 'Education'],
  ['certifications', 'Certifications'],
  ['achievements', 'Achievements'],
];

export const emptyDraft = () => ({
  header: { name: '', email: '', phone: '', location: '', links: '' },
  summary: '',
  skills: [],
  experience: [],
  projects: [],
  education: [],
  certifications: [],
  achievements: [],
  extras: [],
});

export const newBullet = (text = '') => ({ id: uid('b'), text, original: text });
export const newEntry = () => ({ id: uid('e'), heading: '', subheading: '', dates: '', bullets: [] });
export const newItem = (text = '') => ({ id: uid('i'), text });
export const newSkillGroup = (group = '', items = '') => ({ id: uid('s'), group, items });

const parseHeader = (lines) => {
  const header = emptyDraft().header;
  const joined = lines.join(' | ');
  header.email = joined.match(EMAIL)?.[0] || '';
  header.phone = joined.match(PHONE)?.[0]?.trim() || '';
  // Remove emails first, or their domain ("example.com") reads as a website.
  const withoutEmails = joined.replace(new RegExp(EMAIL.source, 'g'), ' ');
  const links = [...new Set((withoutEmails.match(LINK) || []).map((l) => l.replace(/[).,;]+$/, '')))];
  header.links = links.join(' | ');
  const nameLine = lines.find((l) => !EMAIL.test(l) && !PHONE.test(l) && l.length <= 60 && !HAS_LINK.test(l) && /[A-Za-z]/.test(l));
  header.name = nameLine || '';
  // Location: a short leftover piece of a contact line, e.g. "Pune, India".
  const pieces = lines
    .filter((l) => l !== nameLine)
    .flatMap((l) => l.split(/\s*[|•·]\s*/))
    .map((p) => p.trim())
    .filter((p) => p && !EMAIL.test(p) && !PHONE.test(p) && !HAS_LINK.test(p) && p.length <= 40 && /^[A-Za-z][A-Za-z .,-]+$/.test(p));
  header.location = pieces[0] || '';
  return header;
};

/** Experience / projects / education: entries with a heading and bullets. */
const parseEntries = (lines) => {
  const entries = [];
  let current = null;
  for (const line of lines) {
    const isBullet = BULLET.test(line);
    const text = stripBullet(line);
    const range = text.match(DATE_RANGE)?.[0] || '';
    const bare = range ? text.replace(range, '').replace(/[|,–—-]\s*$/, '').replace(/\s{2,}/g, ' ').trim() : text;
    if (isBullet || (current && text.length > 110)) {
      if (!current) {
        current = newEntry();
        entries.push(current);
      }
      current.bullets.push(newBullet(text));
      continue;
    }
    if (current && !current.bullets.length && !current.subheading && (!range || !current.dates)) {
      current.subheading = bare;
      if (range) current.dates = range;
      continue;
    }
    current = { ...newEntry(), heading: bare, dates: range };
    entries.push(current);
  }
  return entries.filter((e) => e.heading || e.bullets.length);
};

const parseSkills = (lines) => {
  const groups = [];
  for (const line of lines.map(stripBullet)) {
    const m = line.match(/^([^:]{2,40}):\s*(.+)$/);
    if (m) groups.push(newSkillGroup(m[1].trim(), m[2].trim()));
    else if (groups.length && !groups[groups.length - 1].group) groups[groups.length - 1].items += `, ${line}`;
    else groups.push(newSkillGroup('', line));
  }
  return groups;
};

/** Build an editable draft from extracted resume text. */
export const toResumeDraft = (raw = '') => {
  const lines = normalizeText(raw)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const buckets = { header: [] };
  const extraTitles = {};
  let section = 'header';
  for (const line of lines) {
    const key = headingKey(line);
    if (key) {
      section = key;
      buckets[section] ||= [];
      if (key === 'leadership') extraTitles[key] = line.replace(/[:]+$/, '').trim();
      continue;
    }
    (buckets[section] ||= []).push(line);
  }
  const draft = emptyDraft();
  draft.header = parseHeader(buckets.header.slice(0, 6));
  draft.summary = (buckets.summary || []).map(stripBullet).join(' ');
  draft.skills = parseSkills(buckets.skills || []);
  draft.experience = parseEntries(buckets.experience || []);
  draft.projects = parseEntries(buckets.projects || []);
  draft.education = parseEntries(buckets.education || []);
  draft.certifications = (buckets.certifications || []).map((l) => newItem(stripBullet(l)));
  draft.achievements = (buckets.achievements || []).map((l) => newItem(stripBullet(l)));
  if (buckets.leadership?.length) draft.extras.push({ id: uid('x'), title: extraTitles.leadership || 'Leadership & Activities', items: buckets.leadership.map((l) => newItem(stripBullet(l))) });
  return draft;
};

const entryLines = (entry) => {
  const out = [];
  const title = [entry.heading, entry.dates].filter(Boolean).join(' | ');
  if (title) out.push(title);
  if (entry.subheading) out.push(entry.subheading);
  for (const b of entry.bullets) if (b.text.trim()) out.push(`• ${b.text.trim()}`);
  return out;
};

/** Sections in render order, skipping empty ones. Shared by text, PDF and DOCX output. */
export const draftSections = (draft) => {
  const sections = [];
  if (draft.summary.trim()) sections.push({ key: 'summary', title: 'Summary', paragraphs: [draft.summary.trim()] });
  const skills = draft.skills.filter((g) => g.items.trim());
  if (skills.length) sections.push({ key: 'skills', title: 'Technical Skills', lines: skills.map((g) => (g.group ? `${g.group}: ${g.items.trim()}` : g.items.trim())) });
  for (const [key, title] of [['experience', 'Experience'], ['projects', 'Projects'], ['education', 'Education']]) {
    const entries = draft[key].filter((e) => e.heading.trim() || e.bullets.some((b) => b.text.trim()));
    if (entries.length) sections.push({ key, title, entries });
  }
  for (const [key, title] of [['certifications', 'Certifications'], ['achievements', 'Achievements']]) {
    const items = draft[key].filter((i) => i.text.trim());
    if (items.length) sections.push({ key, title, items: items.map((i) => i.text.trim()) });
  }
  for (const extra of draft.extras) {
    const items = extra.items.filter((i) => i.text.trim());
    if (items.length) sections.push({ key: extra.id, title: extra.title, items: items.map((i) => i.text.trim()) });
  }
  return sections;
};

export const headerLines = (header) => [header.name.trim(), [header.email, header.phone, header.location, header.links].map((v) => (v || '').trim()).filter(Boolean).join(' | ')].filter(Boolean);

/** Plain text in standard section order (used for scoring and previews). */
export const draftToText = (draft) => {
  const out = [...headerLines(draft.header)];
  for (const section of draftSections(draft)) {
    out.push('', section.title.toUpperCase());
    if (section.paragraphs) out.push(...section.paragraphs);
    if (section.lines) out.push(...section.lines);
    if (section.entries) section.entries.forEach((e) => out.push(...entryLines(e)));
    if (section.items) out.push(...section.items.map((i) => `• ${i}`));
  }
  return out.join('\n');
};

const PLACEHOLDER = /\[[^\]\n]{2,120}\]/g;

/** Unfilled "[…]" placeholders left from suggestions or templates. */
export const findPlaceholders = (draft) => {
  const found = [];
  const scan = (text, where) => {
    for (const m of String(text || '').match(PLACEHOLDER) || []) found.push({ where, text: m });
  };
  scan(draft.summary, 'Summary');
  for (const [key, title] of [['experience', 'Experience'], ['projects', 'Projects'], ['education', 'Education']]) {
    for (const e of draft[key]) {
      scan(e.heading, title);
      scan(e.subheading, title);
      e.bullets.forEach((b) => scan(b.text, `${title}: ${e.heading || 'entry'}`));
    }
  }
  draft.skills.forEach((g) => scan(g.items, 'Skills'));
  [...draft.certifications, ...draft.achievements].forEach((i) => scan(i.text, 'Certifications & achievements'));
  return found;
};

/** Bullets whose text differs from what was imported (accepted or edited). */
export const changedBullets = (draft) =>
  [...draft.experience, ...draft.projects].flatMap((e) => e.bullets.filter((b) => b.original && b.text.trim() !== b.original.trim()).map((b) => ({ ...b, entry: e.heading })));

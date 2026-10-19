import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toResumeDraft, draftToText, findPlaceholders, changedBullets } from '../src/lib/resumeDraft.js';
import { analyzeResumeForJob, suggestBullets, strengthenOpening, pastTense, summaryTemplate, monthsFromRange, METRIC_PLACEHOLDER } from '../src/lib/ats.js';
import { buildDocx, extractDocxText, buildPdf, pdfSafe } from '../src/lib/resumeExport.js';
import { parseJobDescription } from '../src/lib/jobDescription.js';
import { detectTechnologies } from '../src/lib/textSkills.js';

const RESUME = `Ananya Sharma
ananya.sharma@example.com | +91 98765 43210 | Pune, India | linkedin.com/in/ananya | github.com/ananya
Summary
Final-year computer science student who enjoys building web apps.
Technical Skills
Languages: JavaScript, Python, SQL
Frameworks: React, Node.js, Express
Tools: Git, Docker
Experience
Software Engineering Intern, Acme Corp | Jun 2025 – Aug 2025
- Worked on a REST API for order tracking using Node.js and PostgreSQL
- Responsible for writing unit tests with Jest
- Reduced page load time by 35% by lazy-loading images
Projects
Task Tracker | React, Node.js
- Helped build a kanban board with drag and drop
- Deployed on Render with GitHub Actions CI
Education
B.Tech in Computer Science, Pune University | 2022 – 2026
CGPA: 8.6/10
Certifications
AWS Certified Cloud Practitioner
Achievements
Top 10 in college hackathon 2024`;

const JD = parseJobDescription(`Backend Developer
Requirements
- Node.js and JavaScript
- REST APIs and SQL databases
- Docker
- 1+ years of experience
- Bachelor's degree in Computer Science
- Strong communication and teamwork
Nice to have
- Kubernetes
- AWS`);

const draft = toResumeDraft(RESUME);

test('resume text becomes an editable draft', () => {
  assert.equal(draft.header.name, 'Ananya Sharma');
  assert.equal(draft.header.email, 'ananya.sharma@example.com');
  assert.match(draft.header.phone, /98765/);
  assert.equal(draft.header.location, 'Pune, India');
  assert.match(draft.header.links, /linkedin\.com\/in\/ananya/);
  assert.match(draft.header.links, /github\.com\/ananya/);
  assert.ok(!/example\.com/.test(draft.header.links), 'an email’s domain is not a website');
  assert.match(draft.summary, /Final-year/);
  assert.deepEqual(draft.skills.map((g) => g.group), ['Languages', 'Frameworks', 'Tools']);
  assert.equal(draft.experience.length, 1);
  assert.equal(draft.experience[0].heading, 'Software Engineering Intern, Acme Corp');
  assert.match(draft.experience[0].dates, /Jun 2025/);
  assert.equal(draft.experience[0].bullets.length, 3);
  assert.equal(draft.projects[0].heading, 'Task Tracker | React, Node.js');
  assert.equal(draft.education[0].subheading, 'CGPA: 8.6/10');
  assert.equal(draft.certifications[0].text, 'AWS Certified Cloud Practitioner');
  assert.equal(draft.achievements.length, 1);
  // Every bullet remembers what the user wrote.
  assert.ok(draft.experience[0].bullets.every((b) => b.original === b.text));
});

test('draft text round-trips through the parser', () => {
  const text = draftToText(draft);
  assert.match(text, /^Ananya Sharma\n/);
  assert.match(text, /\nEXPERIENCE\n/);
  assert.match(text, /• Reduced page load time by 35%/);
  const again = toResumeDraft(text);
  assert.equal(again.experience[0].bullets.length, 3);
  assert.equal(again.header.email, draft.header.email);
});

test('job analysis splits required and preferred keywords', () => {
  const report = analyzeResumeForJob(draft, JD, { now: new Date('2026-10-14') });
  const req = Object.fromEntries(report.required.map((r) => [r.id, r.found]));
  assert.equal(req.nodejs, true);
  assert.equal(req.docker, true);
  assert.ok(report.missingPreferred.some((r) => r.id === 'kubernetes'));
  assert.ok(report.keywordCoverage > 50 && report.keywordCoverage < 100);
  assert.ok(report.score > 0 && report.score <= 100);
  assert.equal(report.score, report.parts.keywords + report.parts.structure + report.parts.impact + report.parts.format);
  assert.ok(report.relevant.some((r) => r.skills.includes('Node.js')));
  assert.equal(report.experience.months, 3);
  assert.equal(report.experience.meets, false);
  assert.ok(report.sections.find((s) => s.key === 'experience').issues.some((i) => /estimated from dates/.test(i)));
  assert.equal(report.softSkills.length, 2);
  // An empty resume still produces guidance, not a crash.
  const empty = analyzeResumeForJob(toResumeDraft(''), JD);
  assert.ok(empty.sections.filter((s) => s.status === 'missing').length >= 4);
});

test('suggestions reword without adding facts', () => {
  const suggestions = suggestBullets(draft);
  const byOriginal = Object.fromEntries(suggestions.map((s) => [s.original, s]));
  const api = byOriginal['Worked on a REST API for order tracking using Node.js and PostgreSQL'];
  assert.match(api.suggested, /^Developed a REST API/);
  assert.ok(api.needsInput, 'missing metric becomes a visible placeholder');
  assert.ok(api.suggested.includes(METRIC_PLACEHOLDER));
  assert.match(byOriginal['Responsible for writing unit tests with Jest'].suggested, /^Wrote unit tests with Jest/);
  // "Helped" keeps its meaning: a contribution, not sole ownership.
  assert.match(byOriginal['Helped build a kanban board with drag and drop'].suggested, /^Contributed to building a kanban board/);
  // Already quantified and strong: no rewrite.
  assert.ok(!byOriginal['Reduced page load time by 35% by lazy-loading images']);
  // No suggestion introduces a technology the original didn't mention.
  for (const s of suggestions) {
    const before = new Set(detectTechnologies(s.original).map((x) => x.id));
    for (const t of detectTechnologies(s.suggested)) assert.ok(before.has(t.id), `${t.name} added to "${s.original}"`);
  }
});

test('wording helpers', () => {
  assert.equal(pastTense('maintaining'), 'maintained');
  assert.equal(pastTense('building'), 'built');
  assert.equal(pastTense('debugging'), 'debugged');
  assert.equal(pastTense('studying'), 'studied');
  assert.equal(strengthenOpening('Helped the team with code reviews'), 'Supported the team with code reviews');
  assert.equal(strengthenOpening('Participated in a hackathon'), null, 'events are described accurately already');
  assert.equal(strengthenOpening('Built a CLI'), null);
  assert.equal(monthsFromRange('Jan 2024 - Dec 2024'), 12);
  const template = summaryTemplate(draft, JD);
  assert.match(template, /\[Your degree/);
  assert.ok(!/Kubernetes/.test(template), 'only skills already on the resume');
});

test('placeholders and changed bullets are tracked', () => {
  const edited = structuredClone(draft);
  edited.experience[0].bullets[0].text = `Built an API — ${METRIC_PLACEHOLDER}`;
  assert.equal(findPlaceholders(edited).length, 1);
  assert.equal(changedBullets(edited).length, 1);
  assert.equal(findPlaceholders(draft).length, 0);
});

test('DOCX export opens and its text reads back', async () => {
  const bytes = await buildDocx(draft);
  assert.ok(bytes.length > 1000);
  assert.equal(String.fromCharCode(bytes[0], bytes[1]), 'PK', 'a zip container');
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(bytes);
  for (const part of ['[Content_Types].xml', '_rels/.rels', 'word/document.xml', 'word/styles.xml', 'word/_rels/document.xml.rels']) assert.ok(zip.file(part), part);
  const text = await extractDocxText(bytes);
  assert.match(text, /Ananya Sharma/);
  assert.match(text, /TECHNICAL SKILLS/);
  assert.match(text, /•\s+Reduced page load time by 35%/);
  // Re-importing the exported file gives the same structure.
  const reimported = toResumeDraft(text);
  assert.equal(reimported.experience[0].bullets.length, 3);
  assert.equal(reimported.header.email, draft.header.email);
});

test('DOCX reader rejects files that are not Word documents', async () => {
  await assert.rejects(() => extractDocxText(new TextEncoder().encode('not a zip')), /valid \.docx/);
});

test('PDF export contains real, selectable text', async () => {
  const buffer = await buildPdf(draft);
  const bytes = new Uint8Array(buffer);
  assert.equal(String.fromCharCode(...bytes.slice(0, 5)), '%PDF-');
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = pdfjs.getDocument({ data: bytes, useSystemFonts: true, disableFontFace: true });
  const doc = await task.promise;
  const page = await doc.getPage(1);
  const text = (await page.getTextContent()).items.map((i) => i.str).join(' ');
  assert.match(text, /Ananya Sharma/);
  assert.match(text, /EXPERIENCE/);
  assert.match(text, /Reduced page load time by 35%/);
  await task.destroy();
  assert.equal(pdfSafe('Salary ₹10L → offer ✓'), 'Salary Rs. 10L -> offer ');
});

/**
 * Shareable career portfolio.
 *
 * buildPortfolio() produces the public snapshot. Only sections the user
 * switches on are included, and it never contains resume text, job
 * applications, notes or anything else private. Certificates are the user's
 * own claims and are labelled as self-reported.
 */

import { EVIDENCE_LEVELS } from './evidence.js';
import { readinessBandFor } from './analysis.js';
import { ROLE_PROFILE_META } from '../data/roles.js';
import { PROJECT_MAP } from '../data/projects.js';
import { getSkill } from '../data/skills.js';
import { PASS_PCT } from '../data/assessments/index.js';

export const PORTFOLIO_SECTIONS = [
  { id: 'readiness', label: 'Target role and readiness score' },
  { id: 'skills', label: 'Skills with their evidence' },
  { id: 'assessments', label: 'Passed assessments and practical challenges' },
  { id: 'projects', label: 'Completed projects' },
  { id: 'github', label: 'GitHub profile insights' },
  { id: 'milestones', label: 'Completed roadmap milestones' },
  { id: 'certificates', label: 'Certificates and achievements' },
  { id: 'contact', label: 'Contact links' },
];

export const emptyPortfolioSettings = () => ({
  displayName: '',
  headline: '',
  bio: '',
  visibility: { readiness: true, skills: true, assessments: true, projects: true, github: false, milestones: true, certificates: true, contact: false },
  certificates: [],
  links: { linkedin: '', github: '', website: '', email: '' },
  slug: '',
  published: false,
  publishedAt: null,
  publishedHash: null,
});

export const normalizePortfolioSettings = (raw) => {
  const base = emptyPortfolioSettings();
  return { ...base, ...(raw || {}), visibility: { ...base.visibility, ...(raw?.visibility || {}) }, links: { ...base.links, ...(raw?.links || {}) }, certificates: Array.isArray(raw?.certificates) ? raw.certificates : [] };
};

export const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;
const URL_RE = /^https:\/\/[^\s/$.?#].[^\s]*$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const suggestSlug = (name) =>
  String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'my-portfolio';

export const validatePortfolioSettings = (s) => {
  const errors = {};
  if (!s.displayName.trim()) errors.displayName = 'Add the name visitors should see.';
  if (s.displayName.length > 80) errors.displayName = 'Keep it under 80 characters.';
  if (s.headline.length > 120) errors.headline = 'Keep it under 120 characters.';
  if (s.bio.length > 600) errors.bio = 'Keep it under 600 characters.';
  for (const key of ['linkedin', 'github', 'website']) if (s.links[key] && !URL_RE.test(s.links[key].trim())) errors[key] = 'Use a full link starting with https://';
  if (s.links.email && !EMAIL_RE.test(s.links.email.trim())) errors.email = 'Enter a valid email.';
  return { ok: Object.keys(errors).length === 0, errors };
};

export const validateSlug = (slug) => (SLUG_RE.test(slug || '') ? null : 'Use 3–40 lowercase letters, numbers or hyphens (not at the start or end).');

export const validateCertificate = (c) => {
  const errors = {};
  if (!String(c.name || '').trim()) errors.name = 'Name the certificate or achievement.';
  if (c.url && !URL_RE.test(c.url.trim())) errors.url = 'Use a full link starting with https://';
  if (c.date && !/^\d{4}-\d{2}(-\d{2})?$/.test(c.date)) errors.date = 'Use a valid date.';
  return { ok: Object.keys(errors).length === 0, errors };
};

const day = (iso) => (iso ? String(iso).slice(0, 10) : null);

/** The public snapshot. Pass only what's needed; nothing private is read. */
export const buildPortfolio = ({ settings, role, analysis, evidence = {}, career, progress, github, roadmap, latestAssessments = {}, now = new Date() }) => {
  const s = normalizePortfolioSettings(settings);
  const v = s.visibility;
  const out = { version: 1, displayName: s.displayName.trim(), headline: s.headline.trim(), bio: s.bio.trim(), generatedAt: now.toISOString() };

  if (v.readiness && analysis && role) {
    out.role = {
      name: role.name,
      company: role.company?.name || null,
      readiness: analysis.readiness,
      band: readinessBandFor(analysis.readiness).label,
      matched: analysis.counts.strong,
      total: analysis.items.length,
      profileVersion: role.custom ? null : ROLE_PROFILE_META.version,
      note: 'Readiness estimates coverage of this role’s configured skill requirements. It is not a hiring prediction.',
    };
  }

  if (v.skills && career?.skills?.length) {
    out.skills = [...career.skills]
      .filter((x) => x.level > 0)
      .sort((a, b) => (EVIDENCE_LEVELS[evidence[b.id]?.level || 'self'].rank - EVIDENCE_LEVELS[evidence[a.id]?.level || 'self'].rank) || b.level - a.level)
      .slice(0, 18)
      .map((x) => {
        const level = evidence[x.id]?.level || 'self';
        return { name: getSkill(x.id, x.name)?.name || x.name, level: x.level, evidence: level, evidenceLabel: EVIDENCE_LEVELS[level].label, verified: EVIDENCE_LEVELS[level].verified };
      });
  }

  if (v.assessments) {
    const quizzes = Object.values(latestAssessments)
      .filter((a) => a.pct >= PASS_PCT)
      .map((a) => ({ skill: getSkill(a.skillId)?.name || a.skillId, pct: a.pct, date: day(a.at) }));
    const seen = new Set();
    const practical = (progress?.verifications || [])
      .filter((x) => x.passed && !seen.has(x.challengeId) && seen.add(x.challengeId))
      .map((x) => ({ title: x.title, skill: getSkill(x.skillId)?.name || x.skillId, difficulty: x.difficulty, date: day(x.at) }));
    if (quizzes.length || practical.length) out.assessments = { quizzes, practical };
  }

  if (v.projects) {
    const projects = Object.entries(progress?.projects || {})
      .filter(([, p]) => p.status === 'completed')
      .map(([id, p]) => ({ title: p.title || PROJECT_MAP[id]?.title || id, skills: (PROJECT_MAP[id]?.skills || []).map((sid) => getSkill(sid)?.name).filter(Boolean).slice(0, 6), date: day(p.at) }));
    if (projects.length) out.projects = projects;
  }

  if (v.github && github?.username) {
    out.github = {
      username: github.username,
      url: github.profile?.url || `https://github.com/${github.username}`,
      score: github.score,
      languages: (github.languages || []).slice(0, 5).map((l) => (Array.isArray(l) ? l[0] : l.name || l.language || l)).filter(Boolean),
      repos: (github.repos || []).slice(0, 4).map((r) => ({ name: r.name, url: r.url, description: r.description || '' })),
      analysedAt: day(github.analyzedAt),
    };
  }

  if (v.milestones && roadmap?.phases?.length) {
    const done = roadmap.phases
      .filter((ph) => ph.tasks.length && ph.tasks.every((t) => progress?.completedTasks?.[t.id]))
      .map((ph) => ({ title: ph.title, date: day(ph.tasks.map((t) => progress.completedTasks[t.id]).sort().pop()) }));
    if (done.length) out.milestones = done;
  }

  if (v.certificates && s.certificates.length) {
    out.certificates = s.certificates.map((c) => ({ name: c.name.trim(), issuer: (c.issuer || '').trim(), date: c.date || null, url: (c.url || '').trim() || null, selfReported: true }));
  }

  if (v.contact) {
    const links = Object.fromEntries(Object.entries(s.links).filter(([, val]) => val && val.trim()).map(([k, val]) => [k, val.trim()]));
    if (Object.keys(links).length) out.contact = links;
  }
  return out;
};

/** Short, stable fingerprint of a snapshot (ignores generatedAt) to spot outdated published copies. */
export const portfolioHash = (snapshot) => {
  const { generatedAt, ...rest } = snapshot;
  const text = JSON.stringify(rest);
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
};

/**
 * Builds a personal interview plan from the target role, company, gaps,
 * assessment results and the user's own projects.
 */

import { BEHAVIORAL, CODING_BY_ROLE, COMPANY_QUESTIONS, SYSTEM_DESIGN_BY_ROLE, TECHNICAL } from '../data/interview.js';
import { getSkill, slugify } from '../data/skills.js';

const PROJECT_TEMPLATES = [
  (title) => `Walk me through the architecture of ${title}. Why did you choose that stack?`,
  (title) => `What was the hardest problem you hit building ${title}, and how did you solve it?`,
  (title) => `How would you scale ${title} to 100× the users?`,
  (title) => `If you rebuilt ${title} today, what would you change?`,
];

export const buildInterviewPlan = ({ role, analysis, company, latestAssessments = {}, projectTitles = [] }) => {
  if (!role || !analysis) return null;

  // Focus areas: failed assessments and untested critical gaps. These get
  // flagged on their questions; other gaps are only ordered ahead of strengths.
  const weakAreas = [
    ...Object.values(latestAssessments)
      .filter((a) => a.pct < 70)
      .map((a) => ({ skillId: a.skillId, name: getSkill(a.skillId)?.name || a.skillId, reason: `Assessment ${a.pct}%`, link: `/assessments/${a.skillId}` })),
    ...analysis.gaps
      .filter((g) => g.priority === 'critical' && !latestAssessments[g.skillId])
      .slice(0, 4)
      .map((g) => ({ skillId: g.skillId, name: g.skillName, reason: `Critical gap · ${g.current}% of ${g.required}%`, link: `/gap?skill=${g.skillId}` })),
  ];
  const focusIds = new Set(weakAreas.map((w) => w.skillId));
  const gapIds = new Set(analysis.gaps.filter((g) => g.priority !== 'optional').map((g) => g.skillId));
  const rank = (id) => (focusIds.has(id) ? 2 : gapIds.has(id) ? 1 : 0);

  // Technical: focus areas first, then other gaps, then the rest.
  const roleSkills = [...analysis.items].sort((a, b) => rank(b.skillId) - rank(a.skillId) || b.weight - a.weight);
  const technical = [];
  for (const item of roleSkills) {
    for (const [index, entry] of (TECHNICAL[item.skillId] || []).entries()) {
      technical.push({ id: `tech:${item.skillId}:${index}`, skill: item.skillName, skillId: item.skillId, weak: focusIds.has(item.skillId), ...entry });
    }
    if (technical.length >= 12) break;
  }

  const coding = (CODING_BY_ROLE[role.id] || CODING_BY_ROLE['software-engineer']).map((p) => ({ id: `code:${slugify(p.title)}`, ...p }));
  const systemDesign = (SYSTEM_DESIGN_BY_ROLE[role.id] || SYSTEM_DESIGN_BY_ROLE['software-engineer']).map((question) => ({ id: `sd:${slugify(question)}`, question }));
  if (company && ['google', 'amazon', 'microsoft'].includes(company.id) && SYSTEM_DESIGN_BY_ROLE[role.id]?.some((qn) => /url shortener|rate limiter|news feed/i.test(qn))) {
    systemDesign.push({ id: 'sd:distributed-kv', question: 'Design a distributed key-value store' });
  }

  const behavioral = [
    ...(company ? (COMPANY_QUESTIONS[company.id] || []).map((entry, i) => ({ id: `co:${company.id}:${i}`, company: company.name, ...entry })) : []),
    ...BEHAVIORAL.map((entry, i) => ({ id: `hr:${i}`, ...entry })),
  ];

  const projects = [...new Set(projectTitles.filter(Boolean))].slice(0, 3).flatMap((title) =>
    PROJECT_TEMPLATES.slice(0, 3).map((template, i) => ({ id: `proj:${slugify(title)}:${i}`, project: title, question: template(title) })),
  );

  return { technical, coding, systemDesign, behavioral, projects, weakAreas };
};

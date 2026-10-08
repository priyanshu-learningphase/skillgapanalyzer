/**
 * GitHub portfolio scoring. Pure functions over data fetched by
 * services/githubService.js from GitHub's public REST API.
 */

import { detectTechnologies } from './textSkills.js';
import { getSkill } from '../data/skills.js';
import { IMPORTANCE } from '../data/roles.js';

const LANGUAGE_SKILL = {
  JavaScript: 'javascript',
  TypeScript: 'typescript',
  Python: 'python',
  Java: 'java',
  'C++': 'cpp',
  Go: 'go',
  HTML: 'html',
  CSS: 'css',
  SCSS: 'css',
  Shell: 'bash',
  Dockerfile: 'docker',
  HCL: 'terraform',
  Kotlin: 'android',
  Swift: 'ios',
  Dart: 'flutter',
  'Jupyter Notebook': 'python',
  R: 'r',
  Solidity: 'solidity',
  Vue: 'vue',
  PLpgSQL: 'sql',
  TSQL: 'sql',
};

const BACKEND_SKILLS = new Set(['nodejs', 'express', 'django', 'flask', 'fastapi', 'spring-boot', 'rest-apis', 'sql', 'postgresql', 'mongodb', 'redis', 'graphql', 'authentication', 'go', 'java']);
const TESTING_SIGNAL = /\b(test(s|ing)?|jest|pytest|vitest|mocha|junit|coverage|github actions|ci\/cd|workflow)\b/i;

/** 0–100 heuristic for README quality. */
export const readmeScore = (text) => {
  if (!text) return 0;
  let score = 0;
  if (text.length > 300) score += 25;
  if (text.length > 1200) score += 15;
  const headings = (text.match(/^#{1,3}\s+\S/gm) || []).length;
  if (headings >= 3) score += 20;
  else if (headings >= 1) score += 10;
  if (/(install|setup|getting started|usage|run locally|how to run)/i.test(text)) score += 15;
  if (/!\[[^\]]*\]\(|<img\s|demo|screenshot/i.test(text)) score += 10;
  if (/```/.test(text)) score += 10;
  if (/shields\.io|badge/i.test(text)) score += 5;
  return Math.min(100, score);
};

const daysAgo = (iso, now) => (now - new Date(iso).getTime()) / 86400000;

export const analyzeGithub = ({ user, repos, events = [], readmes = {} }, role, now = Date.now()) => {
  const own = repos.filter((r) => !r.fork);
  const recentRepos = own.filter((r) => daysAgo(r.pushed_at, now) <= 90);
  const commits = events
    .filter((e) => e.type === 'PushEvent' && daysAgo(e.created_at, now) <= 90)
    .reduce((sum, e) => sum + (e.payload?.size ?? e.payload?.commits?.length ?? 1), 0);

  const languageCounts = {};
  for (const repo of own) if (repo.language) languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
  const languages = Object.entries(languageCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count, share: Math.round((count / Math.max(1, own.length)) * 100) }));
  const topics = [...new Set(own.flatMap((r) => r.topics || []))];

  // Skills from languages, topics, descriptions and READMEs.
  const skillCounts = new Map();
  const add = (id, weight = 1) => {
    if (!getSkill(id)) return;
    skillCounts.set(id, (skillCounts.get(id) || 0) + weight);
  };
  for (const [language, count] of Object.entries(languageCounts)) if (LANGUAGE_SKILL[language]) add(LANGUAGE_SKILL[language], count * 2);
  const corpus = [topics.join(' '), ...own.map((r) => r.description || ''), ...Object.values(readmes).filter(Boolean)].join('\n');
  for (const skill of detectTechnologies(corpus)) add(skill.id, skill.count);
  const detectedSkills = [...skillCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id, weight]) => ({ id, name: getSkill(id).name, weight }));
  const detectedIds = new Set(detectedSkills.map((s) => s.id));

  const fetchedReadmes = Object.entries(readmes);
  const readmeScores = fetchedReadmes.map(([name, text]) => ({ name, score: readmeScore(text) }));
  const avgReadme = readmeScores.length ? readmeScores.reduce((s, r) => s + r.score, 0) / readmeScores.length : 0;
  const describedRatio = own.length ? own.filter((r) => r.description).length / own.length : 0;
  const testingRepos = own.filter((r) => TESTING_SIGNAL.test(`${r.description || ''} ${(r.topics || []).join(' ')} ${readmes[r.name] || ''}`)).length;
  const backendRepos = own.filter((r) => {
    const text = `${r.description || ''} ${(r.topics || []).join(' ')} ${readmes[r.name] || ''}`;
    return detectTechnologies(text).some((s) => BACKEND_SKILLS.has(s.id)) || ['Go', 'Java'].includes(r.language);
  }).length;

  let relevance = 0;
  let roleWeight = 0;
  const roleMatches = [];
  const roleMissing = [];
  for (const req of role?.requirements || []) {
    const weight = IMPORTANCE[req.importance]?.weight ?? 2;
    roleWeight += weight;
    const hit = req.skills.find((id) => detectedIds.has(id));
    if (hit) {
      relevance += weight;
      roleMatches.push(getSkill(hit).name);
    } else {
      roleMissing.push({ skillId: req.skills[0], name: getSkill(req.skills[0])?.name || req.skills[0], importance: req.importance });
    }
  }

  const dimensions = [
    { id: 'portfolio', label: 'Portfolio size', max: 15, value: (Math.min(own.length, 8) / 8) * 15, detail: `${own.length} original repositor${own.length === 1 ? 'y' : 'ies'}` },
    { id: 'activity', label: 'Recent activity', max: 20, value: (Math.min(recentRepos.length, 4) / 4) * 12 + (Math.min(commits, 40) / 40) * 8, detail: `${recentRepos.length} repos updated and ${commits} commits pushed in 90 days` },
    { id: 'documentation', label: 'Documentation', max: 20, value: describedRatio * 5 + (avgReadme / 100) * 15, detail: `${Math.round(describedRatio * 100)}% have descriptions · README quality ${Math.round(avgReadme)}/100` },
    { id: 'diversity', label: 'Project diversity', max: 15, value: (Math.min(languages.length, 4) / 4) * 10 + (Math.min(topics.length, 10) / 10) * 5, detail: `${languages.length} languages · ${topics.length} topics` },
    { id: 'relevance', label: 'Role relevance', max: 20, value: roleWeight ? (relevance / roleWeight) * 20 : 0, detail: `${roleMatches.length} of ${(role?.requirements || []).length} role skills visible` },
    { id: 'practices', label: 'Testing & CI', max: 10, value: (Math.min(testingRepos, 3) / 3) * 10, detail: `${testingRepos} repo${testingRepos === 1 ? '' : 's'} mention tests or CI` },
  ].map((d) => ({ ...d, value: Math.round(d.value * 10) / 10, pct: Math.round((d.value / d.max) * 100) }));

  const score = Math.round(dimensions.reduce((s, d) => s + d.value, 0));

  const strengths = [
    ...languages.slice(0, 3).map((l) => l.name),
    ...dimensions.filter((d) => d.pct >= 70).map((d) => d.label),
  ];
  const needsWork = dimensions.filter((d) => d.pct < 50).map((d) => ({ label: d.label, detail: d.detail }));
  const isServerRole = role && ['backend-developer', 'fullstack-developer', 'software-engineer'].includes(role.id);
  if (isServerRole && backendRepos === 0) needsWork.unshift({ label: 'Backend projects', detail: 'No repositories show API, database or server work.' });

  return {
    username: user.login,
    profile: {
      name: user.name || user.login,
      avatarUrl: user.avatar_url,
      url: user.html_url,
      bio: user.bio || '',
      publicRepos: user.public_repos,
      followers: user.followers,
      createdAt: user.created_at,
    },
    score,
    dimensions,
    languages: languages.slice(0, 8),
    topics: topics.slice(0, 15),
    detectedSkills: detectedSkills.slice(0, 20),
    strengths: [...new Set(strengths)].slice(0, 6),
    needsWork: needsWork.slice(0, 5),
    roleMatches,
    roleMissing,
    repos: own
      .slice()
      .sort((a, b) => b.stargazers_count - a.stargazers_count || new Date(b.pushed_at) - new Date(a.pushed_at))
      .slice(0, 8)
      .map((r) => ({
        name: r.name,
        url: r.html_url,
        description: r.description || '',
        language: r.language,
        stars: r.stargazers_count,
        pushedAt: r.pushed_at,
        readme: readmeScores.find((x) => x.name === r.name)?.score ?? null,
      })),
    forks: repos.length - own.length,
  };
};

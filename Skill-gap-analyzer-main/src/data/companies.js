/**
 * Target companies
 *
 * Each profile describes the *typical* emphasis of a company's hiring bar,
 * based on publicly discussed interview formats. These are heuristics, not
 * official requirements, and the UI says so.
 *
 * - raise / lower: adjust the target level of skills the role already needs
 * - add: extra requirements, only for roles in the listed tracks
 * - cloudLabel: how "Cloud Platforms" should read for that company
 */

export const COMPANIES = [
  {
    id: 'google',
    name: 'Google',
    type: 'Big Tech',
    focus: 'Algorithms, data structures and large-scale system design.',
    raise: { dsa: 90, algorithms: 90, 'system-design': 75, testing: 65 },
    add: [{ skill: 'distributed-systems', level: 55, importance: 'medium', tracks: ['Engineering', 'Infrastructure'] }],
    interview: ['Do 2 timed 45-minute algorithm rounds without an IDE', 'Prepare stories about ambiguity and collaboration'],
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    type: 'Big Tech',
    focus: 'Problem solving, design and Azure cloud fluency.',
    cloudLabel: 'Azure',
    raise: { dsa: 85, algorithms: 80, 'system-design': 70, cloud: 65 },
    add: [
      { skill: 'cloud', level: 55, importance: 'medium', tracks: ['Engineering', 'Data & AI'] },
      { skill: 'distributed-systems', level: 50, importance: 'low', tracks: ['Engineering', 'Infrastructure'] },
    ],
    interview: ['Practise explaining a design end to end on a whiteboard', 'Prepare stories that show a growth mindset'],
  },
  {
    id: 'amazon',
    name: 'Amazon',
    type: 'Big Tech',
    focus: 'DSA, system design at scale and the Leadership Principles.',
    cloudLabel: 'AWS',
    raise: { dsa: 85, algorithms: 85, 'system-design': 75, cloud: 65 },
    add: [
      { skill: 'cloud', level: 55, importance: 'medium', tracks: ['Engineering', 'Data & AI'] },
      { skill: 'distributed-systems', level: 50, importance: 'low', tracks: ['Engineering', 'Infrastructure'] },
    ],
    interview: ['Write 2 STAR stories for each of 6 Leadership Principles', 'Practise a scalable design with AWS building blocks'],
  },
  {
    id: 'jpmorgan',
    name: 'JPMorgan Chase',
    type: 'Finance',
    focus: 'Strong fundamentals, SQL, testing and secure, reliable code.',
    raise: { sql: 80, testing: 70, java: 80, 'security-fundamentals': 55 },
    add: [
      { skill: 'sql', level: 65, importance: 'medium', tracks: ['Engineering', 'Data & AI'] },
      { skill: 'security-fundamentals', level: 45, importance: 'low', tracks: ['Engineering'] },
    ],
    interview: ['Practise HackerRank-style timed assessments', 'Prepare to discuss reliability and risk in your projects'],
  },
  {
    id: 'atlassian',
    name: 'Atlassian',
    type: 'Product',
    focus: 'Code design, testing, system design and values alignment.',
    raise: { 'system-design': 70, testing: 70, oop: 75, typescript: 75, react: 85 },
    add: [{ skill: 'testing', level: 60, importance: 'medium', tracks: ['Engineering'] }],
    interview: ['Practise a code design round: extend a small codebase cleanly', 'Prepare stories that map to the company values'],
  },
  {
    id: 'startup',
    name: 'Startup',
    type: 'Startup',
    focus: 'Breadth, shipping speed and owning features end to end.',
    raise: { docker: 65, cloud: 60, 'ci-cd': 60 },
    lower: { dsa: 70, algorithms: 65 },
    add: [
      { skill: 'docker', level: 55, importance: 'medium', tracks: ['Engineering', 'Data & AI'] },
      { skill: 'ci-cd', level: 50, importance: 'low', tracks: ['Engineering'] },
    ],
    interview: ['Prepare a take-home style project you can demo', 'Prepare stories about shipping fast and owning outcomes'],
  },
];

export const COMPANY_MAP = Object.fromEntries(COMPANIES.map((c) => [c.id, c]));

/** The stored company on a profile: { id, name }. `custom` uses general expectations. */
export const companyProfile = (company) => (company?.id ? COMPANY_MAP[company.id] || null : null);

export const companyName = (company) => company?.name || COMPANY_MAP[company?.id]?.name || null;

/**
 * Adjust a role's requirements for a target company. Returns the role
 * unchanged when there's no company or it's a custom one.
 */
export const applyCompany = (role, company) => {
  if (!role) return role;
  const name = companyName(company);
  const profile = companyProfile(company);
  if (!profile) return name ? { ...role, company: { id: company.id, name } } : role;

  const requirements = role.requirements.map((req) => {
    if (req.skills.length !== 1) return req;
    const id = req.skills[0];
    let level = req.level;
    if (profile.raise?.[id] > level) level = profile.raise[id];
    if (profile.lower?.[id] != null && profile.lower[id] < level) level = profile.lower[id];
    const label = id === 'cloud' && profile.cloudLabel ? `Cloud (${profile.cloudLabel})` : req.label;
    if (level === req.level && label === req.label) return req;
    return { ...req, level, label, baseLevel: req.level, companyAdjusted: level !== req.level ? profile.name : undefined };
  });

  for (const extra of profile.add || []) {
    if (!extra.tracks.includes(role.track)) continue;
    if (requirements.some((r) => r.skills.includes(extra.skill))) continue;
    requirements.push({
      key: extra.skill,
      skills: [extra.skill],
      level: extra.level,
      importance: extra.importance,
      label: extra.skill === 'cloud' && profile.cloudLabel ? `Cloud (${profile.cloudLabel})` : undefined,
      companyAdded: profile.name,
    });
  }

  return {
    ...role,
    requirements,
    company: { id: profile.id, name: profile.name },
    interview: [...(role.interview || []), ...(profile.interview || [])],
  };
};

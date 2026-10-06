/**
 * Career roles
 *
 * Each requirement names the skill(s) a role needs, the level (0–100) a
 * job-ready candidate typically has, and how important it is. A requirement
 * with several skills is satisfied by whichever one the user is strongest in
 * (e.g. "Primary language: C++, Java, Python or Go").
 */

import { getSkill } from './skills.js';

export const IMPORTANCE = {
  critical: { label: 'Critical', weight: 4 },
  high: { label: 'High', weight: 3 },
  medium: { label: 'Medium', weight: 2 },
  low: { label: 'Low', weight: 1 },
};

const req = (skill, level, importance) => ({ key: skill, skills: [skill], level, importance });
const anyOf = (key, label, skills, level, importance) => ({ key, label, skills, level, importance });

export const ROLES = [
  {
    id: 'software-engineer',
    name: 'Software Engineer',
    track: 'Engineering',
    tagline: 'Design, build and ship reliable software.',
    description: 'Generalist engineers who write production code, reason about performance and pass rigorous technical interviews.',
    requirements: [
      anyOf('primary-language', 'Primary language', ['cpp', 'java', 'python', 'go', 'javascript'], 80, 'critical'),
      req('dsa', 85, 'critical'),
      req('algorithms', 80, 'critical'),
      req('oop', 70, 'high'),
      req('git', 75, 'high'),
      req('system-design', 65, 'high'),
      req('sql', 65, 'medium'),
      req('rest-apis', 60, 'medium'),
      req('testing', 60, 'medium'),
      req('operating-systems', 55, 'medium'),
      req('networking', 50, 'low'),
      req('linux', 50, 'low'),
    ],
    capstone: {
      title: 'Capstone: production-grade service',
      description: 'Build and deploy a URL shortener with analytics, tests, CI and a design write-up you can walk through in interviews.',
      tasks: ['Write a one-page design doc', 'Implement the core service with tests', 'Add CI and deploy it', 'Write a README with trade-offs and metrics'],
    },
    interview: ['Solve 30 mixed medium problems under time limits', 'Do 2 mock coding interviews', 'Practise 2 system design walkthroughs', 'Prepare 5 STAR stories for behavioural rounds', 'Tailor your resume to the role'],
  },
  {
    id: 'backend-developer',
    name: 'Backend Developer',
    track: 'Engineering',
    tagline: 'Build the APIs, data and services behind products.',
    description: 'Backend engineers design APIs, model data, keep services secure and make them scale.',
    requirements: [
      anyOf('server-runtime', 'Server language', ['nodejs', 'python', 'java', 'go'], 80, 'critical'),
      anyOf('backend-framework', 'Backend framework', ['express', 'fastapi', 'django', 'flask', 'spring-boot'], 75, 'critical'),
      req('rest-apis', 80, 'critical'),
      req('sql', 75, 'critical'),
      req('authentication', 70, 'high'),
      req('git', 75, 'high'),
      req('system-design', 65, 'high'),
      req('docker', 60, 'medium'),
      req('redis', 55, 'medium'),
      req('mongodb', 50, 'medium'),
      req('testing', 60, 'medium'),
      req('linux', 50, 'low'),
      req('cloud', 45, 'low'),
      req('graphql', 40, 'low'),
    ],
    capstone: {
      title: 'Capstone: production-ready API',
      description: 'Ship a REST API with authentication, a relational database, caching, tests, Docker and a deployed environment.',
      tasks: ['Design the schema and API contract', 'Implement auth, CRUD and pagination', 'Add caching, rate limiting and tests', 'Containerise and deploy with CI'],
    },
    interview: ['Practise 20 backend and SQL interview questions', 'Walk through 2 system designs out loud', 'Solve 20 medium DSA problems', 'Prepare to explain your capstone end-to-end', 'Prepare 5 STAR stories'],
  },
  {
    id: 'frontend-developer',
    name: 'Frontend Developer',
    track: 'Engineering',
    tagline: 'Craft fast, accessible user interfaces.',
    description: 'Frontend engineers turn designs into interfaces that are fast, accessible and pleasant to use.',
    requirements: [
      req('html', 85, 'critical'),
      req('css', 80, 'critical'),
      req('javascript', 85, 'critical'),
      anyOf('ui-framework', 'UI framework', ['react', 'vue', 'angular'], 80, 'critical'),
      req('typescript', 70, 'high'),
      req('responsive-design', 75, 'high'),
      req('git', 75, 'high'),
      req('state-management', 60, 'medium'),
      req('rest-apis', 55, 'medium'),
      req('accessibility', 55, 'medium'),
      req('nextjs', 55, 'medium'),
      req('tailwind', 55, 'medium'),
      req('testing', 50, 'medium'),
      req('build-tools', 45, 'low'),
    ],
    capstone: {
      title: 'Capstone: polished web app',
      description: 'Build a responsive, accessible app that consumes a real API, with routing, state, tests and a Lighthouse score above 90.',
      tasks: ['Design the screens and component tree', 'Build the app with routing and state', 'Add tests and an accessibility pass', 'Deploy and measure performance'],
    },
    interview: ['Practise 25 JavaScript and React interview questions', 'Build 3 UI components under time limits', 'Solve 15 easy/medium DSA problems', 'Prepare a portfolio walkthrough', 'Prepare 5 STAR stories'],
  },
  {
    id: 'fullstack-developer',
    name: 'Full Stack Developer',
    track: 'Engineering',
    tagline: 'Own features end-to-end, from UI to database.',
    description: 'Full stack engineers ship complete features across frontend, backend and infrastructure.',
    requirements: [
      req('javascript', 85, 'critical'),
      anyOf('ui-framework', 'UI framework', ['react', 'vue', 'angular'], 75, 'critical'),
      req('nodejs', 75, 'critical'),
      req('rest-apis', 75, 'critical'),
      req('html', 75, 'high'),
      req('css', 70, 'high'),
      anyOf('backend-framework', 'Backend framework', ['express', 'fastapi', 'django', 'spring-boot'], 70, 'high'),
      req('sql', 70, 'high'),
      req('authentication', 65, 'high'),
      req('git', 75, 'high'),
      req('typescript', 65, 'medium'),
      req('mongodb', 50, 'medium'),
      req('docker', 55, 'medium'),
      req('testing', 55, 'medium'),
      req('system-design', 50, 'medium'),
      req('cloud', 45, 'low'),
    ],
    capstone: {
      title: 'Capstone: full-stack product',
      description: 'Ship a full-stack app with auth, a database, a polished UI, tests and a CI/CD deployment.',
      tasks: ['Scope the product and data model', 'Build the API and database layer', 'Build the UI and integrate the API', 'Add tests, CI and deploy'],
    },
    interview: ['Practise 25 frontend + backend interview questions', 'Walk through 1 system design', 'Solve 20 medium DSA problems', 'Prepare a demo of your capstone', 'Prepare 5 STAR stories'],
  },
  {
    id: 'data-scientist',
    name: 'Data Scientist',
    track: 'Data & AI',
    tagline: 'Turn data into decisions with statistics and ML.',
    description: 'Data scientists frame questions, analyse data, build models and communicate what they mean.',
    requirements: [
      req('python', 85, 'critical'),
      req('statistics', 85, 'critical'),
      req('pandas', 80, 'critical'),
      req('machine-learning', 80, 'critical'),
      req('math', 70, 'high'),
      req('numpy', 75, 'high'),
      req('sql', 70, 'high'),
      req('data-visualization', 75, 'high'),
      req('data-cleaning', 75, 'high'),
      req('scikit-learn', 75, 'high'),
      req('ab-testing', 60, 'medium'),
      req('deep-learning', 50, 'medium'),
      req('git', 55, 'medium'),
      req('r', 40, 'low'),
    ],
    capstone: {
      title: 'Capstone: end-to-end analysis',
      description: 'Take a real dataset from question to recommendation: cleaning, analysis, a model, and a written report with visuals.',
      tasks: ['Frame the business question', 'Clean and explore the data', 'Build and evaluate a model', 'Publish a report with clear recommendations'],
    },
    interview: ['Practise 20 statistics and probability questions', 'Solve 20 SQL interview problems', 'Prepare 2 product/case-study answers', 'Explain your capstone in 5 minutes', 'Prepare 5 STAR stories'],
  },
  {
    id: 'ml-engineer',
    name: 'ML Engineer',
    track: 'Data & AI',
    tagline: 'Build, deploy and scale machine learning systems.',
    description: 'ML engineers train models and own the systems that serve, monitor and improve them in production.',
    legacyIds: ['ai-ml-engineer'],
    legacyNames: ['AI/ML Engineer'],
    requirements: [
      req('python', 85, 'critical'),
      req('machine-learning', 85, 'critical'),
      req('deep-learning', 80, 'critical'),
      req('pytorch', 75, 'critical'),
      req('math', 75, 'high'),
      req('statistics', 70, 'high'),
      req('numpy', 75, 'high'),
      req('pandas', 70, 'high'),
      req('scikit-learn', 70, 'high'),
      req('mlops', 65, 'high'),
      req('nlp', 55, 'medium'),
      req('llms', 55, 'medium'),
      req('computer-vision', 50, 'medium'),
      req('docker', 55, 'medium'),
      req('sql', 55, 'medium'),
      req('git', 65, 'medium'),
      req('dsa', 55, 'medium'),
    ],
    capstone: {
      title: 'Capstone: model in production',
      description: 'Train a model, serve it behind an API, monitor it for drift and automate retraining.',
      tasks: ['Train and track experiments', 'Package and serve the model', 'Add monitoring and alerts', 'Automate retraining in CI'],
    },
    interview: ['Practise 25 ML theory questions', 'Walk through 2 ML system designs', 'Solve 20 medium DSA problems', 'Explain your capstone trade-offs', 'Prepare 5 STAR stories'],
  },
  {
    id: 'devops-engineer',
    name: 'DevOps Engineer',
    track: 'Infrastructure',
    tagline: 'Automate delivery and keep systems running.',
    description: 'DevOps engineers build the pipelines, platforms and observability that let teams ship safely.',
    requirements: [
      req('linux', 85, 'critical'),
      req('docker', 80, 'critical'),
      req('kubernetes', 75, 'critical'),
      req('ci-cd', 80, 'critical'),
      req('cloud', 75, 'critical'),
      req('git', 80, 'high'),
      req('bash', 75, 'high'),
      req('networking', 70, 'high'),
      req('terraform', 65, 'high'),
      req('monitoring', 65, 'high'),
      req('python', 55, 'medium'),
      req('security-fundamentals', 55, 'medium'),
      req('ansible', 45, 'low'),
    ],
    capstone: {
      title: 'Capstone: automated platform',
      description: 'Provision infrastructure with Terraform, deploy a service to Kubernetes through CI/CD and add dashboards and alerts.',
      tasks: ['Provision infrastructure as code', 'Build the CI/CD pipeline', 'Deploy to Kubernetes', 'Add monitoring, alerts and a runbook'],
    },
    interview: ['Practise 25 Linux, networking and cloud questions', 'Troubleshoot 3 broken environments', 'Walk through your capstone architecture', 'Prepare 5 STAR stories about incidents'],
  },
  {
    id: 'cybersecurity-engineer',
    name: 'Cybersecurity Engineer',
    track: 'Security',
    tagline: 'Protect systems, data and people from attacks.',
    description: 'Security engineers find weaknesses, harden systems and detect and respond to threats.',
    requirements: [
      req('networking', 85, 'critical'),
      req('linux', 80, 'critical'),
      req('security-fundamentals', 85, 'critical'),
      req('network-security', 75, 'critical'),
      req('web-security', 75, 'high'),
      req('bash', 65, 'high'),
      req('python', 65, 'high'),
      req('pentesting', 60, 'high'),
      req('incident-response', 65, 'high'),
      req('cryptography', 60, 'medium'),
      req('cloud-security', 50, 'medium'),
      req('cloud', 45, 'low'),
    ],
    capstone: {
      title: 'Capstone: security home lab',
      description: 'Build a lab, attack it, detect the attacks and write both a pentest report and detection rules.',
      tasks: ['Build a segmented home lab', 'Run and document attacks', 'Write detections for each attack', 'Publish a report with remediations'],
    },
    interview: ['Practise 25 security fundamentals questions', 'Walk through 2 incident scenarios', 'Complete 3 timed CTF challenges', 'Prepare 5 STAR stories'],
  },
  {
    id: 'data-analyst',
    name: 'Data Analyst',
    track: 'Data & AI',
    tagline: 'Answer business questions with data.',
    description: 'Analysts query, clean and visualise data, and turn it into recommendations stakeholders act on.',
    requirements: [
      req('sql', 85, 'critical'),
      req('excel', 80, 'critical'),
      req('data-visualization', 80, 'critical'),
      req('statistics', 75, 'critical'),
      req('python', 75, 'high'),
      req('pandas', 75, 'high'),
      req('data-cleaning', 75, 'high'),
      req('bi-tools', 70, 'high'),
      req('ab-testing', 55, 'medium'),
      req('numpy', 50, 'medium'),
      req('google-analytics', 40, 'low'),
      req('r', 35, 'low'),
    ],
    capstone: {
      title: 'Capstone: business dashboard',
      description: 'Build a KPI dashboard from raw data, with a written analysis and recommendations for stakeholders.',
      tasks: ['Define KPIs with a stakeholder brief', 'Model and clean the data in SQL', 'Build the dashboard', 'Write a one-page insights memo'],
    },
    interview: ['Solve 25 SQL interview problems', 'Practise 2 case-study presentations', 'Review 15 statistics questions', 'Prepare 5 STAR stories'],
  },
  {
    id: 'data-engineer',
    name: 'Data Engineer',
    track: 'Data & AI',
    tagline: 'Build the pipelines and platforms data runs on.',
    description: 'Data engineers build reliable pipelines, warehouses and tooling for analytics and ML.',
    requirements: [
      req('python', 80, 'critical'),
      req('sql', 85, 'critical'),
      req('etl', 80, 'critical'),
      req('data-warehousing', 70, 'high'),
      req('spark', 70, 'high'),
      req('airflow', 60, 'high'),
      req('cloud', 60, 'medium'),
      req('docker', 55, 'medium'),
      req('linux', 55, 'medium'),
      req('git', 65, 'medium'),
      req('dsa', 50, 'medium'),
      req('mongodb', 45, 'low'),
    ],
    capstone: {
      title: 'Capstone: data platform',
      description: 'Build an orchestrated pipeline that ingests, transforms and serves data from a warehouse with tests.',
      tasks: ['Design the data model', 'Build ingestion and transformations', 'Orchestrate and add data tests', 'Document and deploy the pipeline'],
    },
    interview: ['Solve 25 SQL problems including window functions', 'Walk through 2 data pipeline designs', 'Solve 15 medium DSA problems', 'Prepare 5 STAR stories'],
  },
  {
    id: 'mobile-developer',
    name: 'Mobile Developer',
    track: 'Engineering',
    tagline: 'Build apps people carry everywhere.',
    description: 'Mobile engineers build performant iOS and Android apps and ship them through the stores.',
    requirements: [
      anyOf('mobile-framework', 'Mobile framework', ['react-native', 'flutter', 'android', 'ios'], 80, 'critical'),
      req('git', 75, 'high'),
      req('rest-apis', 65, 'high'),
      req('state-management', 60, 'medium'),
      req('firebase', 55, 'medium'),
      req('ui-ux', 55, 'medium'),
      req('app-deployment', 55, 'medium'),
      req('testing', 45, 'medium'),
      req('typescript', 45, 'low'),
    ],
    capstone: {
      title: 'Capstone: published app',
      description: 'Design, build and publish an app with offline support, authentication and analytics.',
      tasks: ['Design the app flows', 'Build core screens and data layer', 'Add auth, offline support and tests', 'Publish to a test track'],
    },
    interview: ['Practise 25 mobile platform questions', 'Build 2 screens under time limits', 'Solve 15 DSA problems', 'Prepare an app demo', 'Prepare 5 STAR stories'],
  },
  {
    id: 'cloud-engineer',
    name: 'Cloud Engineer',
    track: 'Infrastructure',
    tagline: 'Design and run secure cloud infrastructure.',
    description: 'Cloud engineers design, automate and secure infrastructure on AWS, GCP or Azure.',
    requirements: [
      req('cloud', 85, 'critical'),
      req('linux', 80, 'critical'),
      req('networking', 80, 'critical'),
      req('terraform', 75, 'critical'),
      req('docker', 70, 'high'),
      req('cloud-security', 70, 'high'),
      req('kubernetes', 60, 'medium'),
      req('bash', 60, 'medium'),
      req('ci-cd', 60, 'medium'),
      req('serverless', 55, 'medium'),
      req('monitoring', 55, 'medium'),
      req('sql', 50, 'medium'),
    ],
    capstone: {
      title: 'Capstone: cloud architecture',
      description: 'Design and deploy a highly available, secure architecture entirely as code, with cost and security reviews.',
      tasks: ['Draw the target architecture', 'Provision it with Terraform', 'Apply security controls and monitoring', 'Write a cost and resilience review'],
    },
    interview: ['Practise 25 cloud and networking questions', 'Walk through 2 architecture designs', 'Prepare to explain your capstone', 'Prepare 5 STAR stories'],
  },
];

export const ROLE_MAP = Object.fromEntries(ROLES.map((role) => [role.id, role]));

export const ROLE_TRACKS = ['Engineering', 'Data & AI', 'Infrastructure', 'Security'];

/** Roles featured first in onboarding, in the order product asked for. */
export const FEATURED_ROLE_IDS = [
  'software-engineer',
  'backend-developer',
  'frontend-developer',
  'fullstack-developer',
  'data-scientist',
  'ml-engineer',
  'devops-engineer',
  'cybersecurity-engineer',
];

/** Map ids/names from the original app (e.g. "ai-ml-engineer") to current roles. */
export const resolveLegacyRoleId = (idOrName) => {
  if (!idOrName) return null;
  if (ROLE_MAP[idOrName]) return idOrName;
  const match = ROLES.find(
    (role) =>
      role.legacyIds?.includes(idOrName) ||
      role.legacyNames?.includes(idOrName) ||
      role.name.toLowerCase() === String(idOrName).toLowerCase(),
  );
  return match?.id || null;
};

/**
 * Build a role object for a user-defined career. The user picks the skills;
 * we assign sensible target levels and importance.
 */
export const buildCustomRole = (custom) => {
  if (!custom?.name || !custom?.skills?.length) return null;
  return {
    id: 'custom',
    custom: true,
    name: custom.name,
    track: 'Custom',
    tagline: 'Your custom career path.',
    description: `A custom path toward ${custom.name}, built from the skills you selected.`,
    requirements: custom.skills.map((entry, index) => ({
      key: entry.id,
      skills: [entry.id],
      skillNames: { [entry.id]: entry.name },
      level: entry.level ?? 75,
      importance: entry.importance || (index < 3 ? 'critical' : index < 7 ? 'high' : 'medium'),
    })),
    capstone: {
      title: 'Capstone project',
      description: `Build a portfolio project that demonstrates the core skills of a ${custom.name}.`,
      tasks: ['Scope the project', 'Build the core', 'Polish and document', 'Share it publicly'],
    },
    interview: ['Research common interview questions for the role', 'Do 2 mock interviews', 'Prepare 5 STAR stories'],
  };
};

/** Resolve the role for a profile, including custom roles. */
export const resolveRole = (profile) => {
  if (!profile?.targetRoleId) return null;
  if (profile.targetRoleId === 'custom') return buildCustomRole(profile.customRole);
  return ROLE_MAP[profile.targetRoleId] || null;
};

/** Human label for a requirement, e.g. "Primary language" or "SQL". */
export const requirementLabel = (requirement) =>
  requirement.label ||
  requirement.skillNames?.[requirement.skills[0]] ||
  getSkill(requirement.skills[0])?.name ||
  requirement.skills[0];

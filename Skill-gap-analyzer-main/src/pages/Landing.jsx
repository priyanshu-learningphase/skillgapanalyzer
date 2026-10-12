/**
 * Landing page
 */

import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Target,
  ScanSearch,
  Route,
  Gauge,
  RefreshCw,
  FileText,
  Github,
  Briefcase,
  GraduationCap,
  Shuffle,
  MessagesSquare,
  FolderGit2,
  BadgeCheck,
} from 'lucide-react';
import Logo from '../components/layout/Logo';
import Button from '../components/ui/Button';
import ProductPreview from '../components/landing/ProductPreview';
import DependencyChain from '../components/landing/DependencyChain';
import { ROLES } from '../data/roles';
import { SKILLS, getSkill } from '../data/skills';
import { useAuth } from '../context/AuthContext';
import { useStartPath } from '../hooks/useStartPath';

const STEPS = [
  { icon: Target, title: 'Set your goal', body: 'Pick a role and, optionally, a target company.' },
  { icon: FileText, title: 'Bring your evidence', body: 'Your skills, resume and GitHub — we read them all.' },
  { icon: ScanSearch, title: 'See your exact gaps', body: 'A readiness score and gaps ranked by what matters.' },
  { icon: Route, title: 'Follow your roadmap', body: 'Learn → Practice → Build → Assess, week by week.' },
  { icon: BadgeCheck, title: 'Prove you’re ready', body: 'Assessments, projects and interview prep move your score.' },
];

const FEATURES = [
  { icon: Gauge, title: 'Career readiness score', body: 'A score out of 100 against what the role requires — and what’s keeping you from 90.' },
  { icon: FileText, title: 'Resume analyzer', body: 'Upload a PDF. See detected skills, weak sections and missing keywords for your target role.' },
  { icon: Briefcase, title: 'Job description match', body: 'Paste a real job post, get your match and a roadmap aimed at exactly that job.' },
  { icon: Github, title: 'GitHub analyzer', body: 'A portfolio score from your public repos, with the projects you should build next.' },
  { icon: RefreshCw, title: 'Adaptive roadmap', body: 'Fail an assessment and fundamentals come back; ace it and beginner content is skipped.' },
  { icon: GraduationCap, title: 'Skill assessments', body: 'Short, auto-graded checks that turn self-ratings into evidence.' },
  { icon: FolderGit2, title: 'Project recommendations', body: 'Portfolio projects ranked by the gaps they close, with GitHub-ready structure.' },
  { icon: Shuffle, title: 'Career simulator', body: 'Compare the same role at Google, Amazon or a startup — match and prep time.' },
  { icon: MessagesSquare, title: 'Interview prep', body: 'Questions built from your role, company, weak areas and your own projects.' },
];

const Landing = () => {
  const { currentUser, isLocalMode } = useAuth();
  const startPath = useStartPath();
  const appEntry = currentUser ? '/dashboard' : '/login';

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <header className="sticky top-0 z-30 border-b border-line/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-5 text-[13px] text-muted md:flex" aria-label="Sections">
            <a href="#how" className="hover:text-ink">How it works</a>
            <a href="#roadmaps" className="hover:text-ink">Roadmaps</a>
            <a href="#careers" className="hover:text-ink">Career paths</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" to={appEntry} className="hidden sm:inline-flex">
              {currentUser || isLocalMode ? 'Open app' : 'Sign in'}
            </Button>
            <Button size="sm" to={startPath}>
              Analyze my skills
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="bg-grid absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-24 lg:pt-20">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1 text-xs font-medium text-muted shadow-card">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
              Career readiness · Roadmaps · Assessments
            </p>
            <h1 className="text-4xl font-semibold leading-[1.08] tracking-[-0.03em] text-ink sm:text-5xl lg:text-[3.4rem]">
              Know what you’re missing.
              <br />
              <span className="text-muted">Know what to learn next.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              Bring your skills, resume and GitHub. See exactly what your target role needs, follow a week-by-week roadmap, and prove you’re ready.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" to={startPath} iconRight={ArrowRight}>
                Analyze My Skills
              </Button>
              <Button size="lg" variant="secondary" onClick={() => document.getElementById('careers')?.scrollIntoView({ behavior: 'smooth' })}>
                Explore Career Paths
              </Button>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-line pt-6">
              <div>
                <dt className="text-xs text-muted">Career paths</dt>
                <dd className="mt-1 text-xl font-semibold text-ink">{ROLES.length}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Skills mapped</dt>
                <dd className="mt-1 text-xl font-semibold text-ink">{SKILLS.length}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Setup time</dt>
                <dd className="mt-1 text-xl font-semibold text-ink">~3 min</dd>
              </div>
            </dl>
          </div>
          <ProductPreview />
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-16 border-b border-line bg-canvas">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-2 max-w-xl text-2xl font-semibold tracking-tight sm:text-3xl">From “I want to become…” to proof that you’re ready.</h2>
          <ol className="mt-10 grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map((step, index) => (
              <li key={step.title} className="bg-white p-6">
                <div className="flex items-center justify-between">
                  <step.icon className="h-5 w-5 text-ink" aria-hidden />
                  <span className="tabular text-xs font-medium text-muted-light">0{index + 1}</span>
                </div>
                <h3 className="mt-6 text-[15px] font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-sm text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Roadmaps */}
      <section id="roadmaps" className="scroll-mt-16 border-b border-line">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:gap-20">
          <div>
            <p className="eyebrow">Personalized roadmaps</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Built around what you already know.</h2>
            <p className="mt-4 text-muted">
              Your roadmap is generated from your gaps, their priority and the prerequisites between skills. Topics you already know are
              skipped, effort is sized to your gap, and the schedule fits the time you actually have.
            </p>
            <ul className="mt-8 space-y-4 text-sm">
              {[
                ['Dependency-aware', 'Every skill comes after its prerequisites.'],
                ['Sized to your time', '30 minutes a day or three hours — the plan adapts to both.'],
                ['Adaptive', 'Complete a check-in and the roadmap recalculates what’s left.'],
              ].map(([title, body]) => (
                <li key={title} className="flex gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                  <span>
                    <span className="font-medium text-ink">{title}.</span> <span className="text-muted">{body}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <DependencyChain />
        </div>
      </section>

      {/* Features */}
      <section className="border-b border-line bg-canvas">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title}>
                <feature.icon className="h-5 w-5 text-ink" aria-hidden />
                <h3 className="mt-4 text-[15px] font-semibold">{feature.title}</h3>
                <p className="mt-1.5 text-sm text-muted">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Career paths */}
      <section id="careers" className="scroll-mt-16 border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow">Career paths</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Pick a destination.</h2>
              <p className="mt-2 max-w-lg text-muted">Each path lists the skills employers expect and the level they expect them at.</p>
            </div>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ROLES.map((role) => (
              <CareerCard key={role.id} role={role} />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-canvas">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="card flex flex-col items-start justify-between gap-6 p-8 sm:flex-row sm:items-center sm:p-10">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Find out where you stand.</h2>
              <p className="mt-1.5 text-muted">Five quick questions. A readiness score, your gaps and a roadmap at the end.</p>
            </div>
            <Button size="lg" to={startPath} iconRight={ArrowRight}>
              Analyze My Skills
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Logo />
          <div className="flex gap-5">
            <a href="#how" className="hover:text-ink">How it works</a>
            <a href="#careers" className="hover:text-ink">Career paths</a>
            <Link to={appEntry} className="hover:text-ink">
              {currentUser ? 'Open app' : 'Sign in'}
            </Link>
          </div>
          <p className="text-xs">© {new Date().getFullYear()} SkillGap</p>
        </div>
      </footer>
    </div>
  );
};

const CareerCard = ({ role }) => {
  const startPath = useStartPath(role.id);
  const core = role.requirements.filter((r) => r.importance === 'critical').slice(0, 4);
  return (
    <Link to={startPath} className="card-interactive group flex flex-col p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">{role.track}</span>
        <ArrowRight className="h-4 w-4 text-muted-light transition-transform group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden />
      </div>
      <h3 className="mt-3 text-[15px] font-semibold">{role.name}</h3>
      <p className="mt-1 text-sm text-muted">{role.tagline}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {core.map((req) => (
          <span key={req.key} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">
            {req.label || getSkill(req.skills[0])?.name}
          </span>
        ))}
      </div>
      <span className="mt-4 text-[13px] font-medium text-ink">Analyze for this role</span>
    </Link>
  );
};

export default Landing;

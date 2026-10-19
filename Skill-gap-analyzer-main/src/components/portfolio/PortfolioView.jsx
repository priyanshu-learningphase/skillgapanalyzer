import { ShieldCheck, ClipboardCheck, FolderGit2, Github, Flag, Award, Link2, Linkedin, Globe, Mail, ExternalLink } from 'lucide-react';
import ScoreRing from '../ui/ScoreRing';
import ProgressBar from '../ui/ProgressBar';
import EvidenceBadge from '../skills/EvidenceBadge';

const fmt = (date) => (date ? new Date(`${date.length === 7 ? `${date}-01` : date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '');

const Section = ({ icon: Icon, title, level, children }) => {
  const Heading = `h${level + 1}`;
  return (
    <section className="border-t border-line px-6 py-5 sm:px-8">
      <Heading className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Icon className="h-4 w-4 text-muted" aria-hidden /> {title}
      </Heading>
      <div className="mt-3">{children}</div>
    </section>
  );
};

const CONTACT = { linkedin: [Linkedin, 'LinkedIn'], github: [Github, 'GitHub'], website: [Globe, 'Website'], email: [Mail, 'Email'] };

const NameHeading = ({ level, children }) => {
  const Heading = `h${level}`;
  return <Heading className="text-2xl font-semibold tracking-tight text-ink">{children}</Heading>;
};

/**
 * The public portfolio. Used for the editor preview and the public page;
 * `level` sets the heading level so the preview nests under its page's h1.
 */
const PortfolioView = ({ data, level = 1 }) => (
  <article className="overflow-hidden rounded-card border border-line bg-white shadow-card" aria-label={`${data.displayName || 'Portfolio'} career portfolio`}>
    <header className="flex flex-col gap-5 px-6 py-6 sm:flex-row sm:items-center sm:px-8">
      <div className="min-w-0 flex-1">
        <NameHeading level={level}>{data.displayName || 'Your name'}</NameHeading>
        {data.headline && <p className="mt-1 text-sm text-ink-soft">{data.headline}</p>}
        {data.bio && <p className="mt-3 whitespace-pre-line text-sm text-muted">{data.bio}</p>}
      </div>
      {data.role && (
        <div className="flex items-center gap-4 rounded-lg border border-line p-3">
          <ScoreRing value={data.role.readiness} size={76} stroke={7} label={`Readiness ${data.role.readiness} out of 100`}>
            <span className="text-lg font-semibold text-ink">{data.role.readiness}</span>
          </ScoreRing>
          <div className="text-sm">
            <p className="text-xs text-muted">Readiness for</p>
            <p className="font-semibold text-ink">{data.role.name}</p>
            {data.role.company && <p className="text-xs text-muted">at {data.role.company}</p>}
            <p className="text-xs text-muted">
              {data.role.band} · {data.role.matched}/{data.role.total} requirements met
            </p>
          </div>
        </div>
      )}
    </header>
    {data.role && <p className="px-6 pb-4 text-2xs text-muted sm:px-8">{data.role.note}</p>}

    {data.skills?.length > 0 && (
      <Section level={level} icon={ShieldCheck} title="Skills">
        <ul className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
          {data.skills.map((s) => (
            <li key={s.name}>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate text-ink">{s.name}</span>
                <EvidenceBadge level={s.evidence} short />
              </div>
              <ProgressBar value={s.level} size="xs" tone={s.verified ? 'success' : 'muted'} className="mt-1" label={`${s.name} ${s.level}%, ${s.evidenceLabel}`} />
            </li>
          ))}
        </ul>
        <p className="mt-3 text-2xs text-muted">Practical and quiz badges are verified by graded results. Self-reported levels are the person’s own estimate.</p>
      </Section>
    )}

    {data.assessments && (
      <Section level={level} icon={ClipboardCheck} title="Verified results">
        <ul className="space-y-1.5 text-sm">
          {data.assessments.practical.map((p) => (
            <li key={p.title} className="flex justify-between gap-3">
              <span className="text-ink">
                Practical: {p.title} <span className="text-muted">· {p.skill}, {p.difficulty}</span>
              </span>
              <span className="shrink-0 text-xs text-muted">{fmt(p.date)}</span>
            </li>
          ))}
          {data.assessments.quizzes.map((q) => (
            <li key={q.skill} className="flex justify-between gap-3">
              <span className="text-ink">
                {q.skill} assessment <span className="text-muted">· {q.pct}%</span>
              </span>
              <span className="shrink-0 text-xs text-muted">{fmt(q.date)}</span>
            </li>
          ))}
        </ul>
      </Section>
    )}

    {data.projects?.length > 0 && (
      <Section level={level} icon={FolderGit2} title="Projects">
        <ul className="space-y-2 text-sm">
          {data.projects.map((p) => (
            <li key={p.title}>
              <p className="font-medium text-ink">{p.title}</p>
              <p className="text-xs text-muted">
                {p.skills.join(' · ')}
                {p.date && ` · completed ${fmt(p.date)}`}
              </p>
            </li>
          ))}
        </ul>
      </Section>
    )}

    {data.github && (
      <Section level={level} icon={Github} title="GitHub">
        <p className="text-sm text-ink">
          <a href={data.github.url} target="_blank" rel="noreferrer noopener" className="font-medium hover:underline">
            @{data.github.username}
          </a>{' '}
          <span className="text-muted">
            · profile score {data.github.score}/100{data.github.languages.length ? ` · ${data.github.languages.join(', ')}` : ''}
          </span>
        </p>
        {data.github.repos.length > 0 && (
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {data.github.repos.map((r) => (
              <li key={r.name} className="rounded-lg border border-line px-3 py-2 text-sm">
                <a href={r.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 font-medium text-ink hover:underline">
                  {r.name} <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
                {r.description && <p className="line-clamp-2 text-xs text-muted">{r.description}</p>}
              </li>
            ))}
          </ul>
        )}
      </Section>
    )}

    {data.milestones?.length > 0 && (
      <Section level={level} icon={Flag} title="Roadmap milestones completed">
        <ul className="flex flex-wrap gap-2">
          {data.milestones.map((m) => (
            <li key={m.title} className="rounded-md bg-slate-100 px-2 py-1 text-xs text-ink">
              {m.title}
              {m.date && <span className="text-muted"> · {fmt(m.date)}</span>}
            </li>
          ))}
        </ul>
      </Section>
    )}

    {data.certificates?.length > 0 && (
      <Section level={level} icon={Award} title="Certificates & achievements">
        <ul className="space-y-1.5 text-sm">
          {data.certificates.map((c) => (
            <li key={c.name} className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="text-ink">
                {c.url ? (
                  <a href={c.url} target="_blank" rel="noreferrer noopener" className="font-medium hover:underline">
                    {c.name}
                  </a>
                ) : (
                  <span className="font-medium">{c.name}</span>
                )}
                {c.issuer && <span className="text-muted"> · {c.issuer}</span>}
              </span>
              <span className="text-xs text-muted">{fmt(c.date)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-2xs text-muted">Added by the person; not verified by SkillGap.</p>
      </Section>
    )}

    {data.contact && (
      <Section level={level} icon={Link2} title="Contact">
        <ul className="flex flex-wrap gap-3 text-sm">
          {Object.entries(data.contact).map(([key, value]) => {
            const [Icon, label] = CONTACT[key] || [Link2, key];
            return (
              <li key={key}>
                <a href={key === 'email' ? `mailto:${value}` : value} target={key === 'email' ? undefined : '_blank'} rel="noreferrer noopener" className="inline-flex items-center gap-1.5 font-medium text-ink hover:underline">
                  <Icon className="h-4 w-4 text-muted" aria-hidden /> {label}
                </a>
              </li>
            );
          })}
        </ul>
      </Section>
    )}
    <footer className="border-t border-line px-6 py-3 text-2xs text-muted sm:px-8">Built with SkillGap · snapshot from {new Date(data.generatedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</footer>
  </article>
);

export default PortfolioView;

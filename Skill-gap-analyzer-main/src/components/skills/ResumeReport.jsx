import { Link } from 'react-router-dom';
import { Check, X, Plus, FolderGit2, GraduationCap, Briefcase, Award, AlertTriangle, Lightbulb, RotateCcw } from 'lucide-react';
import Card, { CardHeader, CardBody } from '../ui/Card';
import Button from '../ui/Button';
import ScoreRing from '../ui/ScoreRing';
import Badge from '../ui/Badge';
import { relativeTime } from '../../lib/progress';

const EVIDENCE = { experience: 'In experience', project: 'In a project', listed: 'Listed only' };

const Section = ({ icon: Icon, title, empty, children, count }) => (
  <div>
    <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
      <Icon className="h-3.5 w-3.5" aria-hidden /> {title}
      {count != null && <span className="tabular font-normal normal-case text-muted-light">{count}</span>}
    </p>
    {children || <p className="text-sm text-muted">{empty}</p>}
  </div>
);

/** Results of a resume analysis against the target role. */
const ResumeReport = ({ saved, report, role, newSkills, onImport, importing, onReset }) => {
  const { parsed } = saved;
  const tone = report.match >= 75 ? 'success' : report.match >= 50 ? 'accent' : 'warning';

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <ScoreRing value={report.match} tone={tone} size={120} label={`Resume match ${report.match}%`}>
            <span className="text-3xl font-semibold tracking-tight text-ink">{report.match}%</span>
            <span className="text-[11px] text-muted">match</span>
          </ScoreRing>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted">Resume match for</p>
            <p className="text-lg font-semibold text-ink">
              {role.name}
              {role.company ? ` · ${role.company.name}` : ''}
            </p>
            <p className="mt-1 text-xs text-muted">
              {saved.fileName} · analysed {relativeTime(saved.analyzedAt)}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              {[
                ['Skills', parsed.skills.length],
                ['Projects', parsed.projects.length],
                ['Roles', parsed.experience.length],
                ['Certifications', parsed.certifications.length],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted">{label}</dt>
                  <dd className="tabular mt-0.5 font-semibold text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="flex flex-col gap-2 md:items-end">
            {newSkills.length > 0 ? (
              <Button icon={Plus} onClick={onImport} loading={importing}>
                Add {newSkills.length} skill{newSkills.length === 1 ? '' : 's'} to my profile
              </Button>
            ) : (
              <span className="text-xs text-muted">All detected skills are in your profile</span>
            )}
            <Button variant="ghost" size="sm" icon={RotateCcw} onClick={onReset}>
              Analyse another resume
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <Card>
          <CardHeader title="Resume vs role" description="Skills the role requires, and whether your resume shows them." />
          <CardBody>
            <ul className="divide-y divide-line">
              {report.requirements.map((req) => (
                <li key={req.key} className="flex items-center gap-3 py-2 text-sm">
                  {req.found ? <Check className="h-4 w-4 shrink-0 text-success-600" aria-label="Found" /> : <X className="h-4 w-4 shrink-0 text-danger" aria-label="Missing" />}
                  <span className="min-w-0 flex-1 truncate text-ink">{req.skillName}</span>
                  {req.found ? (
                    <span className={req.evidence === 'listed' ? 'text-xs text-warning-700' : 'text-xs text-muted'}>{EVIDENCE[req.evidence]}</span>
                  ) : (
                    <span className="text-xs capitalize text-muted">{req.importance}</span>
                  )}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Improve your resume" />
          <CardBody className="space-y-5">
            {report.weakSections.length > 0 && (
              <Section icon={AlertTriangle} title="Weak spots">
                <ul className="space-y-3">
                  {report.weakSections.map((w, i) => (
                    <li key={i} className="text-sm">
                      <p className="font-medium text-ink">
                        {w.section}: <span className="font-normal text-muted">{w.issue}</span>
                      </p>
                      <p className="mt-0.5 text-muted">{w.fix}</p>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
            {report.missingKeywords.length > 0 && (
              <Section icon={Lightbulb} title="Missing keywords">
                <div className="flex flex-wrap gap-1.5">
                  {report.missingKeywords.map((k) => (
                    <span key={k} className="rounded-md border border-dashed border-slate-300 px-1.5 py-0.5 text-xs text-ink">
                      {k}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted">Only add keywords that are true — then prove them with a project.</p>
              </Section>
            )}
            {report.projectIdeas.length > 0 && (
              <Section icon={FolderGit2} title="Projects that would close gaps">
                <ul className="space-y-2">
                  {report.projectIdeas.map(({ project, forSkill }) => (
                    <li key={project.id}>
                      <Link to={`/projects/${project.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-sm hover:border-slate-300 hover:bg-slate-50">
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-ink">{project.title}</span>
                          <span className="block text-xs text-muted">Proves {forSkill}</span>
                        </span>
                        <Badge tone="outline">{project.difficulty}</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
            {report.weakSections.length === 0 && report.missingKeywords.length === 0 && <p className="text-sm text-muted">Your resume covers this role well.</p>}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Extracted from your resume" description="Check this looks right — parsing is heuristic." />
        <CardBody className="grid gap-6 md:grid-cols-2">
          <Section icon={Check} title="Technologies" count={parsed.skills.length} empty="No technologies detected.">
            {parsed.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {parsed.skills.map((s) => (
                  <span key={s.id} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700" title={EVIDENCE[s.evidence]}>
                    {s.name}
                    {s.evidence !== 'listed' && <span className="h-1.5 w-1.5 rounded-full bg-success" aria-label={EVIDENCE[s.evidence]} />}
                  </span>
                ))}
              </div>
            )}
          </Section>
          <Section icon={FolderGit2} title="Projects" count={parsed.projects.length} empty="No projects section detected.">
            {parsed.projects.length > 0 && (
              <ul className="space-y-2 text-sm">
                {parsed.projects.map((p, i) => (
                  <li key={i}>
                    <p className="font-medium text-ink">{p.title}</p>
                    {p.technologies.length > 0 && <p className="text-xs text-muted">{p.technologies.join(', ')}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Section>
          <Section icon={Briefcase} title="Experience" count={parsed.experience.length} empty="No dated roles detected.">
            {parsed.experience.length > 0 && (
              <ul className="space-y-2 text-sm">
                {parsed.experience.map((e, i) => (
                  <li key={i}>
                    <p className="font-medium text-ink">{e.title}</p>
                    <p className="text-xs text-muted">
                      {e.dates} · {e.bullets} bullet{e.bullets === 1 ? '' : 's'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>
          <Section icon={GraduationCap} title="Education" empty="No education details detected.">
            {parsed.education.length > 0 && (
              <ul className="space-y-1 text-sm text-ink">
                {parsed.education.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
          </Section>
          <Section icon={Award} title="Certifications" empty="None detected.">
            {parsed.certifications.length > 0 && (
              <ul className="space-y-1 text-sm text-ink">
                {parsed.certifications.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            )}
          </Section>
        </CardBody>
      </Card>
    </div>
  );
};

export default ResumeReport;

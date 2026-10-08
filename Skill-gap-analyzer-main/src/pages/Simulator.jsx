/**
 * Career Simulator — try a role at a company and see your match, what's
 * missing and how long it would take at your pace.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Clock, Info } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import ScoreRing from '../components/ui/ScoreRing';
import ProgressBar from '../components/ui/ProgressBar';
import PriorityBadge from '../components/ui/PriorityBadge';
import { ConfirmDialog } from '../components/ui/Overlay';
import JobsTabs from '../components/careers/JobsTabs';
import CompanyPicker from '../components/careers/CompanyPicker';
import { NoAnalysisState } from '../components/common/WorkspaceEmpty';
import { useWorkspace } from '../context/WorkspaceContext';
import { useToast } from '../context/ToastContext';
import { ROLES, ROLE_MAP } from '../data/roles';
import { COMPANIES } from '../data/companies';
import { compareCompanies, simulateCareer } from '../lib/simulator';
import { dailyTimeLabel } from '../data/options';
import { cx } from '../lib/cx';

const Simulator = () => {
  const { career, analysis, signals, actions } = useWorkspace();
  const toast = useToast();
  const navigate = useNavigate();
  const [roleId, setRoleId] = useState(() => (career?.targetRoleId && career.targetRoleId !== 'custom' ? career.targetRoleId : 'software-engineer'));
  const [company, setCompany] = useState(() => career?.targetCompany || { id: 'microsoft', name: 'Microsoft' });
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const result = useMemo(() => (career ? simulateCareer({ roleId, company, profile: career, signals }) : null), [roleId, company, career, signals]);
  const comparison = useMemo(
    () => (career ? compareCompanies({ roleId, companies: [null, ...COMPANIES.map((c) => ({ id: c.id, name: c.name }))], profile: career, signals }) : []),
    [roleId, career, signals],
  );

  if (!analysis || !result) return <NoAnalysisState title="Add your skills first" description="The simulator uses your skill profile to estimate your match and preparation time." />;

  const isCurrent = career.targetRoleId === roleId && (career.targetCompany?.id || null) === (company?.id || null) && (career.targetCompany?.name || null) === (company?.name || null);
  const title = `${ROLE_MAP[roleId].name}${result.company ? ` at ${result.company.name}` : ''}`;

  const makeGoal = async () => {
    setSaving(true);
    try {
      await actions.setTargetRole(roleId, null, company);
      toast.success(`Your goal is now ${title}`);
      navigate('/gap');
    } finally {
      setSaving(false);
      setConfirm(false);
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Jobs" title="Career Simulator" description="Change the role or company and see how your readiness and preparation time change." />
      <JobsTabs />

      <Card className="p-5">
        <div className="grid gap-5 lg:grid-cols-[16rem_1fr]">
          <div>
            <label htmlFor="sim-role" className="label">
              Target role
            </label>
            <select id="sim-role" className="input" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
              {ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="label">Company</p>
            <CompanyPicker value={company} onChange={setCompany} />
          </div>
        </div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Card className="p-6">
          <p className="text-sm text-muted">Target</p>
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-center">
            <ScoreRing value={result.match} tone={result.match >= 75 ? 'success' : result.match >= 50 ? 'accent' : 'warning'} label={`Current match ${result.match}%`}>
              <span className="text-3xl font-semibold tracking-tight text-ink">{result.match}%</span>
              <span className="text-[11px] text-muted">current match</span>
            </ScoreRing>
            <div>
              <p className="flex items-center gap-2 text-sm text-muted">
                <Clock className="h-4 w-4" aria-hidden /> Estimated preparation
              </p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-ink">{result.prep}</p>
              <p className="mt-1 text-sm text-muted">
                ~{result.hours} hours at {dailyTimeLabel(career.dailyMinutes)} ({result.weeklyHours} h/week)
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-4">
            {isCurrent ? (
              <span className="text-sm font-medium text-success-700">This is your current goal</span>
            ) : (
              <Button icon={Target} onClick={() => setConfirm(true)}>
                Make this my goal
              </Button>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="What’s missing" description={result.missing.length ? 'Critical and important gaps for this target.' : undefined} />
          <CardBody>
            {result.missing.length ? (
              <ul className="space-y-2.5">
                {result.missing.slice(0, 9).map((gap) => (
                  <li key={gap.key} className="flex items-center gap-3 text-sm">
                    <PriorityBadge priority={gap.priority} showLabel={false} />
                    <span className="min-w-0 flex-1 truncate text-ink">{gap.skillName}</span>
                    {(gap.companyAdded || gap.companyAdjusted) && <span className="text-[11px] text-muted-light">{result.company?.name}</span>}
                    <span className="tabular text-xs text-muted">
                      {gap.current}→{gap.required}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Nothing critical — you’re ready for this target.</p>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title={`${ROLE_MAP[roleId].name} across companies`} description="Select a row to simulate it." />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead className="text-left text-xs text-muted">
              <tr className="border-y border-line">
                <th scope="col" className="px-5 py-2.5 font-medium">Company</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Match</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Missing</th>
                <th scope="col" className="px-5 py-2.5 text-right font-medium">Preparation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {comparison.map((row) => {
                const selected = (row.company?.id || null) === (company?.id === 'custom' ? null : company?.id || null) && company?.id !== 'custom';
                return (
                  <tr
                    key={row.company?.id || 'none'}
                    onClick={() => setCompany(row.company ? { id: row.company.id, name: row.company.name } : null)}
                    className={cx('cursor-pointer hover:bg-slate-50', selected && 'bg-slate-50')}
                  >
                    <td className="px-5 py-3 font-medium text-ink">{row.company?.name || 'Typical company'}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <ProgressBar value={row.match} size="sm" className="w-24" tone={selected ? 'accent' : 'ink'} label={`${row.company?.name || 'Typical'} match`} />
                        <span className="tabular text-xs text-ink">{row.match}%</span>
                      </div>
                    </td>
                    <td className="tabular px-3 py-3 text-ink">{row.missing.length}</td>
                    <td className="px-5 py-3 text-right text-ink">{row.prep}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="flex items-start gap-2 px-5 py-4 text-xs text-muted">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          Company differences reflect commonly reported interview focus, not official requirements. Preparation time assumes your current daily learning time and includes a capstone project.
        </p>
      </Card>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={makeGoal}
        loading={saving}
        title={`Make ${title} your goal?`}
        description="Your analysis, recommendations and roadmap will retarget. Your skills and completed work are kept."
        confirmLabel="Make it my goal"
      />
    </div>
  );
};

export default Simulator;

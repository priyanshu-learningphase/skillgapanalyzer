/**
 * Career Paths — how well the user's skills match every role, with detail.
 */

import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, X, Target, ScanSearch } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ProgressBar from '../components/ui/ProgressBar';
import PriorityBadge from '../components/ui/PriorityBadge';
import { ConfirmDialog } from '../components/ui/Overlay';
import { roleIcon } from '../components/careers/roleIcons';
import { useWorkspace } from '../context/WorkspaceContext';
import { useToast } from '../context/ToastContext';
import { ROLES, ROLE_MAP, requirementLabel } from '../data/roles';
import { analyzeRole } from '../lib/analysis';
import { cx } from '../lib/cx';

const Careers = () => {
  const { roleId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { matches, career, role: currentRole, isOnboarded, actions } = useWorkspace();
  const [confirming, setConfirming] = useState(false);
  const [switching, setSwitching] = useState(false);

  const list = useMemo(() => {
    if (isOnboarded) return matches;
    return ROLES.map((role) => ({ role, analysis: null }));
  }, [matches, isOnboarded]);

  const selectedId = roleId || list[0]?.role.id;
  const selected = useMemo(() => {
    const fromList = list.find((m) => m.role.id === selectedId);
    if (fromList) return fromList;
    const role = ROLE_MAP[selectedId];
    return role ? { role, analysis: isOnboarded ? analyzeRole(role, career.skills) : null } : null;
  }, [list, selectedId, isOnboarded, career]);

  const isCurrent = selected && currentRole?.id === selected.role.id;

  const generate = () => {
    if (!isOnboarded) {
      navigate(`/onboarding?role=${selected.role.id}`);
      return;
    }
    if (isCurrent) {
      navigate('/roadmap', { state: { autoGenerate: true } });
      return;
    }
    setConfirming(true);
  };

  const switchAndGenerate = async () => {
    setSwitching(true);
    try {
      await actions.setTargetRole(selected.role.id);
      toast.success(`Your goal is now ${selected.role.name}`);
      navigate('/roadmap', { state: { autoGenerate: true } });
    } finally {
      setSwitching(false);
      setConfirming(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Career paths"
        title="Career Matches"
        description={isOnboarded ? 'How your current skills match each role. Select one to see what you have and what’s missing.' : 'Explore what each role requires. Analyze your skills to see how well you match.'}
        actions={
          !isOnboarded && (
            <Button to="/onboarding" icon={ScanSearch}>
              Analyze Skills
            </Button>
          )
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,21rem)_1fr]">
        {/* Match list */}
        <Card className={cx('overflow-hidden', roleId && 'hidden lg:block')}>
          <ul className="divide-y divide-line">
            {list.map(({ role, analysis }) => {
              const Icon = roleIcon(role.id);
              const active = role.id === selectedId;
              return (
                <li key={role.id}>
                  <Link
                    to={`/careers/${role.id}`}
                    className={cx('flex items-center gap-3 px-4 py-3 transition-colors', active ? 'bg-slate-50' : 'hover:bg-slate-50/60')}
                    aria-current={active ? 'true' : undefined}
                  >
                    <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border', active ? 'border-ink bg-ink text-white' : 'border-line bg-white text-muted')}>
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-ink">{role.name}</span>
                        {currentRole?.id === role.id && <Badge tone="accent">Goal</Badge>}
                      </span>
                      {analysis ? (
                        <span className="mt-1.5 flex items-center gap-2">
                          <ProgressBar value={analysis.readiness} size="xs" tone={currentRole?.id === role.id ? 'accent' : 'ink'} label={`${role.name} match`} />
                        </span>
                      ) : (
                        <span className="block text-xs text-muted">{role.track}</span>
                      )}
                    </span>
                    {analysis && <span className="tabular w-10 text-right text-sm font-semibold text-ink">{analysis.readiness}%</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>

        {/* Detail */}
        {selected && (
          <Card className={cx('p-6', !roleId && 'hidden lg:block')}>
            <Link to="/careers" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink lg:hidden">
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> All careers
            </Link>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs text-muted">{selected.role.track}</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight">{selected.role.name}</h2>
                <p className="mt-1 max-w-lg text-sm text-muted">{selected.role.description}</p>
              </div>
              {selected.analysis && (
                <div className="sm:text-right">
                  <p className="text-4xl font-semibold tracking-tight text-ink">{selected.analysis.readiness}%</p>
                  <p className="text-xs text-muted">match</p>
                </div>
              )}
            </div>

            {selected.analysis ? (
              <div className="mt-6 grid gap-6 border-t border-line pt-6 md:grid-cols-2">
                <div>
                  <h3 className="text-sm font-semibold text-ink">Skills you already have</h3>
                  {selected.analysis.strengths.length ? (
                    <ul className="mt-3 space-y-2">
                      {selected.analysis.strengths.map((item) => (
                        <li key={item.key} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-success-600" aria-hidden />
                          <span className="text-ink">{item.skillName}</span>
                          <span className="tabular ml-auto text-xs text-muted">{item.current}%</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-muted">None of the core requirements yet.</p>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-ink">Skills you’re missing</h3>
                  <ul className="mt-3 space-y-2">
                    {selected.analysis.gaps.filter((item) => item.status !== 'close').map((item) => (
                      <li key={item.key} className="flex items-center gap-2 text-sm">
                        <X className="h-4 w-4 text-danger" aria-hidden />
                        <span className="truncate text-ink">{item.skillName}</span>
                        <span className="ml-auto shrink-0">
                          <PriorityBadge priority={item.priority} showLabel={false} />
                        </span>
                        <span className="tabular w-16 shrink-0 text-right text-xs text-muted">
                          {item.current}→{item.required}
                        </span>
                      </li>
                    ))}
                    {selected.analysis.gaps.every((item) => item.status === 'close') && <li className="text-sm text-muted">Nothing major — you meet or nearly meet every requirement.</li>}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="mt-6 border-t border-line pt-6">
                <h3 className="text-sm font-semibold text-ink">What this role requires</h3>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {selected.role.requirements.map((req) => (
                    <li key={req.key} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-sm">
                      <span className="text-ink">{requirementLabel(req)}</span>
                      <span className="tabular text-xs text-muted">{req.level}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted">
                {isCurrent ? 'This is your current goal.' : isOnboarded ? `Switching keeps your skills and progress.` : 'Analyze your skills for this role to get your match.'}
              </p>
              <Button iconRight={ArrowRight} onClick={generate} icon={isOnboarded ? undefined : Target}>
                {isOnboarded ? 'Generate Roadmap' : 'Analyze for this role'}
              </Button>
            </div>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={switchAndGenerate}
        loading={switching}
        title={`Switch your goal to ${selected?.role.name}?`}
        description={`Your skills and completed tasks are kept. We’ll re-run your analysis for ${selected?.role.name} and generate a new roadmap.`}
        confirmLabel="Switch & generate"
      />
    </div>
  );
};

export default Careers;

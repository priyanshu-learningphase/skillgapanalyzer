/**
 * Settings — profile, goal, learning preferences, roadmap controls, data.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Cpu, HardDrive, Cloud, LogOut, RefreshCw, Pause, Play, ScanSearch } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Segmented from '../components/ui/Segmented';
import Badge from '../components/ui/Badge';
import { ConfirmDialog } from '../components/ui/Overlay';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useToast } from '../context/ToastContext';
import { getAiStatus } from '../services/aiService';
import { ROLES } from '../data/roles';
import { BRANCHES, DAILY_TIME_OPTIONS, EXPERIENCE_LEVELS, TIMELINE_OPTIONS, YEARS } from '../data/options';

const Section = ({ title, description, children }) => (
  <Card className="grid gap-6 p-6 md:grid-cols-[14rem_1fr]">
    <div>
      <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
    </div>
    <div className="min-w-0">{children}</div>
  </Card>
);

const Settings = () => {
  const { currentUser, userProfile, updateUserProfile, logout, isLocalMode } = useAuth();
  const { career, role, roadmap, isOnboarded, actions } = useWorkspace();
  const toast = useToast();
  const navigate = useNavigate();

  const [profile, setProfile] = useState({ name: userProfile?.name || '', branch: userProfile?.branch || '', year: userProfile?.year || '' });
  const [prefs, setPrefs] = useState({ level: career?.level, dailyMinutes: career?.dailyMinutes, timelineWeeks: career?.timelineWeeks ?? null });
  const [targetId, setTargetId] = useState(career?.targetRoleId || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [ai, setAi] = useState(null);

  useEffect(() => {
    getAiStatus({ refresh: true }).then(setAi);
  }, []);

  useEffect(() => {
    setPrefs({ level: career?.level, dailyMinutes: career?.dailyMinutes, timelineWeeks: career?.timelineWeeks ?? null });
    setTargetId(career?.targetRoleId || '');
  }, [career]);

  const prefsChanged = career && (prefs.level !== career.level || prefs.dailyMinutes !== career.dailyMinutes || prefs.timelineWeeks !== (career.timelineWeeks ?? null));

  const saveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    try {
      await updateUserProfile(currentUser.uid, {
        name: profile.name.trim(),
        branch: profile.branch,
        year: profile.year ? Number(profile.year) : null,
      });
      toast.success('Profile saved');
    } catch (error) {
      toast.error('Couldn’t save your profile', { description: error.message });
    } finally {
      setSavingProfile(false);
    }
  };

  const savePrefs = async () => {
    setSavingPrefs(true);
    try {
      await actions.updatePreferences(prefs);
      toast.success('Preferences saved', {
        description: roadmap ? 'Update your roadmap to apply the new schedule.' : undefined,
        action: roadmap ? { label: 'Update roadmap', onClick: () => navigate('/roadmap', { state: { autoGenerate: true } }) } : undefined,
      });
    } finally {
      setSavingPrefs(false);
    }
  };

  const reset = async () => {
    setResetting(true);
    try {
      await actions.resetWorkspace();
      toast.success('Your data was reset');
      navigate('/onboarding');
    } catch (error) {
      toast.error('Couldn’t reset your data', { description: error.message });
    } finally {
      setResetting(false);
      setConfirmReset(false);
    }
  };

  const targetName = ROLES.find((r) => r.id === targetId)?.name || (targetId === 'custom' ? career?.customRole?.name : '');

  return (
    <div>
      <PageHeader eyebrow="Settings" title="Settings" description="Manage your profile, goal and how your roadmap is planned." />

      <div className="space-y-4">
        <Section title="Profile" description={isLocalMode ? 'Stored in this browser.' : currentUser?.email}>
          <form onSubmit={saveProfile} className="grid max-w-lg gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="name" className="label">
                Name
              </label>
              <input id="name" className="input" value={profile.name} maxLength={80} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
            </div>
            <div>
              <label htmlFor="branch" className="label">
                Field of study <span className="font-normal text-muted">(optional)</span>
              </label>
              <select id="branch" className="input" value={profile.branch} onChange={(e) => setProfile({ ...profile, branch: e.target.value })}>
                <option value="">—</option>
                {BRANCHES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="year" className="label">
                Year <span className="font-normal text-muted">(optional)</span>
              </label>
              <select id="year" className="input" value={profile.year} onChange={(e) => setProfile({ ...profile, year: e.target.value })}>
                <option value="">—</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    Year {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" loading={savingProfile}>
                Save profile
              </Button>
            </div>
          </form>
        </Section>

        <Section title="Career goal" description="Changing your goal re-runs your analysis. Skills and progress are kept.">
          {isOnboarded ? (
            <div className="max-w-lg space-y-4">
              <div>
                <label htmlFor="target" className="label">
                  Target role
                </label>
                <select id="target" className="input" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                  {ROLES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                  {career.customRole && <option value="custom">{career.customRole.name} (custom)</option>}
                </select>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setConfirmTarget(true)} disabled={targetId === career.targetRoleId}>
                  Change goal
                </Button>
                <Button variant="secondary" icon={ScanSearch} to="/onboarding">
                  Re-run full analysis
                </Button>
              </div>
            </div>
          ) : (
            <Button to="/onboarding" icon={ScanSearch}>
              Analyze Skills
            </Button>
          )}
        </Section>

        {isOnboarded && (
          <Section title="Learning preferences" description="Used to pace and schedule your roadmap.">
            <div className="max-w-lg space-y-5">
              <div>
                <p className="label">Experience level</p>
                <Segmented size="md" label="Experience level" value={prefs.level} onChange={(level) => setPrefs({ ...prefs, level })} options={EXPERIENCE_LEVELS.map((l) => ({ value: l.id, label: l.label }))} />
              </div>
              <div>
                <p className="label">Daily learning time</p>
                <Segmented size="md" label="Daily learning time" value={prefs.dailyMinutes} onChange={(dailyMinutes) => setPrefs({ ...prefs, dailyMinutes })} options={DAILY_TIME_OPTIONS.map((o) => ({ value: o.minutes, label: o.label.replace('/day', '') }))} className="flex-wrap" />
              </div>
              <div>
                <label htmlFor="timeline" className="label">
                  Target timeline
                </label>
                <select
                  id="timeline"
                  className="input max-w-xs"
                  value={prefs.timelineWeeks ?? ''}
                  onChange={(e) => setPrefs({ ...prefs, timelineWeeks: e.target.value ? Number(e.target.value) : null })}
                >
                  {TIMELINE_OPTIONS.map((o) => (
                    <option key={o.label} value={o.weeks ?? ''}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <Button onClick={savePrefs} loading={savingPrefs} disabled={!prefsChanged}>
                Save preferences
              </Button>
            </div>
          </Section>
        )}

        <Section title="Roadmap" description="Pause tracking, regenerate, and see how plans are produced.">
          <div className="max-w-lg space-y-4">
            {roadmap ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" icon={roadmap.status === 'paused' ? Play : Pause} onClick={() => actions.setRoadmapStatus(roadmap.status === 'paused' ? 'active' : 'paused')}>
                  {roadmap.status === 'paused' ? 'Resume roadmap' : 'Pause roadmap'}
                </Button>
                <Button variant="secondary" icon={RefreshCw} to="/roadmap" state={{ autoGenerate: true }}>
                  Regenerate roadmap
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted">No roadmap yet.</p>
            )}
            <div className="flex items-start gap-3 rounded-lg border border-line p-3 text-sm">
              {ai?.enabled ? <Sparkles className="mt-0.5 h-4 w-4 text-accent-600" aria-hidden /> : <Cpu className="mt-0.5 h-4 w-4 text-muted" aria-hidden />}
              <div>
                <p className="font-medium text-ink">
                  AI personalisation{' '}
                  {ai == null ? '' : ai.enabled ? <Badge tone="success">On · {ai.model}</Badge> : <Badge tone="neutral">Off</Badge>}
                </p>
                <p className="mt-0.5 text-muted">
                  {ai?.enabled
                    ? 'Roadmaps are ordered by the dependency-aware planner, then each phase is personalised by AI and validated before it’s shown.'
                    : ai && !ai.reachable
                      ? 'The API server isn’t reachable, so roadmaps use the dependency-aware planner only.'
                      : 'No AI key is configured on the server, so roadmaps use the dependency-aware planner only. Set GEMINI_API_KEY to enable it.'}
                </p>
              </div>
            </div>
          </div>
        </Section>

        <Section title="Data" description={isLocalMode ? 'Everything is stored locally in this browser.' : 'Synced to your account with Firebase.'}>
          <div className="max-w-lg space-y-4">
            <p className="flex items-center gap-2 text-sm text-ink">
              {isLocalMode ? <HardDrive className="h-4 w-4 text-muted" aria-hidden /> : <Cloud className="h-4 w-4 text-muted" aria-hidden />}
              {isLocalMode ? 'Local browser storage — clearing site data will remove it.' : 'Cloud sync across devices.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="danger" onClick={() => setConfirmReset(true)} disabled={!career && !roadmap}>
                Reset all data
              </Button>
              {!isLocalMode && (
                <Button
                  variant="secondary"
                  icon={LogOut}
                  onClick={async () => {
                    await logout();
                    navigate('/');
                  }}
                >
                  Sign out
                </Button>
              )}
            </div>
          </div>
        </Section>
      </div>

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={reset}
        loading={resetting}
        tone="danger"
        title="Reset all data?"
        description="This permanently deletes your career profile, analysis history, roadmap and progress. This can’t be undone."
        confirmLabel="Reset everything"
      />
      <ConfirmDialog
        open={confirmTarget}
        onClose={() => setConfirmTarget(false)}
        onConfirm={async () => {
          const custom = targetId === 'custom' ? career.customRole : null;
          const next = await actions.setTargetRole(targetId, custom);
          setConfirmTarget(false);
          toast.success(`Your goal is now ${targetName}`, {
            description: next ? `Readiness: ${next.readiness}%` : undefined,
            action: { label: 'Generate roadmap', onClick: () => navigate('/roadmap', { state: { autoGenerate: true } }) },
          });
        }}
        title={`Change your goal to ${targetName}?`}
        description="We’ll re-run your analysis for the new role. Your current roadmap will be flagged so you can generate a new one."
        confirmLabel="Change goal"
      />
    </div>
  );
};

export default Settings;

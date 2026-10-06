/**
 * Onboarding — five steps from target role to timeline, then analysis.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import Logo from '../components/layout/Logo';
import Button from '../components/ui/Button';
import { FullPageSpinner } from '../components/ui/Spinner';
import RoleStep, { CUSTOM_ROLE_MIN_SKILLS } from '../components/onboarding/RoleStep';
import SkillsStep from '../components/onboarding/SkillsStep';
import { LevelStep, TimeStep, TimelineStep } from '../components/onboarding/PreferenceSteps';
import { useWorkspace } from '../context/WorkspaceContext';
import { useToast } from '../context/ToastContext';
import { buildCustomRole, ROLE_MAP } from '../data/roles';
import { dailyTimeLabel, timelineLabel, EXPERIENCE_LEVELS } from '../data/options';
import { weeklyHoursFor } from '../lib/roadmap';
import { cx } from '../lib/cx';

const STEPS = [
  { id: 'role', title: 'What do you want to become?', description: 'Pick the role you’re working toward. You can change it any time.' },
  { id: 'level', title: 'What is your current level?', description: 'This tunes pacing and how much groundwork your roadmap includes.' },
  { id: 'skills', title: 'What skills do you already have?', description: 'Select your skills and how confident you are in each. Be honest — it makes the plan better.' },
  { id: 'time', title: 'How much time can you learn?', description: 'We size every phase of your roadmap to this.' },
  { id: 'timeline', title: 'What is your target timeline?', description: 'We’ll prioritise what matters most if time is tight.' },
];

const Onboarding = () => {
  const { status, career, actions } = useWorkspace();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [draft, setDraft] = useState(null);

  // Start from the existing profile (re-analysis) or a ?role= deep link.
  useEffect(() => {
    if (status !== 'ready' || draft) return;
    const requestedRole = params.get('role');
    setDraft({
      targetRoleId: ROLE_MAP[requestedRole] ? requestedRole : career?.targetRoleId || null,
      customRole: career?.customRole || null,
      level: career?.level || 'intermediate',
      skills: career?.skills || [],
      dailyMinutes: career?.dailyMinutes || 60,
      timelineWeeks: career ? career.timelineWeeks ?? null : 12,
      fromScratch: false,
    });
  }, [status, career, params, draft]);

  const role = useMemo(() => {
    if (!draft?.targetRoleId) return null;
    return draft.targetRoleId === 'custom' ? buildCustomRole(draft.customRole) : ROLE_MAP[draft.targetRoleId];
  }, [draft]);

  if (status !== 'ready' || !draft) return <FullPageSpinner />;

  const update = (patch) => {
    setError('');
    setDraft((d) => ({ ...d, ...patch }));
  };

  const validate = () => {
    if (step === 0) {
      if (!draft.targetRoleId) return 'Choose a target role to continue.';
      if (draft.targetRoleId === 'custom') {
        if (!draft.customRole?.name?.trim()) return 'Give your custom role a name.';
        if ((draft.customRole?.skills?.length || 0) < CUSTOM_ROLE_MIN_SKILLS) {
          return `Add at least ${CUSTOM_ROLE_MIN_SKILLS} skills your custom role requires.`;
        }
      }
    }
    if (step === 2 && draft.skills.length === 0 && !draft.fromScratch) {
      return 'Add at least one skill, or tick “I’m starting from scratch”.';
    }
    return '';
  };

  const next = async () => {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      window.scrollTo({ top: 0 });
      return;
    }
    setSubmitting(true);
    try {
      await actions.completeOnboarding({
        targetRoleId: draft.targetRoleId,
        customRole: draft.targetRoleId === 'custom' ? { ...draft.customRole, name: draft.customRole.name.trim() } : null,
        level: draft.level,
        skills: draft.skills,
        dailyMinutes: draft.dailyMinutes,
        timelineWeeks: draft.timelineWeeks,
      });
      navigate('/analysis', { state: { fresh: true } });
    } catch (err) {
      console.error(err);
      toast.error('We couldn’t run your analysis', { description: err.message });
      setSubmitting(false);
    }
  };

  const back = () => {
    setError('');
    setStep(Math.max(0, step - 1));
  };

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4 sm:px-6">
          <Logo to={career ? '/dashboard' : '/'} />
          <div className="mx-auto hidden w-full max-w-xs items-center gap-1.5 sm:flex" aria-hidden>
            {STEPS.map((s, i) => (
              <span key={s.id} className={cx('h-1 flex-1 rounded-full transition-colors duration-300', i <= step ? 'bg-ink' : 'bg-slate-200')} />
            ))}
          </div>
          <Link
            to={career?.targetRoleId ? '/dashboard' : '/'}
            className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-slate-100 hover:text-ink sm:ml-0"
            aria-label="Exit onboarding"
          >
            <X className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-32 pt-8 sm:px-6 sm:pt-12">
        <p className="text-xs font-medium text-muted">
          Step {step + 1} of {STEPS.length}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{current.title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted sm:text-base">{current.description}</p>

        <div key={current.id} className="mt-8 animate-fade-in">
          {step === 0 && <RoleStep value={draft} onChange={update} />}
          {step === 1 && <LevelStep value={draft.level} onChange={(level) => update({ level })} />}
          {step === 2 && (
            <SkillsStep
              skills={draft.skills}
              onChange={(skills) => update({ skills })}
              role={role}
              fromScratch={draft.fromScratch}
              onFromScratch={(fromScratch) => update({ fromScratch })}
            />
          )}
          {step === 3 && <TimeStep value={draft.dailyMinutes} onChange={(dailyMinutes) => update({ dailyMinutes })} />}
          {step === 4 && (
            <>
              <TimelineStep value={draft.timelineWeeks} onChange={(timelineWeeks) => update({ timelineWeeks })} dailyMinutes={draft.dailyMinutes} />
              <div className="card mt-8 grid gap-4 p-5 text-sm sm:grid-cols-4">
                <Summary label="Target" value={role?.name} onEdit={() => setStep(0)} />
                <Summary label="Level" value={EXPERIENCE_LEVELS.find((l) => l.id === draft.level)?.label} onEdit={() => setStep(1)} />
                <Summary label="Skills" value={draft.skills.length ? `${draft.skills.length} selected` : 'Starting from scratch'} onEdit={() => setStep(2)} />
                <Summary
                  label="Schedule"
                  value={`${dailyTimeLabel(draft.dailyMinutes)} · ${timelineLabel(draft.timelineWeeks)}`}
                  hint={`~${weeklyHoursFor(draft.dailyMinutes)} h/week`}
                  onEdit={() => setStep(3)}
                />
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          {step > 0 ? (
            <Button variant="ghost" icon={ArrowLeft} onClick={back} disabled={submitting}>
              Back
            </Button>
          ) : (
            <span />
          )}
          {error && (
            <p className="flex-1 text-right text-sm text-danger-700 sm:text-left" role="alert">
              {error}
            </p>
          )}
          <Button className="ml-auto" size="lg" iconRight={ArrowRight} onClick={next} loading={submitting}>
            {isLast ? 'Analyze My Skill Gap' : 'Continue'}
          </Button>
        </div>
      </footer>
    </div>
  );
};

const Summary = ({ label, value, hint, onEdit }) => (
  <div>
    <div className="flex items-center justify-between">
      <p className="text-xs text-muted">{label}</p>
      <button type="button" onClick={onEdit} className="text-xs font-medium text-muted hover:text-ink">
        Edit
      </button>
    </div>
    <p className="mt-1 font-medium text-ink">{value || '—'}</p>
    {hint && <p className="text-xs text-muted">{hint}</p>}
  </div>
);

export default Onboarding;

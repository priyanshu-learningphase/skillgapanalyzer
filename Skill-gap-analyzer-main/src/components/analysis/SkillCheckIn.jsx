import { useEffect, useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Modal } from '../ui/Overlay';
import Button from '../ui/Button';
import Segmented from '../ui/Segmented';
import ProgressBar from '../ui/ProgressBar';
import { getSkill } from '../../data/skills';
import { levelLabel } from '../../data/options';
import { cx } from '../../lib/cx';

const RATINGS = [
  { value: 0, label: 'Not yet' },
  { value: 0.5, label: 'With help' },
  { value: 1, label: 'Confidently' },
];

const ADVANCED_WEIGHT = 1.5;

/**
 * Skill check-in: rate yourself topic by topic (basics → advanced) and get a
 * level, or set the level directly. Saving updates your analysis and marks
 * the roadmap for recalculation.
 */
const SkillCheckIn = ({ open, onClose, skillId, skillName, currentLevel = 0, targetLevel, onSave }) => {
  const skill = useMemo(() => getSkill(skillId, skillName), [skillId, skillName]);
  const topics = useMemo(
    () => [
      ...(skill?.topics || []).map((t) => ({ title: t, weight: 1 })),
      ...(skill?.advanced || []).map((t) => ({ title: t, weight: ADVANCED_WEIGHT, advanced: true })),
    ],
    [skill],
  );
  const [mode, setMode] = useState('assess');
  const [ratings, setRatings] = useState({});
  const [direct, setDirect] = useState(currentLevel);
  const [saving, setSaving] = useState(false);

  // Pre-fill from the current level so the check-in starts where you are.
  useEffect(() => {
    if (!open) return;
    const basics = skill?.topics?.length || 0;
    const known = Math.round((currentLevel / 100) * basics);
    setRatings(Object.fromEntries(topics.map((t, i) => [t.title, !t.advanced && i < known ? 1 : 0])));
    setDirect(currentLevel);
    setMode('assess');
  }, [open, currentLevel, topics, skill]);

  const assessed = useMemo(() => {
    const total = topics.reduce((s, t) => s + t.weight, 0) || 1;
    const score = topics.reduce((s, t) => s + t.weight * (ratings[t.title] ?? 0), 0);
    return Math.round((score / total) * 100);
  }, [topics, ratings]);

  const level = mode === 'assess' ? assessed : direct;

  const save = async () => {
    setSaving(true);
    try {
      await onSave(level, mode === 'assess' ? 'assessment' : 'manual');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${skill?.name || skillName} check-in`}
      description="Update your level to recalculate your gaps and roadmap."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving} disabled={level === currentLevel}>
            Save level
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Segmented
          options={[
            { value: 'assess', label: 'Topic check-in' },
            { value: 'direct', label: 'Set directly' },
          ]}
          value={mode}
          onChange={setMode}
          label="Check-in mode"
        />
        <div className="flex items-center gap-2 text-sm">
          <span className="tabular text-muted">{currentLevel}%</span>
          <ArrowRight className="h-3.5 w-3.5 text-muted-light" aria-hidden />
          <span className={cx('tabular font-semibold', level > currentLevel ? 'text-success-700' : level < currentLevel ? 'text-danger-700' : 'text-ink')}>
            {level}%
          </span>
          <span className="text-xs text-muted">({levelLabel(level)})</span>
        </div>
      </div>
      <ProgressBar value={level} marker={targetLevel} className="mt-4" label="New level" />
      {targetLevel != null && <p className="mt-1.5 text-xs text-muted">Role target: {targetLevel}%</p>}

      {mode === 'assess' ? (
        <ul className="mt-5 divide-y divide-line rounded-lg border border-line">
          {topics.map((topic) => (
            <li key={topic.title} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-ink">
                {topic.title}
                {topic.advanced && <span className="ml-2 text-[11px] font-medium uppercase tracking-wide text-accent-600">Advanced</span>}
              </span>
              <Segmented
                options={RATINGS}
                value={ratings[topic.title] ?? 0}
                onChange={(value) => setRatings((r) => ({ ...r, [topic.title]: value }))}
                label={`Confidence in ${topic.title}`}
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-6">
          <label htmlFor="direct-level" className="label">
            Your level: {direct}%
          </label>
          <input
            id="direct-level"
            type="range"
            min="0"
            max="100"
            step="5"
            value={direct}
            onChange={(e) => setDirect(Number(e.target.value))}
            className="w-full accent-ink"
          />
          <div className="mt-1 flex justify-between text-[11px] text-muted">
            <span>None</span>
            <span>Beginner</span>
            <span>Intermediate</span>
            <span>Advanced</span>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default SkillCheckIn;

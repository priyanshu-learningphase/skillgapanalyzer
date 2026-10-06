import { useMemo } from 'react';
import { X, Sprout } from 'lucide-react';
import SkillPicker from './SkillPicker';
import Segmented from '../ui/Segmented';
import { SKILL_LEVELS, nearestSkillLevel } from '../../data/options';
import { getSkill } from '../../data/skills';

/** Step 3: choose current skills and a confidence level for each. */
const SkillsStep = ({ skills, onChange, role, fromScratch, onFromScratch }) => {
  const suggestions = useMemo(() => {
    if (!role) return [];
    const ids = [...new Set(role.requirements.flatMap((r) => r.skills))];
    return ids.map((id) => getSkill(id, role.requirements.find((r) => r.skills.includes(id))?.skillNames?.[id])).filter(Boolean);
  }, [role]);

  const add = (skill) => {
    if (skills.some((s) => s.id === skill.id)) return;
    onChange([...skills, { id: skill.id, name: skill.name, level: SKILL_LEVELS[1].value }]);
    if (fromScratch) onFromScratch(false);
  };
  const setLevel = (id, level) => onChange(skills.map((s) => (s.id === id ? { ...s, level } : s)));
  const remove = (id) => onChange(skills.filter((s) => s.id !== id));

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <div className="card p-5">
        <SkillPicker
          selectedIds={skills.map((s) => s.id)}
          onAdd={add}
          suggestions={suggestions}
          suggestionLabel={role ? `Skills used by ${role.name}s` : 'Suggested'}
        />
      </div>

      <div className="card flex flex-col">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <p className="text-sm font-semibold text-ink">Your skills</p>
          <span className="tabular text-xs text-muted">{skills.length} selected</span>
        </div>
        {skills.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
            <p className="text-sm text-muted">Add the skills you already have and rate your confidence in each.</p>
            <label className="mt-5 inline-flex cursor-pointer items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={fromScratch}
                onChange={(e) => onFromScratch(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-ink focus:ring-accent"
              />
              <Sprout className="h-4 w-4 text-success-600" aria-hidden />
              I’m starting from scratch
            </label>
          </div>
        ) : (
          <ul className="max-h-[26rem] divide-y divide-line overflow-y-auto">
            {skills.map((skill) => (
              <li key={skill.id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => remove(skill.id)}
                    className="rounded p-0.5 text-muted-light hover:bg-slate-100 hover:text-ink"
                    aria-label={`Remove ${skill.name}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <span className="truncate text-sm font-medium text-ink">{skill.name}</span>
                  {skill.id.startsWith('custom:') && <span className="text-[11px] text-muted-light">custom</span>}
                </div>
                <Segmented
                  label={`${skill.name} level`}
                  value={nearestSkillLevel(skill.level).value}
                  onChange={(level) => setLevel(skill.id, level)}
                  options={SKILL_LEVELS.map((l) => ({ value: l.value, label: l.label }))}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default SkillsStep;

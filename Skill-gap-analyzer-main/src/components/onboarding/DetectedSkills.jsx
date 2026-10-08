import { Check } from 'lucide-react';
import { levelName } from '../../lib/analysis';
import { cx } from '../../lib/cx';

/** Checklist of detected skills to add, with an estimated level for each. */
const DetectedSkills = ({ skills, selected, onToggle, existingIds = new Set() }) => (
  <ul className="max-h-72 divide-y divide-line overflow-y-auto rounded-lg border border-line">
    {skills.map((s) => {
      const exists = existingIds.has(s.id);
      const checked = exists || selected.has(s.id);
      return (
        <li key={s.id}>
          <button
            type="button"
            role="checkbox"
            aria-checked={checked}
            disabled={exists}
            onClick={() => onToggle(s.id)}
            className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm disabled:cursor-default"
          >
            <span className={cx('flex h-4 w-4 shrink-0 items-center justify-center rounded border', checked ? 'border-ink bg-ink' : 'border-slate-300')} aria-hidden>
              {checked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
            </span>
            <span className="min-w-0 flex-1 truncate text-ink">{s.name}</span>
            <span className="text-xs text-muted">{exists ? 'Already added' : `${levelName(s.level)} · ${s.reason}`}</span>
          </button>
        </li>
      );
    })}
  </ul>
);

export default DetectedSkills;

import { useMemo, useState } from 'react';
import { Plus, Search, Check } from 'lucide-react';
import { SKILLS, SKILL_CATEGORIES, findSkillByName, makeCustomSkill } from '../../data/skills';
import { cx } from '../../lib/cx';

/**
 * Searchable skill chooser. Shows suggestions first, the full catalog by
 * category on demand, and lets users add skills that aren't in the catalog.
 */
const SkillPicker = ({ selectedIds, onAdd, suggestions = [], suggestionLabel = 'Suggested', placeholder = 'Search skills, e.g. React, SQL, Docker' }) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(null);
  const selected = new Set(selectedIds);
  const q = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!q) return [];
    return SKILLS.filter(
      (s) => s.name.toLowerCase().includes(q) || s.aliases?.some((a) => a.toLowerCase().includes(q)) || s.category.toLowerCase().includes(q),
    ).slice(0, 24);
  }, [q]);

  const exact = q ? findSkillByName(query) : null;
  const canAddCustom = q.length >= 2 && !exact;

  const addCustom = () => {
    const skill = makeCustomSkill(query);
    onAdd(skill);
    setQuery('');
  };

  const onKeyDown = (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    if (exact && !selected.has(exact.id)) {
      onAdd(exact);
      setQuery('');
    } else if (results[0] && !selected.has(results[0].id)) {
      onAdd(results[0]);
      setQuery('');
    } else if (canAddCustom) addCustom();
  };

  const chip = (skill) => {
    const isSelected = selected.has(skill.id);
    return (
      <button
        key={skill.id}
        type="button"
        onClick={() => !isSelected && onAdd(skill)}
        disabled={isSelected}
        className={cx(
          'inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[13px] transition-colors',
          isSelected ? 'border-transparent bg-slate-100 text-muted-light' : 'border-line bg-white text-ink hover:border-slate-400',
        )}
      >
        {isSelected ? <Check className="h-3 w-3" aria-hidden /> : <Plus className="h-3 w-3 text-muted" aria-hidden />}
        {skill.name}
      </button>
    );
  };

  const categorySkills = category ? SKILLS.filter((s) => s.category === category) : [];

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-light" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="input h-10 pl-9"
          aria-label="Search skills"
        />
      </div>

      {q ? (
        <div className="mt-3">
          <div className="flex flex-wrap gap-1.5">{results.map(chip)}</div>
          {results.length === 0 && !canAddCustom && <p className="text-sm text-muted">No matching skills.</p>}
          {canAddCustom && (
            <button type="button" onClick={addCustom} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-accent-600 hover:text-accent-700">
              <Plus className="h-3.5 w-3.5" aria-hidden /> Add “{query.trim()}” as a custom skill
            </button>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {suggestions.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-muted">{suggestionLabel}</p>
              <div className="flex flex-wrap gap-1.5">{suggestions.map(chip)}</div>
            </div>
          )}
          <div>
            <p className="mb-2 text-xs font-medium text-muted">Browse by category</p>
            <div className="flex flex-wrap gap-1.5">
              {SKILL_CATEGORIES.filter((c) => c !== 'Custom').map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(category === c ? null : c)}
                  aria-pressed={category === c}
                  className={cx(
                    'h-7 rounded-md px-2 text-xs font-medium transition-colors',
                    category === c ? 'bg-ink text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
            {category && <div className="mt-3 flex flex-wrap gap-1.5 animate-fade-in">{categorySkills.map(chip)}</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillPicker;

import { useMemo, useState } from 'react';
import { ArrowUpDown, ArrowDown, ArrowUp, Check, Plus, SlidersHorizontal } from 'lucide-react';
import PriorityBadge from '../ui/PriorityBadge';
import ProgressBar from '../ui/ProgressBar';
import Segmented from '../ui/Segmented';
import Button from '../ui/Button';
import { EmptyState } from '../ui/States';
import { PRIORITY_META, isIncludedInRoadmap, suggestedAction } from '../../lib/analysis';
import { cx } from '../../lib/cx';

const priorityRank = (item) => (item.priority ? PRIORITY_META[item.priority].rank : 9);

const SORTERS = {
  skill: (a, b) => a.skillName.localeCompare(b.skillName),
  current: (a, b) => a.current - b.current,
  required: (a, b) => a.required - b.required,
  gap: (a, b) => a.gap - b.gap,
  priority: (a, b) => priorityRank(a) - priorityRank(b) || b.priorityScore - a.priorityScore,
  category: (a, b) => a.category.localeCompare(b.category) || priorityRank(a) - priorityRank(b),
};

/** Roadmap action for a row: add/remove from roadmap, or nothing when met. */
const RowAction = ({ item, overrides, onToggle }) => {
  const action = suggestedAction(item);
  if (action === 'met') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-success-700">
        <Check className="h-3.5 w-3.5" aria-hidden /> Met
      </span>
    );
  }
  const included = isIncludedInRoadmap(item, overrides);
  if (included) {
    return (
      <Button variant="secondary" size="xs" icon={Check} onClick={() => onToggle(item, false)} aria-label={`Remove ${item.skillName} from roadmap`} className="text-success-700">
        In roadmap
      </Button>
    );
  }
  return (
    <Button variant="secondary" size="xs" icon={Plus} onClick={() => onToggle(item, true)}>
      {action === 'review' ? 'Review' : 'Add to Roadmap'}
    </Button>
  );
};

const SortHeader = ({ label, sortKey, sort, setSort, className }) => {
  const active = sort.key === sortKey;
  const Icon = active ? (sort.dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th scope="col" className={cx('px-3 py-2.5 font-medium', className)} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={() => setSort({ key: sortKey, dir: active && sort.dir === 'asc' ? 'desc' : 'asc' })}
        className={cx('inline-flex items-center gap-1 hover:text-ink', active && 'text-ink')}
      >
        {label}
        <Icon className="h-3 w-3" aria-hidden />
      </button>
    </th>
  );
};

const SkillGapTable = ({ items, overrides, onToggle, onEditLevel }) => {
  const [sort, setSort] = useState({ key: 'priority', dir: 'asc' });
  const [priority, setPriority] = useState('all');
  const [category, setCategory] = useState('all');
  const [showMet, setShowMet] = useState(true);

  const categories = useMemo(() => [...new Set(items.map((i) => i.category))].sort(), [items]);
  const counts = useMemo(() => {
    const c = { all: items.filter((i) => i.gap > 0).length };
    for (const p of Object.keys(PRIORITY_META)) c[p] = items.filter((i) => i.priority === p).length;
    return c;
  }, [items]);

  const rows = useMemo(() => {
    const filtered = items.filter(
      (i) => (priority === 'all' || i.priority === priority) && (category === 'all' || i.category === category) && (showMet || i.gap > 0),
    );
    const sorted = [...filtered].sort(SORTERS[sort.key]);
    return sort.dir === 'desc' ? sorted.reverse() : sorted;
  }, [items, priority, category, showMet, sort]);

  const priorityOptions = [
    { value: 'all', label: 'All gaps', count: counts.all },
    ...Object.entries(PRIORITY_META)
      .filter(([p]) => counts[p] > 0)
      .map(([p, meta]) => ({ value: p, label: meta.label, count: counts[p] })),
  ];

  return (
    <div>
      <div className="flex flex-col gap-3 border-b border-line px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-1 overflow-x-auto px-1">
          <Segmented options={priorityOptions} value={priority} onChange={setPriority} label="Filter by priority" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-xs text-muted">
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-7 rounded-md border border-line bg-white px-2 text-xs text-ink focus:border-accent focus:outline-none">
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-muted">
            <input type="checkbox" checked={showMet} onChange={(e) => setShowMet(e.target.checked)} className="h-3.5 w-3.5 rounded border-slate-300 text-ink focus:ring-accent" />
            Show met skills
          </label>
          <label className="inline-flex items-center gap-1.5 text-xs text-muted lg:hidden">
            Sort
            <select
              value={`${sort.key}:${sort.dir}`}
              onChange={(e) => {
                const [key, dir] = e.target.value.split(':');
                setSort({ key, dir });
              }}
              className="h-7 rounded-md border border-line bg-white px-2 text-xs text-ink"
            >
              <option value="priority:asc">Priority</option>
              <option value="gap:desc">Largest gap</option>
              <option value="category:asc">Category</option>
              <option value="skill:asc">Name</option>
            </select>
          </label>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState compact title="No skills match these filters" description="Try another priority or category." />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted">
                <tr className="border-b border-line">
                  <SortHeader label="Skill" sortKey="skill" sort={sort} setSort={setSort} className="pl-5" />
                  <SortHeader label="Current level" sortKey="current" sort={sort} setSort={setSort} />
                  <SortHeader label="Required" sortKey="required" sort={sort} setSort={setSort} />
                  <SortHeader label="Gap" sortKey="gap" sort={sort} setSort={setSort} />
                  <SortHeader label="Priority" sortKey="priority" sort={sort} setSort={setSort} />
                  <th scope="col" className="px-3 py-2.5 pr-5 text-right font-medium">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((item) => (
                  <tr key={item.key} className="group hover:bg-slate-50/70">
                    <td className="px-3 py-3 pl-5">
                      <button type="button" onClick={() => onEditLevel(item)} className="text-left">
                        <span className="block font-medium text-ink group-hover:underline group-hover:decoration-slate-300 group-hover:underline-offset-4">
                          {item.skillName}
                        </span>
                        <span className="block text-xs text-muted">
                          {item.options ? `${item.label} · ` : ''}
                          {item.category}
                          {item.inferred && ` · inferred from ${item.inferredFrom}`}
                        </span>
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <ProgressBar value={item.current} marker={item.required} size="sm" className="w-24" tone={item.gap === 0 ? 'success' : 'accent'} label={`${item.skillName} level`} />
                        <span className="tabular w-9 text-xs text-ink">{item.current}%</span>
                      </div>
                    </td>
                    <td className="tabular px-3 py-3 text-ink">{item.required}%</td>
                    <td className="tabular px-3 py-3">
                      <span className={item.gap ? 'font-medium text-ink' : 'text-muted'}>{item.gap ? `${item.gap}%` : '—'}</span>
                    </td>
                    <td className="px-3 py-3">
                      <PriorityBadge priority={item.priority} />
                    </td>
                    <td className="px-3 py-3 pr-5 text-right">
                      <RowAction item={item} overrides={overrides} onToggle={onToggle} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="divide-y divide-line lg:hidden">
            {rows.map((item) => (
              <li key={item.key} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <button type="button" onClick={() => onEditLevel(item)} className="min-w-0 text-left">
                    <span className="block font-medium text-ink">{item.skillName}</span>
                    <span className="block text-xs text-muted">{item.category}</span>
                  </button>
                  <PriorityBadge priority={item.priority} />
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <ProgressBar value={item.current} marker={item.required} size="sm" tone={item.gap === 0 ? 'success' : 'accent'} label={`${item.skillName} level`} />
                  <span className="tabular shrink-0 text-xs text-muted">
                    <span className="font-medium text-ink">{item.current}%</span> / {item.required}%
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-muted">{item.gap ? `Gap ${item.gap}%` : 'Requirement met'}</span>
                  <RowAction item={item} overrides={overrides} onToggle={onToggle} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default SkillGapTable;

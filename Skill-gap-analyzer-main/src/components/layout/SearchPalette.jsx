import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, CornerDownLeft, Compass, Route, BookOpen, UserCircle2, TrendingUp, FileText, Shuffle, FolderGit2, GraduationCap } from 'lucide-react';
import { PROJECTS } from '../../data/projects';
import { ASSESSMENT_SKILL_IDS } from '../../data/assessments/index';
import { NAV_ITEMS } from './Sidebar';
import { ROLES } from '../../data/roles';
import { SKILLS } from '../../data/skills';
import { useWorkspace } from '../../context/WorkspaceContext';
import { cx } from '../../lib/cx';

const MAX_PER_GROUP = 6;

/** ⌘K / Ctrl+K command palette across pages, careers, roadmap phases and skills. */
const SearchPalette = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { roadmap } = useWorkspace();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (...fields) => !q || fields.some((f) => f && f.toLowerCase().includes(q));
    const pages = [
      ...NAV_ITEMS,
      { to: '/skills/resume', label: 'Resume Analyzer', icon: FileText },
      { to: '/jobs/simulator', label: 'Career Simulator', icon: Shuffle },
      { to: '/careers', label: 'Role matches', icon: Compass },
      { to: '/progress', label: 'Progress', icon: TrendingUp },
      { to: '/resources', label: 'Resources', icon: BookOpen },
      { to: '/profile', label: 'Profile & settings', icon: UserCircle2 },
    ]
      .filter((p) => match(p.label))
      .map((p) => ({ id: `page:${p.to}`, label: p.label, to: p.to, icon: p.icon, hint: 'Page' }));
    const phases = (roadmap?.phases || [])
      .filter((p) => match(p.title, ...p.skills.map((s) => s.name)))
      .slice(0, MAX_PER_GROUP)
      .map((p) => ({ id: `phase:${p.id}`, label: p.title, to: `/roadmap/${p.id}`, icon: Route, hint: `Week ${p.weekStart}` }));
    const careers = ROLES.filter((r) => match(r.name, r.track))
      .slice(0, MAX_PER_GROUP)
      .map((r) => ({ id: `role:${r.id}`, label: r.name, to: `/careers/${r.id}`, icon: Compass, hint: r.track }));
    const skills = q
      ? SKILLS.filter((s) => match(s.name, ...(s.aliases || [])))
          .slice(0, MAX_PER_GROUP)
          .map((s) => ({ id: `skill:${s.id}`, label: s.name, to: `/resources?skill=${s.id}`, icon: BookOpen, hint: s.category }))
      : [];
    const projects = q
      ? PROJECTS.filter((p) => match(p.title, ...p.stack))
          .slice(0, MAX_PER_GROUP)
          .map((p) => ({ id: `project:${p.id}`, label: p.title, to: `/projects/${p.id}`, icon: FolderGit2, hint: p.difficulty }))
      : [];
    const assessments = q
      ? SKILLS.filter((s) => ASSESSMENT_SKILL_IDS.includes(s.id) && match(s.name, ...(s.aliases || [])))
          .slice(0, 4)
          .map((s) => ({ id: `assess:${s.id}`, label: `${s.name} assessment`, to: `/assessments/${s.id}`, icon: GraduationCap, hint: '8 questions' }))
      : [];
    return [
      { title: 'Pages', items: pages },
      { title: 'Roadmap', items: phases },
      { title: 'Projects', items: projects },
      { title: 'Assessments', items: assessments },
      { title: 'Career paths', items: careers },
      { title: 'Skills & resources', items: skills },
    ].filter((g) => g.items.length);
  }, [query, roadmap]);

  const flat = groups.flatMap((g) => g.items);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  const go = (item) => {
    onClose();
    navigate(item.to);
  };

  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => Math.min(flat.length - 1, i + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (event.key === 'Enter' && flat[active]) {
      event.preventDefault();
      go(flat[active]);
    } else if (event.key === 'Escape') {
      onClose();
    }
  };

  let index = -1;
  return createPortal(
    <div className="fixed inset-0 z-[65] flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 bg-slate-900/30 animate-fade-in" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-lg overflow-hidden rounded-card border border-line bg-white shadow-pop animate-fade-in" role="dialog" aria-modal="true" aria-label="Search">
        <div className="flex items-center gap-2 border-b border-line px-4">
          <Search className="h-4 w-4 text-muted" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search pages, skills, projects, assessments…"
            className="h-12 flex-1 bg-transparent text-sm text-ink placeholder:text-muted-light focus:outline-none"
            role="combobox"
            aria-expanded="true"
            aria-controls="search-results"
            aria-activedescendant={flat[active] ? `search-${flat[active].id}` : undefined}
          />
          <kbd className="rounded border border-line px-1.5 py-0.5 text-[10px] font-medium text-muted">Esc</kbd>
        </div>
        <div ref={listRef} id="search-results" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
          {flat.length === 0 && <p className="px-3 py-8 text-center text-sm text-muted">No results for “{query}”.</p>}
          {groups.map((group) => (
            <div key={group.title} className="mb-1">
              <p className="px-2 pb-1 pt-2 text-[11px] font-medium text-muted-light">{group.title}</p>
              {group.items.map((item) => {
                index += 1;
                const i = index;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    id={`search-${item.id}`}
                    data-index={i}
                    role="option"
                    aria-selected={i === active}
                    type="button"
                    onMouseMove={() => setActive(i)}
                    onClick={() => go(item)}
                    className={cx('flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm', i === active ? 'bg-slate-100 text-ink' : 'text-ink')}
                  >
                    <Icon className="h-4 w-4 text-muted" aria-hidden />
                    <span className="flex-1 truncate">{item.label}</span>
                    <span className="text-xs text-muted-light">{item.hint}</span>
                    {i === active && <CornerDownLeft className="h-3.5 w-3.5 text-muted" aria-hidden />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default SearchPalette;

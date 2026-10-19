import { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Puzzle,
  ScanSearch,
  Route,
  FolderGit2,
  GraduationCap,
  Briefcase,
  KanbanSquare,
  FileText,
  CalendarDays,
  Globe2,
  SquareUser,
  MessagesSquare,
  Github,
  UserCircle2,
  Building2,
  HardDrive,
  TrendingUp,
} from 'lucide-react';
import Logo from './Logo';
import ProgressBar from '../ui/ProgressBar';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { upcomingItems } from '../../lib/applications';
import { cx } from '../../lib/cx';

/** Navigation, grouped by what the user is doing. */
export const NAV_GROUPS = [
  { label: null, items: [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
  {
    label: 'Learn',
    items: [
      { to: '/skills', label: 'My Skills', icon: Puzzle },
      { to: '/gap', label: 'Skill Gap', icon: ScanSearch },
      { to: '/roadmap', label: 'Roadmap', icon: Route },
      { to: '/calendar', label: 'Calendar', icon: CalendarDays },
    ],
  },
  {
    label: 'Practice',
    items: [
      { to: '/assessments', label: 'Assessments', icon: GraduationCap },
      { to: '/projects', label: 'Projects', icon: FolderGit2 },
    ],
  },
  {
    label: 'Career',
    items: [
      { to: '/jobs', label: 'Jobs', icon: Briefcase },
      { to: '/applications', label: 'Applications', icon: KanbanSquare },
      { to: '/resume', label: 'Resume', icon: FileText },
      { to: '/interview', label: 'Interview Prep', icon: MessagesSquare },
    ],
  },
  {
    label: 'Insights',
    items: [
      { to: '/market', label: 'Market insights', icon: Globe2 },
      { to: '/progress', label: 'Progress', icon: TrendingUp },
    ],
  },
  {
    label: 'Profile',
    items: [
      { to: '/github', label: 'GitHub', icon: Github },
      { to: '/portfolio', label: 'Portfolio', icon: SquareUser },
      { to: '/profile', label: 'Settings', icon: UserCircle2 },
    ],
  },
];

export const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

const NavItem = ({ to, label, icon: Icon, badge, onNavigate }) => (
  <NavLink
    to={to}
    onClick={onNavigate}
    className={({ isActive }) =>
      cx(
        'group flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium transition-colors',
        isActive ? 'bg-slate-100 text-ink' : 'text-muted hover:bg-slate-50 hover:text-ink',
      )
    }
  >
    {({ isActive }) => (
      <>
        <Icon className={cx('h-4 w-4', isActive ? 'text-ink' : 'text-muted-light group-hover:text-muted')} aria-hidden />
        <span className="flex-1">{label}</span>
        {badge}
      </>
    )}
  </NavLink>
);

const Sidebar = ({ onNavigate }) => {
  const { isAdmin, isLocalMode } = useAuth();
  const { role, analysis, stats, roadmapState, tracker } = useWorkspace();

  // Overdue actions and interviews in the next two days.
  const urgent = useMemo(() => upcomingItems(tracker.applications, { days: 2 }).filter((i) => i.overdue || i.kind === 'interview').length, [tracker.applications]);

  const badges = {
    '/roadmap':
      roadmapState === 'stale' || roadmapState === 'role-changed' ? (
        <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-label="Roadmap needs an update" />
      ) : stats ? (
        <span className="tabular text-[11px] text-muted-light">{stats.pct}%</span>
      ) : null,
    '/applications': urgent ? (
      <span className="tabular rounded-full bg-warning-50 px-1.5 text-[11px] font-medium text-warning-700" aria-label={`${urgent} need attention`}>
        {urgent}
      </span>
    ) : null,
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center px-4">
        <Logo to="/dashboard" />
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-2" aria-label="Main">
        {NAV_GROUPS.map((group) => (
          <div key={group.label || 'home'} className={group.label ? 'mt-4' : 'mt-1'}>
            {group.label && <p className="mb-1 px-2.5 text-2xs font-semibold uppercase tracking-[0.08em] text-muted-light">{group.label}</p>}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItem key={item.to} {...item} onNavigate={onNavigate} badge={badges[item.to] || null} />
              ))}
            </div>
          </div>
        ))}
        {isAdmin && (
          <div className="mt-4">
            <p className="mb-1 px-2.5 text-2xs font-semibold uppercase tracking-[0.08em] text-muted-light">Placement cell</p>
            <NavItem to="/admin" label="Campus analytics" icon={Building2} onNavigate={onNavigate} />
          </div>
        )}
      </nav>

      <div className="space-y-3 border-t border-line p-3">
        {role && analysis ? (
          <NavLink to="/gap" onClick={onNavigate} className="block rounded-lg border border-line bg-white p-3 transition-colors hover:border-slate-300">
            <p className="eyebrow">Target</p>
            <p className="mt-1 truncate text-[13px] font-semibold text-ink">{role.name}</p>
            {role.company && <p className="truncate text-xs text-muted">at {role.company.name}</p>}
            <div className="mt-2 flex items-center gap-2">
              <ProgressBar value={analysis.readiness} size="sm" label="Career readiness" />
              <span className="tabular text-xs font-medium text-ink">{analysis.readiness}</span>
            </div>
          </NavLink>
        ) : null}
        {isLocalMode && (
          <p className="flex items-center gap-1.5 px-1 text-[11px] text-muted-light">
            <HardDrive className="h-3 w-3" aria-hidden />
            Data saved in this browser
          </p>
        )}
      </div>
    </div>
  );
};

export default Sidebar;

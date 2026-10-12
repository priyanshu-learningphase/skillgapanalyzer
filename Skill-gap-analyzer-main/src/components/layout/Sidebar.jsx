import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Puzzle,
  ScanSearch,
  Route,
  FolderGit2,
  GraduationCap,
  Briefcase,
  MessagesSquare,
  Github,
  UserCircle2,
  Building2,
  HardDrive,
} from 'lucide-react';
import Logo from './Logo';
import ProgressBar from '../ui/ProgressBar';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { cx } from '../../lib/cx';

export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/skills', label: 'My Skills', icon: Puzzle },
  { to: '/gap', label: 'Skill Gap', icon: ScanSearch },
  { to: '/roadmap', label: 'Roadmap', icon: Route },
  { to: '/projects', label: 'Projects', icon: FolderGit2 },
  { to: '/assessments', label: 'Assessments', icon: GraduationCap },
  { to: '/jobs', label: 'Jobs', icon: Briefcase, also: ['/careers'] },
  { to: '/interview', label: 'Interview Prep', icon: MessagesSquare },
  { to: '/github', label: 'GitHub', icon: Github },
];

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
  const { role, analysis, stats, roadmapState } = useWorkspace();

  const roadmapBadge =
    roadmapState === 'stale' || roadmapState === 'role-changed' ? (
      <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-label="Roadmap needs an update" />
    ) : stats ? (
      <span className="tabular text-[11px] text-muted-light">{stats.pct}%</span>
    ) : null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center px-4">
        <Logo to="/dashboard" />
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2" aria-label="Main">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.to} {...item} onNavigate={onNavigate} badge={item.to === '/roadmap' ? roadmapBadge : null} />
        ))}
        <div className="my-3 h-px bg-line" />
        <NavItem to="/profile" label="Profile" icon={UserCircle2} onNavigate={onNavigate} />
        {isAdmin && <NavItem to="/admin" label="Campus analytics" icon={Building2} onNavigate={onNavigate} />}
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

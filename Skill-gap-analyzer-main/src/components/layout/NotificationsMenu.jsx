import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Bell, RefreshCw, PauseCircle, Flame, Route, ScanSearch, Inbox } from 'lucide-react';
import Popover from '../ui/Popover';
import { useWorkspace } from '../../context/WorkspaceContext';
import { currentStreak, dayKey, relativeTime } from '../../lib/progress';
import { cx } from '../../lib/cx';

/**
 * Notifications are derived from real state: nudges (things that need your
 * attention now) plus your recent activity feed.
 */
const useNudges = () => {
  const { isOnboarded, roadmap, roadmapState, progress, role } = useWorkspace();
  return useMemo(() => {
    const nudges = [];
    if (!isOnboarded) {
      nudges.push({ id: 'onboard', icon: ScanSearch, title: 'Finish your skill analysis', body: 'Pick a target role and add your skills.', to: '/onboarding' });
      return nudges;
    }
    if (!roadmap) {
      nudges.push({ id: 'generate', icon: Route, title: 'Generate your roadmap', body: `Turn your ${role?.name} skill gaps into a plan.`, to: '/roadmap' });
    } else if (roadmapState === 'role-changed') {
      nudges.push({ id: 'role-changed', icon: RefreshCw, title: 'Your goal changed', body: `Generate a roadmap for ${role?.name}.`, to: '/roadmap' });
    } else if (roadmapState === 'stale') {
      nudges.push({ id: 'stale', icon: RefreshCw, title: 'Update your roadmap', body: 'Your skills or preferences changed since it was generated.', to: '/roadmap' });
    }
    if (roadmap?.status === 'paused') {
      nudges.push({ id: 'paused', icon: PauseCircle, title: 'Your roadmap is paused', body: 'Resume when you’re ready to continue.', to: '/roadmap' });
    }
    const streak = currentStreak(progress.activeDates);
    if (roadmap && roadmap.status !== 'paused' && streak > 0 && !progress.activeDates.includes(dayKey())) {
      nudges.push({ id: 'streak', icon: Flame, title: `Keep your ${streak}-day streak`, body: 'Complete one task today to keep it going.', to: '/roadmap' });
    }
    return nudges;
  }, [isOnboarded, roadmap, roadmapState, progress, role]);
};

const NotificationsMenu = () => {
  const { progress, actions } = useWorkspace();
  const nudges = useNudges();
  const unread = progress.activity.filter((a) => !progress.lastSeenActivityAt || a.at > progress.lastSeenActivityAt).length;
  const count = unread + nudges.length;

  return (
    <Popover
      panelClassName="w-[min(22rem,calc(100vw-2rem))]"
      onOpenChange={(open) => {
        if (!open && unread) actions.markActivitySeen();
      }}
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-label={count ? `Notifications (${count} new)` : 'Notifications'}
          className="relative inline-flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-slate-100 hover:text-ink"
        >
          <Bell className="h-4 w-4" />
          {count > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent ring-2 ring-white" />}
        </button>
      )}
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold text-ink">Notifications</p>
            {unread > 0 && (
              <button type="button" className="text-xs font-medium text-muted hover:text-ink" onClick={() => actions.markActivitySeen()}>
                Mark all as read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {nudges.map((n) => (
              <Link key={n.id} to={n.to} onClick={close} className="flex gap-3 border-b border-line px-4 py-3 hover:bg-slate-50">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent-50">
                  <n.icon className="h-3.5 w-3.5 text-accent-600" aria-hidden />
                </span>
                <span className="min-w-0 text-sm">
                  <span className="block font-medium text-ink">{n.title}</span>
                  <span className="block text-muted">{n.body}</span>
                </span>
              </Link>
            ))}
            {progress.activity.length === 0 && nudges.length === 0 && (
              <div className="flex flex-col items-center px-4 py-10 text-center">
                <Inbox className="h-5 w-5 text-muted-light" aria-hidden />
                <p className="mt-2 text-sm text-muted">You’re all caught up.</p>
              </div>
            )}
            {progress.activity.slice(0, 12).map((a) => {
              const isUnread = !progress.lastSeenActivityAt || a.at > progress.lastSeenActivityAt;
              return (
                <div key={a.id} className="flex gap-3 px-4 py-2.5">
                  <span className={cx('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', isUnread ? 'bg-accent' : 'bg-slate-200')} aria-hidden />
                  <div className="min-w-0 text-sm">
                    <p className="text-ink">{a.message}</p>
                    <p className="text-xs text-muted-light">{relativeTime(a.at)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Popover>
  );
};

export default NotificationsMenu;

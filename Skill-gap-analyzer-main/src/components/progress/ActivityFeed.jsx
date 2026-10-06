import { CheckCircle2, Route, ScanSearch, Clock, Target, Flag, PauseCircle, RefreshCw, TrendingUp } from 'lucide-react';
import { relativeTime } from '../../lib/progress';

const ICONS = {
  task: CheckCircle2,
  phase: Flag,
  roadmap: Route,
  'roadmap-updated': RefreshCw,
  'roadmap-status': PauseCircle,
  analysis: ScanSearch,
  skills: TrendingUp,
  hours: Clock,
  target: Target,
};

const ActivityFeed = ({ items, limit = 8, empty = 'No activity yet.' }) => {
  if (!items.length) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ol className="space-y-3">
      {items.slice(0, limit).map((item) => {
        const Icon = ICONS[item.type] || CheckCircle2;
        return (
          <li key={item.id} className="flex gap-3">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-light" aria-hidden />
            <div className="min-w-0 text-sm">
              <p className="text-ink">{item.message}</p>
              <p className="text-xs text-muted-light">{relativeTime(item.at)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
};

export default ActivityFeed;

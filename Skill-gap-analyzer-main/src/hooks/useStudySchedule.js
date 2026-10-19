import { useCallback, useMemo } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { buildSchedule, missedSessions, planSnapshot } from '../lib/schedule';
import { ACTIVE_STATUSES } from '../lib/applications';
import { dayKey } from '../lib/progress';

const newId = () => `ev_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/**
 * The study calendar: built live from the roadmap, the user's availability
 * and events, and interviews from the application tracker.
 */
export const useStudySchedule = () => {
  const { roadmap, roadmapState, progress, schedule, tracker, actions } = useWorkspace();
  const today = dayKey();
  const liveRoadmap = roadmapState === 'role-changed' ? null : roadmap;

  const interviews = useMemo(
    () =>
      tracker.applications
        .filter((a) => ACTIVE_STATUSES.includes(a.status))
        .flatMap((a) => (a.interviews || []).filter((r) => r.outcome === 'scheduled' && r.date && r.date.slice(0, 10) >= today).map((r) => ({ id: `${a.id}:${r.id}`, title: `${r.round} — ${a.company}`, date: r.date.slice(0, 10), appId: a.id }))),
    [tracker.applications, today],
  );

  const built = useMemo(() => buildSchedule({ roadmap: liveRoadmap, completedTasks: progress.completedTasks, schedule, interviews, today }), [liveRoadmap, progress.completedTasks, schedule, interviews, today]);
  const missed = useMemo(() => (schedule.configured ? missedSessions(schedule.plan, progress.completedTasks, today) : []), [schedule, progress.completedTasks, today]);

  /** Save settings and a fresh plan snapshot in one write. */
  const saveSettings = useCallback(
    (patch) =>
      actions.updateSchedule((s) => {
        const next = { ...s, ...patch, configured: true };
        const fresh = buildSchedule({ roadmap: liveRoadmap, completedTasks: progress.completedTasks, schedule: next, interviews, today });
        return { ...next, plan: planSnapshot(fresh) };
      }),
    [actions, liveRoadmap, progress.completedTasks, interviews, today],
  );

  const reschedule = useCallback(
    () =>
      actions.updateSchedule((s) => {
        // Drop pins that are now in the past; everything unfinished flows forward from today.
        const pins = Object.fromEntries(Object.entries(s.pins || {}).filter(([, date]) => date >= today));
        const next = { ...s, pins };
        const fresh = buildSchedule({ roadmap: liveRoadmap, completedTasks: progress.completedTasks, schedule: next, interviews, today });
        return { ...next, plan: planSnapshot(fresh) };
      }),
    [actions, liveRoadmap, progress.completedTasks, interviews, today],
  );

  const addEvent = useCallback((event) => saveSettings({ events: [...schedule.events, { ...event, id: newId(), title: event.title.trim() }].sort((a, b) => a.date.localeCompare(b.date)) }), [saveSettings, schedule.events]);
  const removeEvent = useCallback((id) => saveSettings({ events: schedule.events.filter((e) => e.id !== id) }), [saveSettings, schedule.events]);
  const pinTask = useCallback((taskId, date) => saveSettings({ pins: { ...schedule.pins, [taskId]: date } }), [saveSettings, schedule.pins]);
  const unpinTask = useCallback(
    (taskId) => {
      const { [taskId]: _removed, ...pins } = schedule.pins;
      return saveSettings({ pins });
    },
    [saveSettings, schedule.pins],
  );

  return { schedule, roadmap: liveRoadmap, built, missed, today, interviews, saveSettings, reschedule, addEvent, removeEvent, pinTask, unpinTask, toggleTask: actions.toggleTask };
};

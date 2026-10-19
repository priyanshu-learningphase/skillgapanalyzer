import { useCallback, useMemo } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import {
  applicationStats,
  completeNextAction,
  createApplication,
  matchApplication,
  MAX_APPLICATIONS,
  removeContact,
  removeInterview,
  saveContact,
  saveInterview,
  setStatus,
  STATUS_MAP,
  updateApplication,
  upcomingItems,
} from '../lib/applications';

/**
 * Application tracker state and actions. Job matches are derived live from
 * the user's current skills, so they stay in sync as skills change.
 */
export const useApplications = () => {
  const { tracker, analysis, career, actions } = useWorkspace();
  const applications = tracker.applications;

  const matches = useMemo(() => {
    const byId = {};
    if (!analysis) return byId;
    for (const app of applications) byId[app.id] = matchApplication(app, analysis.levels, career?.skills || []);
    return byId;
  }, [applications, analysis, career]);

  const matchPct = useMemo(() => Object.fromEntries(Object.entries(matches).map(([id, m]) => [id, m?.match ?? null])), [matches]);

  const mutate = useCallback(
    (id, fn, activity) => actions.updateTracker((list) => list.map((app) => (app.id === id ? fn(app) : app)), activity),
    [actions],
  );

  const add = useCallback(
    async (input) => {
      if (applications.length >= MAX_APPLICATIONS) throw new Error(`You can track up to ${MAX_APPLICATIONS} applications. Delete old ones to add more.`);
      const app = createApplication(input);
      await actions.updateTracker((list) => [app, ...list], { message: `Tracking ${app.role} at ${app.company}` });
      return app;
    },
    [actions, applications.length],
  );

  const update = useCallback((id, input) => mutate(id, (app) => updateApplication(app, input)), [mutate]);

  const move = useCallback(
    (id, status, note) => {
      const app = applications.find((a) => a.id === id);
      if (!app || app.status === status) return null;
      return mutate(id, (a) => setStatus(a, status, note), { message: `${app.company}: moved to ${STATUS_MAP[status].label}` });
    },
    [applications, mutate],
  );

  const remove = useCallback((id) => actions.updateTracker((list) => list.filter((app) => app.id !== id)), [actions]);

  return {
    applications,
    matches,
    matchPct,
    stats: useMemo(() => applicationStats(applications), [applications]),
    upcoming: useMemo(() => upcomingItems(applications), [applications]),
    add,
    update,
    move,
    remove,
    saveInterview: useCallback((id, round) => mutate(id, (app) => saveInterview(app, round)), [mutate]),
    removeInterview: useCallback((id, roundId) => mutate(id, (app) => removeInterview(app, roundId)), [mutate]),
    saveContact: useCallback((id, contact) => mutate(id, (app) => saveContact(app, contact)), [mutate]),
    removeContact: useCallback((id, contactId) => mutate(id, (app) => removeContact(app, contactId)), [mutate]),
    completeNextAction: useCallback((id) => mutate(id, (app) => completeNextAction(app)), [mutate]),
  };
};

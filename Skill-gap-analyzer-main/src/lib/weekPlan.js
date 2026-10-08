/**
 * "This week" — an actionable checklist sized to the user's weekly hours,
 * drawn from the roadmap in order, plus a recurring practice habit when the
 * role needs it.
 */

import { dayKey } from './progress.js';
import { hasAssessment } from '../data/assessments/index.js';

/** Monday of the current week as YYYY-MM-DD; keys weekly checklists. */
export const weekKey = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return dayKey(d);
};

const MAX_ITEMS = 6;

export const buildWeekPlan = ({ roadmap, completedTasks = {}, weekChecks = {}, analysis }) => {
  if (!roadmap || roadmap.status === 'paused') return [];
  const budget = roadmap.settings?.weeklyHours || 6;
  const startOfWeek = `${weekKey()}T00:00:00`;
  const items = [];
  let hours = 0;

  for (const phase of roadmap.phases) {
    for (const task of phase.tasks) {
      const completedAt = completedTasks[task.id];
      // Done earlier: hide. Done this week: keep it on the list, checked.
      if (completedAt && new Date(completedAt) < new Date(startOfWeek)) continue;
      if (items.length >= MAX_ITEMS - 1 || (hours >= budget && items.length >= 3)) break;
      const assessmentLink = task.type === 'assess' && task.skillId ? (hasAssessment(task.skillId) ? `/assessments/${task.skillId}` : `/gap?skill=${task.skillId}`) : null;
      items.push({
        id: task.id,
        kind: task.type === 'assess' ? 'assessment' : 'task',
        title: task.title,
        hours: task.hours,
        phaseId: phase.id,
        phaseTitle: phase.title,
        type: task.type,
        link: assessmentLink || (task.projectId ? `/projects/${task.projectId}` : null),
        done: Boolean(completedAt),
      });
      hours += task.hours;
    }
    if (items.length >= MAX_ITEMS - 1 || (hours >= budget && items.length >= 3)) break;
  }

  // Interview-style practice keeps DSA sharp for roles that test it.
  const dsaGap = analysis?.gaps.find((g) => g.skillId === 'dsa' || g.skillId === 'algorithms');
  if (dsaGap) {
    const id = 'habit:dsa-practice';
    items.push({
      id,
      kind: 'habit',
      title: 'Solve 15 DSA problems',
      hours: 5,
      link: 'https://neetcode.io/practice',
      external: true,
      done: Boolean(weekChecks[weekKey()]?.[id]),
    });
  }
  return items;
};

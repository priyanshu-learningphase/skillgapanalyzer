import { useMemo } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { buildInterviewPlan } from '../lib/interview';
import { PROJECT_MAP } from '../data/projects';

/** The user's interview plan: questions from their role, gaps, results and own projects. */
export const useInterviewPlan = () => {
  const { role, analysis, latestAssessments, progress, insights } = useWorkspace();

  const projectTitles = useMemo(() => {
    const completed = Object.entries(progress.projects || {})
      .filter(([, p]) => p.status === 'completed')
      .map(([id, p]) => PROJECT_MAP[id]?.title || p.title);
    const resume = insights.resume?.parsed?.projects?.map((p) => p.title) || [];
    const github = insights.github?.repos?.slice(0, 2).map((r) => r.name) || [];
    return [...completed, ...resume, ...github];
  }, [progress.projects, insights]);

  return useMemo(
    () => (role && analysis ? buildInterviewPlan({ role, analysis, company: role.company, latestAssessments, projectTitles }) : null),
    [role, analysis, latestAssessments, projectTitles],
  );
};

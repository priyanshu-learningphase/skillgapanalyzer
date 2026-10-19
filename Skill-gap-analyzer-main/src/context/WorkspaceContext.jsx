/**
 * Workspace context
 *
 * Owns the user's career profile, analysis history, roadmap, progress,
 * insights, job applications and study schedule.
 * Analysis is always derived live from the profile (deterministic), while
 * snapshots are stored for history and campus analytics. Every mutation is
 * applied optimistically and persisted through workspaceRepository; failures
 * surface as a toast with a retry.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { workspaceRepository as repo } from '../services/workspaceRepository';
import { generateRoadmap as runGeneration } from '../services/roadmapService';
import { analyzeRole, rankCareerMatches, toAnalysisSnapshot } from '../lib/analysis';
import { describeDiff, diffRoadmaps, isEmptyDiff, preserveCompletedTasks, roadmapInputsKey, roadmapStats } from '../lib/roadmap';
import { buildCustomRole, resolveLegacyRoleId, resolveRole } from '../data/roles';
import { findSkillByName, getSkill, makeCustomSkill } from '../data/skills';
import { dayKey, emptyInsights, emptyProgress, makeActivity, markActive, normalizeInsights, normalizeProgress, pushActivity } from '../lib/progress';
import { latestBySkill, levelAfterAssessment, passed, recommendationFor } from '../lib/assessment';
import { jobToCustomRole } from '../lib/jobDescription';
import { weekKey } from '../lib/weekPlan';
import { PROJECT_MAP } from '../data/projects';
import { genericProjectFor } from '../lib/projects';
import { hasAssessment } from '../data/assessments/index';
import { emptyTracker, normalizeTracker } from '../lib/applications';
import { emptySchedule, normalizeSchedule } from '../lib/schedule';
import { buildEvidence } from '../lib/evidence';
import { levelAfterPractical } from '../lib/labGrading';
import { MAX_MOCK_SESSIONS } from '../lib/mockInterview';

const WorkspaceContext = createContext(null);

const initialState = {
  status: 'loading',
  error: null,
  career: null,
  analyses: [],
  roadmap: null,
  progress: emptyProgress(),
  insights: emptyInsights(),
  tracker: emptyTracker(),
  schedule: emptySchedule(),
};

/** Workspace slices saved as their own documents. */
const PERSISTED = ['career', 'roadmap', 'progress', 'insights', 'tracker', 'schedule'];
export const BACKUP_VERSION = 1;

/** Projects can be catalog entries or generated per skill. */
const projectById = (id) => PROJECT_MAP[id] || (id?.startsWith('skill-') ? genericProjectFor(id.slice(6)) : null);

const friendlyError = (error) => {
  const message = error?.message || '';
  if (error?.code === 'permission-denied') return 'You don’t have permission to access this data.';
  if (error?.code === 'unavailable' || /network|offline|failed to fetch/i.test(message)) {
    return 'You appear to be offline. Check your connection and try again.';
  }
  return message || 'Unexpected error.';
};

/** Turn the original app's flat skill list into a career profile. */
const migrateLegacy = (legacy) => {
  if (!legacy?.skills?.length) return null;
  const seen = new Set();
  const skills = [];
  for (const name of legacy.skills) {
    const skill = findSkillByName(name) || makeCustomSkill(name);
    if (seen.has(skill.id)) continue;
    seen.add(skill.id);
    skills.push({ id: skill.id, name: skill.name, level: 60 });
  }
  return {
    targetRoleId: resolveLegacyRoleId(legacy.career_interest),
    level: 'intermediate',
    skills,
    dailyMinutes: 60,
    timelineWeeks: 12,
    roadmapOverrides: {},
    migrated: true,
    onboardedAt: null,
  };
};

const withActivity = (progress, type, message, meta) => pushActivity(progress, makeActivity(type, message, meta));

const newId = (prefix) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** History entries for every skill whose level changed. */
const skillChanges = (before = [], after = [], source) => {
  const previous = new Map(before.map((s) => [s.id, s.level]));
  const date = new Date().toISOString();
  return after
    .filter((s) => previous.get(s.id) !== s.level)
    .map((s) => ({ date, skillId: s.id, name: s.name, from: previous.get(s.id) ?? 0, to: s.level, source }));
};

export const WorkspaceProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const toast = useToast();
  const uid = currentUser?.uid || null;

  const [state, setState] = useState(initialState);
  const [syncStatus, setSyncStatus] = useState('idle');
  const stateRef = useRef(state);

  const setAll = useCallback((next) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const persist = useCallback(
    async (keys) => {
      if (!uid || !keys.length) return true;
      setSyncStatus('saving');
      try {
        const s = stateRef.current;
        await Promise.all(
          keys.map((key) => {
            if (key === 'career') return repo.saveCareer(uid, s.career);
            if (key === 'roadmap') return repo.saveRoadmap(uid, s.roadmap);
            if (key === 'progress') return repo.saveProgress(uid, s.progress);
            if (key === 'insights') return repo.saveInsights(uid, s.insights);
            if (key === 'tracker') return repo.saveTracker(uid, s.tracker);
            if (key === 'schedule') return repo.saveSchedule(uid, s.schedule);
            return null;
          }),
        );
        setSyncStatus('saved');
        return true;
      } catch (error) {
        console.error('Save failed', error);
        setSyncStatus('error');
        toast.error('Couldn’t save your changes', {
          description: friendlyError(error),
          action: { label: 'Retry', onClick: () => persist(keys) },
        });
        return false;
      }
    },
    [uid, toast],
  );

  /** Apply a patch to state and persist the changed collections. */
  const commit = useCallback(
    (patch) => {
      setAll({ ...stateRef.current, ...patch });
      return persist(Object.keys(patch).filter((k) => PERSISTED.includes(k)));
    },
    [persist, setAll],
  );

  const load = useCallback(async () => {
    if (!uid) {
      setAll({ ...initialState, status: 'ready' });
      return;
    }
    setAll({ ...stateRef.current, status: 'loading', error: null });
    try {
      const data = await repo.load(uid);
      let career = data.career;
      const migrated = !career && migrateLegacy(data.legacy);
      if (migrated) career = migrated;
      setAll({
        status: 'ready',
        error: null,
        career,
        analyses: data.analyses,
        roadmap: data.roadmap,
        progress: data.progress,
        insights: data.insights,
        tracker: data.tracker || emptyTracker(),
        schedule: data.schedule || emptySchedule(),
      });
      if (migrated) persist(['career']);
    } catch (error) {
      console.error('Workspace load failed', error);
      setAll({ ...stateRef.current, status: 'error', error: friendlyError(error) });
    }
  }, [uid, persist, setAll]);

  useEffect(() => {
    load();
  }, [load]);

  /** Store an analysis snapshot for history (readiness trend, campus analytics). */
  const recordAnalysis = useCallback(
    async (career, reason) => {
      const role = resolveRole(career);
      if (!uid || !role) return null;
      const analysis = analyzeRole(role, career.skills);
      try {
        const saved = await repo.addAnalysis(uid, toAnalysisSnapshot(analysis, reason));
        setAll({ ...stateRef.current, analyses: [saved, ...stateRef.current.analyses].slice(0, 30) });
      } catch (error) {
        toast.error('Couldn’t save this analysis', { description: friendlyError(error) });
      }
      return analysis;
    },
    [uid, toast, setAll],
  );

  // ── Actions ──────────────────────────────────────────────────────────────

  const completeOnboarding = useCallback(
    async (data) => {
      const previous = stateRef.current.career;
      const career = {
        targetRoleId: data.targetRoleId,
        customRole: data.targetRoleId === 'custom' ? data.customRole : null,
        targetCompany: data.targetCompany === undefined ? previous?.targetCompany || null : data.targetCompany,
        level: data.level,
        skills: data.skills,
        dailyMinutes: data.dailyMinutes,
        timelineWeeks: data.timelineWeeks,
        roadmapOverrides: previous?.targetRoleId === data.targetRoleId ? previous.roadmapOverrides || {} : {},
        onboardedAt: new Date().toISOString(),
        migrated: false,
      };
      const role = resolveRole(career);
      const analysis = analyzeRole(role, career.skills);
      let progress = stateRef.current.progress;
      progress = { ...progress, skillHistory: [...progress.skillHistory, ...skillChanges(previous?.skills, career.skills, 'onboarding')] };
      progress = withActivity(progress, 'analysis', `Analysed your skills for ${role.name}: ${analysis.readiness}% ready`);
      await commit({ career, progress });
      await recordAnalysis(career, 'onboarding');
      return analysis;
    },
    [commit, recordAnalysis],
  );

  const updateSkills = useCallback(
    async (skills, { source = 'manual', message } = {}) => {
      const { career, progress } = stateRef.current;
      const nextCareer = { ...career, skills };
      const changes = skillChanges(career.skills, skills, source);
      let nextProgress = { ...progress, skillHistory: [...progress.skillHistory, ...changes] };
      if (changes.length || skills.length !== career.skills.length) {
        nextProgress = withActivity(nextProgress, 'skills', message || `Updated ${changes.length || 'your'} skill level${changes.length === 1 ? '' : 's'}`);
      }
      await commit({ career: nextCareer, progress: nextProgress });
      return recordAnalysis(nextCareer, source === 'assessment' ? 'assessment' : 'skills-updated');
    },
    [commit, recordAnalysis],
  );

  const setSkillLevel = useCallback(
    (skillId, level, { source = 'manual', name } = {}) => {
      const { career } = stateRef.current;
      const skillName = name || getSkill(skillId)?.name || skillId;
      const existing = career.skills.find((s) => s.id === skillId);
      const skills = existing
        ? career.skills.map((s) => (s.id === skillId ? { ...s, level } : s))
        : [...career.skills, { id: skillId, name: skillName, level }];
      const from = existing?.level ?? 0;
      const message =
        source === 'assessment'
          ? `Skill check-in: ${skillName} ${from}% → ${level}%`
          : `Set ${skillName} to ${level}%`;
      const assessTask = `${skillId}:assess`;
      const { progress, roadmap } = stateRef.current;
      if (source === 'assessment' && !hasAssessment(skillId) && !progress.completedTasks[assessTask] && roadmap?.phases.some((p) => p.tasks.some((t) => t.id === assessTask))) {
        stateRef.current = { ...stateRef.current, progress: { ...progress, completedTasks: { ...progress.completedTasks, [assessTask]: new Date().toISOString() } } };
      }
      return updateSkills(skills, { source, message });
    },
    [updateSkills],
  );

  const setTargetRole = useCallback(
    async (roleId, customRole = null, company) => {
      const { career, progress } = stateRef.current;
      const nextCareer = {
        ...career,
        targetRoleId: roleId,
        customRole: roleId === 'custom' ? customRole : null,
        targetCompany: company === undefined ? career.targetCompany || null : company,
        roadmapOverrides: career.targetRoleId === roleId ? career.roadmapOverrides : {},
      };
      const role = resolveRole(nextCareer);
      const label = role?.company ? `${role.name} at ${role.company.name}` : role?.name || 'a new role';
      await commit({ career: nextCareer, progress: withActivity(progress, 'target', `Changed your goal to ${label}`) });
      return recordAnalysis(nextCareer, 'target-changed');
    },
    [commit, recordAnalysis],
  );

  /** Add skills found by the resume or GitHub analyzers. Never lowers a level you set. */
  const importSkills = useCallback(
    async (incoming, { source = 'import', label = 'your resume' } = {}) => {
      const { career } = stateRef.current;
      const byId = new Map(career.skills.map((s) => [s.id, s]));
      let added = 0;
      for (const skill of incoming) {
        if (byId.has(skill.id)) continue;
        byId.set(skill.id, { id: skill.id, name: skill.name, level: skill.level });
        added += 1;
      }
      if (!added) return { added: 0, analysis: null };
      const analysis = await updateSkills([...byId.values()], { source: 'manual', message: `Added ${added} skill${added === 1 ? '' : 's'} from ${label}` });
      return { added, analysis, source };
    },
    [updateSkills],
  );

  const saveInsight = useCallback(
    (key, value) => commit({ insights: { ...stateRef.current.insights, [key]: value } }),
    [commit],
  );

  /**
   * Update the application tracker. `updater` receives the current
   * applications and returns the next list; an optional activity entry is
   * recorded in the feed.
   */
  const updateTracker = useCallback(
    (updater, activity) => {
      const { tracker, progress } = stateRef.current;
      const applications = updater(tracker.applications);
      const patch = { tracker: { ...tracker, applications } };
      if (activity) patch.progress = withActivity(progress, activity.type || 'application', activity.message);
      return commit(patch);
    },
    [commit],
  );

  /** Update the study schedule (settings, events, pins or saved plan). */
  const updateSchedule = useCallback((updater) => commit({ schedule: updater(stateRef.current.schedule) }), [commit]);

  const saveJob = useCallback(
    (job) => {
      const { insights, progress } = stateRef.current;
      const jobs = [job, ...(insights.jobs || []).filter((j) => j.id !== job.id)].slice(0, 10);
      return commit({ insights: { ...insights, jobs }, progress: withActivity(progress, 'job', `Analysed a job description: ${job.parsed.title}`) });
    },
    [commit],
  );

  const removeJob = useCallback(
    (id) => {
      const { insights } = stateRef.current;
      return commit({ insights: { ...insights, jobs: (insights.jobs || []).filter((j) => j.id !== id) } });
    },
    [commit],
  );

  /** Make a pasted job the target, so analysis and the roadmap aim at it. */
  const targetJob = useCallback((job) => setTargetRole('custom', jobToCustomRole(job.parsed), null), [setTargetRole]);

  const submitAssessment = useCallback(
    async ({ skillId, result }) => {
      const { career, progress, roadmap } = stateRef.current;
      const role = resolveRole(career);
      const levels = role ? analyzeRole(role, career.skills).levels : {};
      const skillName = getSkill(skillId)?.name || skillId;
      const before = levels[skillId]?.level ?? career.skills.find((s) => s.id === skillId)?.level ?? 0;
      const after = levelAfterAssessment(before, result.pct);
      const now = new Date().toISOString();
      const entry = { id: newId('as'), skillId, name: skillName, correct: result.correct, total: result.total, pct: result.pct, before, after, at: now };

      const completedTasks = { ...progress.completedTasks };
      const hoursLog = [...progress.hoursLog];
      const assessTask = `${skillId}:assess`;
      if (passed(result.pct) && !completedTasks[assessTask] && roadmap?.phases.some((p) => p.tasks.some((t) => t.id === assessTask))) {
        completedTasks[assessTask] = now;
        hoursLog.push({ id: newId('h'), date: dayKey(), hours: 0.5, taskId: assessTask, skillId, source: 'task' });
      }
      const existing = career.skills.find((s) => s.id === skillId);
      const skills = existing
        ? career.skills.map((s) => (s.id === skillId ? { ...s, level: after } : s))
        : [...career.skills, { id: skillId, name: skillName, level: after }];
      const changes = skillChanges(career.skills, skills, 'quiz');
      let next = markActive({ ...progress, completedTasks, hoursLog, assessments: [entry, ...progress.assessments].slice(0, 100), skillHistory: [...progress.skillHistory, ...changes] });
      next = withActivity(next, 'assessment', `${skillName} assessment: ${result.correct}/${result.total} (${result.pct}%) — level ${before}% → ${after}%`);
      const nextCareer = { ...career, skills };
      await commit({ career: nextCareer, progress: next });
      await recordAnalysis(nextCareer, 'assessment');
      return { entry, recommendation: recommendationFor(result.pct, skillName) };
    },
    [commit, recordAnalysis],
  );

  /**
   * Record a practical lab attempt. A pass raises the skill to the
   * difficulty's floor (never lowers it) and completes the roadmap's practice
   * task for that skill.
   */
  const submitVerification = useCallback(
    async ({ challenge, grade, passed, language, hintsUsed = 0 }) => {
      const { career, progress, roadmap } = stateRef.current;
      const skillName = getSkill(challenge.skillId)?.name || challenge.skillId;
      const now = new Date().toISOString();
      const current = career.skills.find((s) => s.id === challenge.skillId);
      const role = resolveRole(career);
      const before = (role ? analyzeRole(role, career.skills).levels[challenge.skillId]?.level : null) ?? current?.level ?? 0;
      const after = levelAfterPractical(before, challenge.difficulty, passed);
      const entry = {
        id: newId('pv'),
        challengeId: challenge.id,
        skillId: challenge.skillId,
        title: challenge.title,
        category: challenge.category,
        kind: challenge.kind,
        difficulty: challenge.difficulty,
        language: language || null,
        passed,
        pct: grade.pct,
        testsPassed: grade.passed,
        testsTotal: grade.total,
        hintsUsed,
        before,
        after,
        at: now,
      };
      let next = { ...progress, verifications: [entry, ...(progress.verifications || [])].slice(0, 200) };
      let nextCareer = career;
      if (after > before) {
        const skills = current ? career.skills.map((s) => (s.id === challenge.skillId ? { ...s, level: after } : s)) : [...career.skills, { id: challenge.skillId, name: skillName, level: after }];
        next = { ...next, skillHistory: [...next.skillHistory, ...skillChanges(career.skills, skills, 'practical')] };
        nextCareer = { ...career, skills };
      }
      const practiceTask = `${challenge.skillId}:practice`;
      if (passed && !next.completedTasks[practiceTask] && roadmap?.phases.some((p) => p.tasks.some((t) => t.id === practiceTask))) {
        next = { ...next, completedTasks: { ...next.completedTasks, [practiceTask]: now } };
      }
      next = markActive(next);
      next = withActivity(next, 'practical', `${passed ? 'Passed' : 'Attempted'} “${challenge.title}” (${challenge.difficulty}, ${grade.passed}/${grade.total})${after > before ? ` — ${skillName} ${before}% → ${after}%` : ''}`);
      await commit(nextCareer === career ? { progress: next } : { career: nextCareer, progress: next });
      if (nextCareer !== career) await recordAnalysis(nextCareer, 'practical');
      return entry;
    },
    [commit, recordAnalysis],
  );

  /** Track a project; completing one is evidence that raises its main skills. */
  const setProjectStatus = useCallback(
    async (projectId, status) => {
      const { career, progress, roadmap } = stateRef.current;
      const project = projectById(projectId);
      if (!project) return null;
      const now = new Date().toISOString();
      const projects = { ...progress.projects };
      if (status) projects[projectId] = { status, at: now, title: project.title };
      else delete projects[projectId];

      let next = { ...progress, projects };
      let nextCareer = career;
      let changes = [];
      if (status === 'completed') {
        const completedTasks = { ...next.completedTasks };
        for (const phase of roadmap?.phases || []) {
          for (const task of phase.tasks) if (task.projectId === projectId && !completedTasks[task.id]) completedTasks[task.id] = now;
        }
        let skills = career.skills;
        for (const id of project.primary) {
          const current = skills.find((s) => s.id === id);
          const level = current?.level ?? 0;
          const raised = Math.min(85, Math.max(level, level + 10, 40));
          if (raised <= level) continue;
          skills = current ? skills.map((s) => (s.id === id ? { ...s, level: raised } : s)) : [...skills, { id, name: getSkill(id)?.name || id, level: raised }];
        }
        changes = skillChanges(career.skills, skills, 'project');
        nextCareer = { ...career, skills };
        next = markActive({ ...next, completedTasks, skillHistory: [...next.skillHistory, ...changes] });
        next = withActivity(next, 'project', `Completed project: ${project.title}${changes.length ? ` — ${changes.map((c) => `${c.name} → ${c.to}%`).join(', ')}` : ''}`);
      } else if (status === 'started') {
        next = withActivity(next, 'project', `Started project: ${project.title}`);
      }
      await commit(nextCareer === career ? { progress: next } : { progress: next, career: nextCareer });
      if (changes.length) await recordAnalysis(nextCareer, 'project-completed');
      return { changes };
    },
    [commit, recordAnalysis],
  );

  const toggleInterviewPracticed = useCallback(
    (questionId) => {
      const { progress } = stateRef.current;
      const practiced = { ...progress.interview.practiced };
      if (practiced[questionId]) delete practiced[questionId];
      else practiced[questionId] = new Date().toISOString();
      return commit({ progress: { ...progress, interview: { ...progress.interview, practiced } } });
    },
    [commit],
  );

  /** Save a finished mock interview; answered questions count as practised. */
  const saveMockInterview = useCallback(
    (session) => {
      const { progress } = stateRef.current;
      const now = new Date().toISOString();
      const practiced = { ...progress.interview.practiced };
      const answered = session.questions.filter((q) => q.answer?.trim());
      for (const q of answered) if (!practiced[q.id]) practiced[q.id] = now;
      const mocks = [session, ...(progress.interview.mocks || []).filter((m) => m.id !== session.id)].slice(0, MAX_MOCK_SESSIONS);
      let next = markActive({ ...progress, interview: { ...progress.interview, practiced, mocks } });
      next = withActivity(next, 'interview', `Mock interview: answered ${answered.length} of ${session.questions.length} questions`);
      return commit({ progress: next });
    },
    [commit],
  );

  const saveMockFeedback = useCallback(
    (sessionId, questionId, ai) => {
      const { progress } = stateRef.current;
      const mocks = (progress.interview.mocks || []).map((m) =>
        m.id === sessionId ? { ...m, questions: m.questions.map((q) => (q.id === questionId ? { ...q, ai } : q)) } : m,
      );
      return commit({ progress: { ...progress, interview: { ...progress.interview, mocks } } });
    },
    [commit],
  );

  const toggleWeekCheck = useCallback(
    (itemId) => {
      const { progress } = stateRef.current;
      const key = weekKey();
      const week = { ...(progress.weekChecks?.[key] || {}) };
      week[itemId] = !week[itemId];
      // Keep only the last few weeks.
      const weekChecks = Object.fromEntries(Object.entries({ ...(progress.weekChecks || {}), [key]: week }).sort(([a], [b]) => b.localeCompare(a)).slice(0, 6));
      return commit({ progress: markActive({ ...progress, weekChecks }) });
    },
    [commit],
  );

  const updatePreferences = useCallback(
    (patch) => commit({ career: { ...stateRef.current.career, ...patch } }),
    [commit],
  );

  const toggleRoadmapSkill = useCallback(
    (key, include) => {
      const { career } = stateRef.current;
      const overrides = { ...(career.roadmapOverrides || {}), [key]: include ? 'include' : 'exclude' };
      return commit({ career: { ...career, roadmapOverrides: overrides } });
    },
    [commit],
  );

  const generateRoadmap = useCallback(
    async ({ useAi = true, onStage } = {}) => {
      const { career, roadmap: existing, progress } = stateRef.current;
      const role = resolveRole(career);
      if (!role) throw new Error('Choose a target career first.');
      const analysis = analyzeRole(role, career.skills);
      if (!analysis.gaps.length) throw new Error('You already meet every requirement for this role — no gaps to plan for.');

      const previous = existing && existing.roleId === role.id ? existing : null;
      const carryOver = (previous?.phases || []).filter(
        (phase) => phase.tasks.length && phase.tasks.every((task) => progress.completedTasks[task.id]),
      );
      const signals = { assessments: latestBySkill(progress.assessments) };
      const result = await runGeneration({ role, profile: career, analysis, carryOver, signals, useAi, onStage });
      const planned = preserveCompletedTasks(previous, result.roadmap, progress.completedTasks);
      const diff = previous ? diffRoadmaps(previous, planned) : null;
      const now = new Date().toISOString();
      const version = (previous?.version || 0) + 1;
      let summary = previous ? describeDiff(diff) : `Generated a ${planned.totalWeeks}-week roadmap.`;
      if (isEmptyDiff(diff)) {
        summary = planned.source === 'ai' ? 'Re-personalised every phase with AI — same skills and schedule.' : 'Regenerated — no changes to skills or schedule.';
      }
      const roadmap = {
        ...planned,
        id: previous?.id || newId('rm'),
        version,
        createdAt: previous?.createdAt || now,
        updatedAt: now,
        status: 'active',
        aiStatus: result.ai,
        history: [{ at: now, summary, source: result.roadmap.source, version }, ...(previous?.history || [])].slice(0, 12),
      };
      const nextProgress = withActivity(
        progress,
        previous ? 'roadmap-updated' : 'roadmap',
        previous ? `Roadmap updated — ${summary}` : `Generated your ${roadmap.totalWeeks}-week ${role.name} roadmap`,
      );
      await commit({ roadmap, progress: nextProgress });
      return { roadmap, ai: result.ai, diff, summary };
    },
    [commit],
  );

  const findTask = (roadmap, taskId) => {
    for (const phase of roadmap?.phases || []) {
      const task = phase.tasks.find((t) => t.id === taskId);
      if (task) return { task, phase };
    }
    return {};
  };

  const toggleTask = useCallback(
    async (taskId) => {
      const { roadmap, progress } = stateRef.current;
      const { task, phase } = findTask(roadmap, taskId);
      if (!task) return null;
      const wasDone = Boolean(progress.completedTasks[taskId]);
      const completedTasks = { ...progress.completedTasks };
      let next = { ...progress, completedTasks };
      if (wasDone) {
        delete completedTasks[taskId];
        next.hoursLog = progress.hoursLog.filter((entry) => entry.taskId !== taskId);
      } else {
        completedTasks[taskId] = new Date().toISOString();
        next.hoursLog = [
          ...progress.hoursLog,
          { id: newId('h'), date: dayKey(), hours: task.hours, taskId, skillId: task.skillId, source: 'task' },
        ];
        next = markActive(next);
        next = withActivity(next, 'task', `Completed “${task.title}”`);
      }
      const phaseDone = phase.tasks.every((t) => completedTasks[t.id]);
      if (!wasDone && phaseDone) next = withActivity(next, 'phase', `Finished every task in ${phase.title}`);
      await commit({ progress: next });
      return { completed: !wasDone, phaseDone };
    },
    [commit],
  );

  const completePhase = useCallback(
    async (phaseId) => {
      const { roadmap, progress, career } = stateRef.current;
      const phase = roadmap?.phases.find((p) => p.id === phaseId);
      if (!phase) return null;
      const now = new Date().toISOString();
      const completedTasks = { ...progress.completedTasks };
      const newHours = [];
      for (const task of phase.tasks) {
        if (completedTasks[task.id]) continue;
        completedTasks[task.id] = now;
        newHours.push({ id: newId('h'), date: dayKey(), hours: task.hours, taskId: task.id, skillId: task.skillId, source: 'task' });
      }
      // Completing a skill phase raises the self-reported level to the phase target.
      let skills = career.skills;
      for (const skill of phase.skills) {
        const existing = skills.find((s) => s.id === skill.id);
        if (existing && existing.level >= skill.target) continue;
        skills = existing
          ? skills.map((s) => (s.id === skill.id ? { ...s, level: skill.target } : s))
          : [...skills, { id: skill.id, name: skill.name, level: skill.target }];
      }
      const changes = skillChanges(career.skills, skills, 'completion');
      let next = markActive({
        ...progress,
        completedTasks,
        hoursLog: [...progress.hoursLog, ...newHours],
        skillHistory: [...progress.skillHistory, ...changes],
      });
      next = withActivity(next, 'phase', `Completed ${phase.title}${changes.length ? ` — ${changes.map((c) => `${c.name} → ${c.to}%`).join(', ')}` : ''}`);
      const nextCareer = { ...career, skills };
      await commit({ progress: next, career: nextCareer });
      if (changes.length) await recordAnalysis(nextCareer, 'phase-completed');
      return { changes };
    },
    [commit, recordAnalysis],
  );

  const logHours = useCallback(
    ({ hours, date = dayKey(), skillId = null, note = '' }) => {
      const { progress } = stateRef.current;
      const skillName = skillId ? getSkill(skillId)?.name : null;
      let next = {
        ...progress,
        hoursLog: [...progress.hoursLog, { id: newId('h'), date, hours, skillId, note: note.slice(0, 140), source: 'manual' }],
      };
      next = markActive(next, date);
      next = withActivity(next, 'hours', `Logged ${hours}h${skillName ? ` on ${skillName}` : ''}`);
      return commit({ progress: next });
    },
    [commit],
  );

  const removeHoursEntry = useCallback(
    (id) => {
      const { progress } = stateRef.current;
      return commit({ progress: { ...progress, hoursLog: progress.hoursLog.filter((e) => e.id !== id) } });
    },
    [commit],
  );

  const setRoadmapStatus = useCallback(
    (status) => {
      const { roadmap, progress } = stateRef.current;
      if (!roadmap) return null;
      return commit({
        roadmap: { ...roadmap, status, updatedAt: new Date().toISOString() },
        progress: withActivity(progress, 'roadmap-status', status === 'paused' ? 'Paused your roadmap' : 'Resumed your roadmap'),
      });
    },
    [commit],
  );

  const markActivitySeen = useCallback(() => {
    const { progress } = stateRef.current;
    if (!progress.activity.length || progress.lastSeenActivityAt >= progress.activity[0].at) return null;
    return commit({ progress: { ...progress, lastSeenActivityAt: new Date().toISOString() } });
  }, [commit]);

  const resetWorkspace = useCallback(async () => {
    if (!uid) return;
    await repo.reset(uid);
    setAll({ ...initialState, status: 'ready' });
  }, [uid, setAll]);

  /** Everything the user owns, as a JSON-serialisable backup. */
  const exportWorkspace = useCallback(() => {
    const { career, analyses, roadmap, progress, insights, tracker, schedule } = stateRef.current;
    return { app: 'skillgap', version: BACKUP_VERSION, exportedAt: new Date().toISOString(), data: { career, analyses, roadmap, progress, insights, tracker, schedule } };
  }, []);

  /** Replace the workspace with a backup made by exportWorkspace. */
  const importWorkspace = useCallback(
    async (backup) => {
      if (!backup || backup.app !== 'skillgap' || typeof backup.data !== 'object' || !backup.data) {
        throw new Error('This file isn’t a SkillGap backup.');
      }
      if (backup.version > BACKUP_VERSION) throw new Error('This backup was made by a newer version of SkillGap.');
      const d = backup.data;
      if (d.career != null && (typeof d.career !== 'object' || !Array.isArray(d.career.skills || []))) throw new Error('The backup’s career profile is invalid.');
      const next = {
        career: d.career || null,
        roadmap: d.roadmap && Array.isArray(d.roadmap.phases) ? d.roadmap : null,
        progress: normalizeProgress(d.progress),
        insights: normalizeInsights(d.insights),
        tracker: normalizeTracker(d.tracker),
        schedule: normalizeSchedule(d.schedule),
      };
      const analyses = Array.isArray(d.analyses) ? d.analyses.filter((a) => a && typeof a.readiness_score === 'number') : [];
      setAll({ ...stateRef.current, ...next, analyses: analyses.slice(0, 30) });
      const saved = await persist(PERSISTED);
      if (!saved) throw new Error('The backup was loaded but couldn’t be saved. Try again.');
      if (analyses.length) await repo.importAnalyses(uid, analyses);
      return { applications: next.tracker.applications.length, analyses: analyses.length };
    },
    [uid, persist, setAll],
  );

  // ── Derived state ────────────────────────────────────────────────────────

  const { career, roadmap, progress, analyses, insights, tracker, schedule } = state;
  const latestAssessments = useMemo(() => latestBySkill(progress.assessments), [progress.assessments]);
  const signals = useMemo(() => ({ assessments: latestAssessments }), [latestAssessments]);
  const evidence = useMemo(() => buildEvidence({ career, progress, latestAssessments }), [career, progress, latestAssessments]);
  const role = useMemo(() => resolveRole(career), [career]);
  const analysis = useMemo(
    () => (role && (career.skills?.length || career.onboardedAt) ? analyzeRole(role, career.skills || []) : null),
    [role, career],
  );
  const matches = useMemo(() => {
    if (!career?.skills?.length && !career?.onboardedAt) return [];
    const custom = career.targetRoleId === 'custom' ? buildCustomRole(career.customRole) : null;
    return rankCareerMatches(career.skills || [], custom ? [custom] : []);
  }, [career]);
  const stats = useMemo(() => roadmapStats(roadmap, progress.completedTasks), [roadmap, progress.completedTasks]);

  const roadmapState = useMemo(() => {
    if (!roadmap) return 'none';
    if (!career || roadmap.roleId !== career.targetRoleId) return 'role-changed';
    if (roadmap.inputsKey !== roadmapInputsKey(career, signals)) return 'stale';
    return 'current';
  }, [roadmap, career, signals]);

  const readinessHistory = useMemo(
    () => (analysis ? analyses.filter((a) => a.role_id === analysis.roleId && (a.company_id || null) === (analysis.company?.id || null)).slice().reverse() : []),
    [analyses, analysis],
  );

  const readinessDelta = useMemo(() => {
    if (!analysis || readinessHistory.length === 0) return null;
    const latest = readinessHistory[readinessHistory.length - 1];
    if (latest.readiness_score !== analysis.readiness) return analysis.readiness - latest.readiness_score;
    if (readinessHistory.length < 2) return null;
    return latest.readiness_score - readinessHistory[readinessHistory.length - 2].readiness_score;
  }, [analysis, readinessHistory]);

  const value = useMemo(
    () => ({
      status: state.status,
      error: state.error,
      reload: load,
      syncStatus,
      career,
      role,
      analysis,
      analyses,
      readinessHistory,
      readinessDelta,
      matches,
      roadmap,
      roadmapState,
      stats,
      progress,
      insights,
      tracker,
      schedule,
      signals,
      latestAssessments,
      evidence,
      isOnboarded: Boolean(analysis),
      actions: {
        completeOnboarding,
        updateSkills,
        setSkillLevel,
        setTargetRole,
        importSkills,
        saveInsight,
        updateTracker,
        updateSchedule,
        exportWorkspace,
        importWorkspace,
        saveJob,
        removeJob,
        targetJob,
        submitAssessment,
        submitVerification,
        setProjectStatus,
        toggleInterviewPracticed,
        saveMockInterview,
        saveMockFeedback,
        toggleWeekCheck,
        updatePreferences,
        toggleRoadmapSkill,
        generateRoadmap,
        toggleTask,
        completePhase,
        logHours,
        removeHoursEntry,
        setRoadmapStatus,
        markActivitySeen,
        resetWorkspace,
      },
    }),
    [
      state.status, state.error, load, syncStatus, career, role, analysis, analyses, readinessHistory, readinessDelta,
      matches, roadmap, roadmapState, stats, progress, insights, tracker, schedule, signals, latestAssessments, evidence, completeOnboarding,
      updateSkills, setSkillLevel, setTargetRole, importSkills, saveInsight, updateTracker, updateSchedule, exportWorkspace,
      importWorkspace, saveJob, removeJob, targetJob, submitAssessment,
      submitVerification, setProjectStatus, toggleInterviewPracticed, saveMockInterview, saveMockFeedback, toggleWeekCheck, updatePreferences, toggleRoadmapSkill, generateRoadmap,
      toggleTask, completePhase, logHours, removeHoursEntry, setRoadmapStatus, markActivitySeen, resetWorkspace,
    ],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspace must be used within a WorkspaceProvider');
  return context;
};

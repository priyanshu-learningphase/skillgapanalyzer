/**
 * Roadmap planner
 *
 * Deterministic, dependency-aware roadmap generation. This is the source of
 * truth for ordering, effort and scheduling; the optional AI step only
 * personalises the wording of each phase (see roadmapSchema.js).
 *
 *   gaps ─▶ expand missing prerequisites ─▶ topological sort (priority as
 *   tie-breaker) ─▶ size effort to the gap ─▶ fit to timeline ─▶ phases
 */

import { getSkill, slugify } from '../data/skills.js';
import { EXPERIENCE_LEVELS } from '../data/options.js';
import { isIncludedInRoadmap, PRIORITY_META } from './analysis.js';
import { hasAssessment } from '../data/assessments/index.js';
import { projectForSkill } from '../data/projects.js';

export const STUDY_DAYS_PER_WEEK = 6;
/** A prerequisite at or above this level is solid enough to build on. */
export const PREREQ_THRESHOLD = 50;
/** Prerequisites the role doesn't list explicitly are taken to working level. */
const PREREQ_TARGET = 60;

const roundHalf = (value) => Math.round(value * 2) / 2;
const round1 = (value) => Math.round(value * 10) / 10;

export const weeklyHoursFor = (dailyMinutes = 60) => round1((dailyMinutes / 60) * STUDY_DAYS_PER_WEEK);

/** Bucket an assessment score the way the planner reacts to it. */
export const assessmentBand = (pct) => (pct == null ? 'none' : pct < 60 ? 'repeat' : pct >= 85 ? 'advance' : 'steady');

/** Stable fingerprint of everything a roadmap depends on, to detect staleness. */
export const roadmapInputsKey = (profile, signals = {}) => {
  const skills = [...(profile?.skills || [])]
    .map((s) => `${s.id}:${Math.round(s.level)}`)
    .sort()
    .join(',');
  const overrides = Object.entries(profile?.roadmapOverrides || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join(',');
  const assessed = Object.entries(signals.assessments || {})
    .map(([id, a]) => `${id}:${assessmentBand(a.pct)}`)
    .sort()
    .join(',');
  const custom = profile?.targetRoleId === 'custom' ? JSON.stringify(profile.customRole || {}) : '';
  const company = profile?.targetCompany ? `${profile.targetCompany.id}:${profile.targetCompany.name}` : '';
  const raw = [profile?.targetRoleId, custom, company, profile?.level, profile?.dailyMinutes, profile?.timelineWeeks, skills, overrides, assessed].join('|');
  let hash = 5381;
  for (let i = 0; i < raw.length; i += 1) hash = ((hash << 5) + hash + raw.charCodeAt(i)) >>> 0;
  return hash.toString(36);
};

/** Longest prerequisite chain below a skill; foundational skills sort first. */
const depthCache = new Map();
const catalogDepth = (skillId, trail = new Set()) => {
  if (depthCache.has(skillId)) return depthCache.get(skillId);
  const skill = getSkill(skillId);
  if (!skill || trail.has(skillId)) return 0;
  trail.add(skillId);
  let depth = 0;
  for (const entry of skill.prerequisites) {
    const ids = Array.isArray(entry) ? entry : [entry];
    depth = Math.max(depth, 1 + Math.min(...ids.map((id) => catalogDepth(id, trail))));
  }
  trail.delete(skillId);
  depthCache.set(skillId, depth);
  return depth;
};

/**
 * Which skill satisfies a prerequisite entry. For "any of" groups prefer what
 * the user already knows, then what's already planned or required by the role.
 */
const resolvePrerequisite = (entry, ctx) => {
  if (!Array.isArray(entry)) return entry;
  const known = entry.filter((id) => ctx.levelOf(id) >= PREREQ_THRESHOLD);
  if (known.length) return known.sort((a, b) => ctx.levelOf(b) - ctx.levelOf(a))[0];
  const planned = entry.find((id) => ctx.nodes.has(id));
  if (planned) return planned;
  const required = entry.find((id) => ctx.requiredIds.has(id));
  if (required) return required;
  return [...entry].sort((a, b) => ctx.levelOf(b) - ctx.levelOf(a))[0];
};

/**
 * Break a skill into Learn → Practice → Build → Assess tasks sized to the
 * user's gap. Known basics are skipped; assessment results adjust depth:
 * a weak score (< 60%) brings the fundamentals back, a strong one (≥ 85%)
 * skips beginner content.
 */
export const buildSkillWork = (skill, current, target, paceFactor = 1, { assessment, project } = {}) => {
  const band = assessmentBand(assessment?.pct);
  const span = Math.max(target - current, 5);
  const hours = Math.max(2, roundHalf(skill.hours * (span / 100) * paceFactor));

  const topics = skill.topics || [];
  let knownShare = Math.min(0.7, Math.max(0, (current - 10) / 100));
  if (band === 'repeat') knownShare = 0;
  if (band === 'advance') knownShare = Math.max(knownShare, 0.6);
  const skipCount = Math.max(0, Math.min(topics.length - 2, Math.floor(topics.length * knownShare)));
  const skippedTopics = topics.slice(0, skipCount);
  const coreTopics = topics.slice(skipCount);
  const stretchTopics = band === 'advance' || target >= 80 || (current >= 60 && target >= 70) ? skill.advanced || [] : [];

  const hasProject = Boolean(project?.title || skill.project) && hours >= 6;
  const learnShare = hasProject ? 0.6 : 0.75;
  const learnItems = [...coreTopics.map((t) => ['learn', t]), ...stretchTopics.map((t) => ['stretch', t])];
  const perTopic = (hours * learnShare) / Math.max(1, learnItems.length);

  const tasks = [];
  if (band === 'repeat') {
    tasks.push({
      id: `${skill.id}:review`,
      title: `Repeat ${skill.name} fundamentals (last assessment ${assessment.pct}%)`,
      type: 'learn',
      hours: Math.max(1, roundHalf(hours * 0.1)),
      skillId: skill.id,
    });
  }
  tasks.push(
    ...learnItems.map(([type, title]) => ({
      id: `${skill.id}:${slugify(title)}`,
      title,
      type,
      hours: Math.max(0.5, roundHalf(perTopic)),
      skillId: skill.id,
    })),
  );
  if (skill.practice) {
    tasks.push({
      id: `${skill.id}:practice`,
      title: skill.practice,
      type: 'practice',
      hours: Math.max(0.5, roundHalf(hours * 0.25)),
      skillId: skill.id,
    });
  }
  if (hasProject) {
    tasks.push({
      id: `${skill.id}:project`,
      title: project?.title ? `Build: ${project.title}` : skill.project,
      type: 'build',
      hours: Math.max(1, roundHalf(hours * 0.15)),
      skillId: skill.id,
      projectId: project?.id || null,
    });
  }
  tasks.push({
    id: `${skill.id}:assess`,
    title: hasAssessment(skill.id) ? `Pass the ${skill.name} assessment (70%+)` : `Check in on your ${skill.name} level`,
    type: 'assess',
    hours: 0.5,
    skillId: skill.id,
  });

  return {
    hours: tasks.reduce((sum, task) => sum + task.hours, 0),
    tasks,
    skippedTopics,
    stretchTopics,
    band,
  };
};

const listNames = (names) =>
  names.length <= 1 ? names[0] || '' : `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;

const explainNode = (node, roleName) => {
  const base = node.skill.why;
  let text;
  if (node.reason === 'prerequisite') {
    text = `${base} It's a prerequisite for ${listNames(node.requiredByNames)}, so it comes first.`;
  } else if (node.current <= 0) {
    text = `${base} You haven't worked with it yet; ${roleName} roles typically expect around ${node.target}%.`;
  } else {
    text = `${base} You're at ${node.current}% and ${roleName} roles typically expect around ${node.target}%.`;
  }
  if (node.band === 'repeat') text += ` Your last assessment scored ${node.assessment.pct}%, so this phase revisits the fundamentals.`;
  if (node.band === 'advance') text += ` You scored ${node.assessment.pct}% on the assessment, so beginner content is skipped.`;
  return text;
};

const dedupeResources = (resources) => {
  const seen = new Set();
  return resources.filter((r) => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });
};

/**
 * Generate a roadmap.
 *
 * @param {object} params
 * @param {object} params.role      resolved role (see data/roles.js)
 * @param {object} params.profile   career profile (skills, level, time, timeline, overrides)
 * @param {object} params.analysis  analyzeRole() output for the same role and profile
 * @param {object[]} [params.carryOver] fully completed phases from the previous
 *   roadmap. They stay at the top of the timeline as history, so adapting a
 *   roadmap never makes finished work disappear.
 */
export const planRoadmap = ({ role, profile, analysis, carryOver = [], signals = {} }) => {
  const assessments = signals.assessments || {};
  const levels = analysis.levels;
  const levelOf = (id) => levels[id]?.level ?? 0;
  const overrides = profile.roadmapOverrides || {};
  const paceFactor = EXPERIENCE_LEVELS.find((l) => l.id === profile.level)?.paceFactor ?? 1;
  const weeklyHours = weeklyHoursFor(profile.dailyMinutes || 60);
  const timelineWeeks = profile.timelineWeeks ?? null;
  const requiredIds = new Set(analysis.items.map((item) => item.skillId));

  // 1. Seed with the gaps the user wants to close.
  const nodes = new Map();
  const excluded = [];
  for (const item of analysis.gaps) {
    const included = isIncludedInRoadmap(item, overrides);
    // Low-priority gaps can still fill spare time when there's a deadline.
    const optional = !included && item.priority === 'optional' && overrides[item.key] !== 'exclude' && timelineWeeks;
    if (!included && !optional) {
      excluded.push({ key: item.key, skillId: item.skillId, name: item.skillName, priority: item.priority });
      continue;
    }
    nodes.set(item.skillId, {
      id: item.skillId,
      key: item.key,
      skill: getSkill(item.skillId, item.skillName),
      current: item.current,
      target: item.required,
      priority: item.priority,
      score: item.priorityScore,
      reason: 'gap',
      optional: Boolean(optional),
      requiredBy: new Set(),
      prereqs: [],
    });
  }

  // 2. Pull in prerequisites the user hasn't got solid yet.
  const ctx = { levelOf, nodes, requiredIds };
  const queue = [...nodes.keys()];
  while (queue.length) {
    const node = nodes.get(queue.shift());
    for (const entry of node.skill?.prerequisites || []) {
      const prereqId = resolvePrerequisite(entry, ctx);
      const solid = levelOf(prereqId) >= PREREQ_THRESHOLD;
      if (!solid && !nodes.has(prereqId)) {
        const skill = getSkill(prereqId);
        if (!skill) continue;
        nodes.set(prereqId, {
          id: prereqId,
          key: prereqId,
          skill,
          current: levelOf(prereqId),
          target: PREREQ_TARGET,
          priority: node.priority,
          score: node.score,
          reason: 'prerequisite',
          optional: node.optional,
          requiredBy: new Set(),
          prereqs: [],
        });
        queue.push(prereqId);
      }
      if (nodes.has(prereqId)) {
        node.prereqs.push(prereqId);
        nodes.get(prereqId).requiredBy.add(node.id);
      }
    }
  }

  // A prerequisite is as urgent as the most urgent thing that needs it.
  for (let pass = 0; pass < nodes.size; pass += 1) {
    let changed = false;
    for (const node of nodes.values()) {
      for (const prereqId of node.prereqs) {
        const prereq = nodes.get(prereqId);
        if (node.score > prereq.score) {
          prereq.score = node.score;
          if (prereq.reason === 'prerequisite') prereq.priority = node.priority;
          changed = true;
        }
        if (!node.optional && prereq.optional) {
          prereq.optional = false;
          changed = true;
        }
      }
    }
    if (!changed) break;
  }

  // 3. Size the work for each skill.
  for (const node of nodes.values()) {
    node.assessment = assessments[node.id] || null;
    node.project = projectForSkill(node.id, role.id);
    Object.assign(node, buildSkillWork(node.skill, node.current, node.target, paceFactor, { assessment: node.assessment, project: node.project }));
    node.requiredByNames = [...node.requiredBy].map((id) => nodes.get(id)?.skill?.name).filter(Boolean);
  }

  // Completed phases from the previous plan whose skills aren't being planned again.
  const carried = carryOver.filter(
    (phase) => phase.tasks?.length && !phase.skills.some((s) => nodes.has(s.id)),
  );
  const carriedHours = carried.reduce((sum, phase) => sum + phase.estimatedHours, 0);
  const carriedIds = new Set(carried.map((p) => p.id));

  // 4. Fit to the timeline: drop extras, then defer the least important skills.
  const capstoneHours = Math.min(24, Math.max(6, Math.round(weeklyHours * 1.5)));
  const interviewHours = role.interview?.length ? Math.min(15, Math.max(4, Math.round(weeklyHours))) : 0;
  let includeCapstone = !carriedIds.has('p-capstone');
  let includeInterview = interviewHours > 0 && !carriedIds.has('p-interview');
  const deferred = [];

  const kept = () => [...nodes.values()].filter((n) => !n.deferred);
  const totalHours = () =>
    carriedHours +
    kept().reduce((sum, n) => sum + n.hours, 0) +
    (includeCapstone ? capstoneHours : 0) +
    (includeInterview ? interviewHours : 0);

  const defer = (node, why) => {
    node.deferred = true;
    deferred.push({ skillId: node.id, name: node.skill.name, priority: node.priority, hours: node.hours, why });
    // Prerequisites that only this skill needed can go too.
    for (const prereqId of node.prereqs) {
      const prereq = nodes.get(prereqId);
      if (prereq.deferred || prereq.reason !== 'prerequisite') continue;
      if ([...prereq.requiredBy].every((id) => nodes.get(id).deferred)) defer(prereq, why);
    }
  };

  const canDefer = (node) => [...node.requiredBy].every((id) => nodes.get(id).deferred);

  if (timelineWeeks) {
    const available = timelineWeeks * weeklyHours;
    // Optional (low-priority) skills only stay if there's room for them.
    const optional = kept()
      .filter((n) => n.optional)
      .sort((a, b) => a.score - b.score);
    for (const node of optional) {
      if (totalHours() > available * 0.9 && canDefer(node)) defer(node, 'optional');
    }
    if (totalHours() > available) includeInterview = false;
    const trimmable = () =>
      kept()
        .filter((n) => (n.priority === 'optional' || n.priority === 'important') && canDefer(n))
        .sort((a, b) => a.score - b.score);
    while (totalHours() > available) {
      const next = trimmable()[0];
      if (!next) break;
      defer(next, 'timeline');
    }
  } else {
    for (const node of kept().filter((n) => n.optional)) defer(node, 'optional');
  }

  // 5. Topological order. Among skills that are ready, the most urgent goes
  //    first; ties go to whatever unblocks the most other planned skills,
  //    then the more foundational one.
  const active = kept();
  const unlocks = new Map();
  const countUnlocks = (node, seen = new Set()) => {
    for (const id of node.requiredBy) {
      const dependent = nodes.get(id);
      if (dependent && !dependent.deferred && !seen.has(id)) {
        seen.add(id);
        countUnlocks(dependent, seen);
      }
    }
    return seen.size;
  };
  for (const node of active) unlocks.set(node.id, countUnlocks(node));
  const indegree = new Map(active.map((n) => [n.id, 0]));
  for (const node of active) {
    for (const prereqId of node.prereqs) if (indegree.has(prereqId)) indegree.set(node.id, indegree.get(node.id) + 1);
  }
  const ready = active.filter((n) => indegree.get(n.id) === 0);
  const ordered = [];
  const compare = (a, b) =>
    b.score - a.score ||
    unlocks.get(b.id) - unlocks.get(a.id) ||
    catalogDepth(a.id) - catalogDepth(b.id) ||
    a.hours - b.hours ||
    a.skill.name.localeCompare(b.skill.name);
  while (ready.length) {
    ready.sort(compare);
    const node = ready.shift();
    ordered.push(node);
    for (const dependentId of node.requiredBy) {
      if (!indegree.has(dependentId)) continue;
      indegree.set(dependentId, indegree.get(dependentId) - 1);
      if (indegree.get(dependentId) === 0) ready.push(nodes.get(dependentId));
    }
  }
  // Defensive: a cycle in the catalog should never drop skills silently.
  for (const node of active) if (!ordered.includes(node)) ordered.push(node);

  // 6. Group into phases. Small consecutive skills share a phase.
  const groups = [];
  for (const node of ordered) {
    const last = groups[groups.length - 1];
    const small = node.hours < weeklyHours * 0.75;
    if (last && small && last.small && last.nodes.length < 3 && last.hours + node.hours <= weeklyHours * 1.25) {
      last.nodes.push(node);
      last.hours += node.hours;
    } else {
      groups.push({ nodes: [node], hours: node.hours, small });
    }
  }

  const placedPhase = new Map();
  let cursor = 0;
  const schedule = (hours) => {
    const weekStart = Math.floor(cursor / weeklyHours) + 1;
    cursor += hours;
    const weekEnd = Math.max(weekStart, Math.ceil(cursor / weeklyHours - 1e-9));
    return { weekStart, weekEnd };
  };

  // Finished phases come first, rescheduled on the same clock.
  const historyPhases = carried.map((phase) => {
    phase.skills.forEach((s) => placedPhase.set(s.id, phase.id));
    return { ...phase, carried: true, ...schedule(phase.estimatedHours) };
  });

  const plannedPhases = groups.map((group) => {
    const [primary] = group.nodes;
    const id = `p-${primary.id.replace(/[^a-z0-9-]/gi, '-')}`;
    group.nodes.forEach((n) => placedPhase.set(n.id, id));
    const names = group.nodes.map((n) => n.skill.name);
    const prereqIds = new Set();
    for (const node of group.nodes) {
      for (const entry of node.skill.prerequisites || []) {
        const prereqId = resolvePrerequisite(entry, ctx);
        if (!group.nodes.some((n) => n.id === prereqId)) prereqIds.add(prereqId);
      }
    }
    return {
      id,
      kind: 'skill',
      title: listNames(names),
      category: primary.skill.category,
      ...schedule(group.hours),
      estimatedHours: roundHalf(group.hours),
      skills: group.nodes.map((n) => ({
        id: n.id,
        key: n.key,
        name: n.skill.name,
        category: n.skill.category,
        current: n.current,
        target: n.target,
        priority: n.priority,
        reason: n.reason,
        requiredBy: n.requiredByNames,
      })),
      why: group.nodes.map((n) => explainNode(n, role.name)).join(' '),
      tasks: group.nodes.flatMap((n) => n.tasks),
      skippedTopics: group.nodes.flatMap((n) => n.skippedTopics.map((t) => `${n.skill.name}: ${t}`)),
      stretchTopics: group.nodes.flatMap((n) => n.stretchTopics),
      practice: group.nodes.map((n) => n.skill.practice).filter(Boolean).join(' · '),
      project: (() => {
        const last = group.nodes[group.nodes.length - 1];
        return last.project
          ? { id: last.project.id, title: last.project.title, description: last.project.problem, difficulty: last.project.difficulty }
          : { title: last.skill.project, description: '' };
      })(),
      assessmentBand: group.nodes[0].band,
      resources: dedupeResources(group.nodes.flatMap((n) => n.skill.resources || [])).slice(0, 5),
      prerequisites: [...prereqIds].map((prereqId) => ({
        skillId: prereqId,
        name: getSkill(prereqId)?.name || prereqId,
        phaseId: placedPhase.get(prereqId) || null,
        level: levelOf(prereqId),
        status: placedPhase.has(prereqId) ? 'planned' : levelOf(prereqId) >= PREREQ_THRESHOLD ? 'met' : 'partial',
      })),
    };
  });

  const phases = [...historyPhases, ...plannedPhases];

  if (includeCapstone && role.capstone) {
    const perTask = roundHalf(capstoneHours / role.capstone.tasks.length);
    phases.push({
      id: 'p-capstone',
      kind: 'capstone',
      title: role.capstone.title,
      category: 'Projects',
      ...schedule(capstoneHours),
      estimatedHours: capstoneHours,
      skills: [],
      why: `${role.capstone.description} A finished, documented project is the strongest evidence of readiness you can show an employer.`,
      tasks: role.capstone.tasks.map((title) => ({
        id: `capstone:${slugify(title)}`,
        title,
        type: 'build',
        hours: Math.max(1, perTask),
        skillId: null,
      })),
      skippedTopics: [],
      stretchTopics: [],
      practice: '',
      project: { title: role.capstone.title, description: role.capstone.description },
      resources: [],
      prerequisites: [],
    });
  }

  if (includeInterview) {
    const perTask = roundHalf(interviewHours / role.interview.length);
    phases.push({
      id: 'p-interview',
      kind: 'interview',
      title: 'Interview preparation',
      category: 'Interviews',
      ...schedule(interviewHours),
      estimatedHours: interviewHours,
      skills: [],
      why: `Turn what you've learned into offers: practise under realistic conditions for ${role.name} interviews.`,
      tasks: role.interview.map((title) => ({
        id: `interview:${slugify(title)}`,
        title,
        type: 'practice',
        hours: Math.max(1, perTask),
        skillId: null,
      })),
      skippedTopics: [],
      stretchTopics: [],
      practice: '',
      project: null,
      resources: [
        { type: 'practice', title: 'LeetCode interview prep', url: 'https://leetcode.com/explore/interview/' },
        { type: 'article', title: 'Tech Interview Handbook', url: 'https://www.techinterviewhandbook.org/' },
      ],
      prerequisites: [],
    });
  }

  const plannedHours = roundHalf(cursor);
  const totalWeeks = Math.max(1, Math.ceil(cursor / weeklyHours - 1e-9));
  const warnings = [];
  let fit;
  if (timelineWeeks) {
    const availableHours = round1(timelineWeeks * weeklyHours);
    if (totalWeeks > timelineWeeks) {
      fit = { status: 'over', availableHours, weeksNeeded: totalWeeks, weeksOver: totalWeeks - timelineWeeks };
      warnings.push(
        `Even after deferring lower-priority skills, this plan needs about ${plannedHours} hours — roughly ${totalWeeks} weeks at ${weeklyHours} h/week, ${totalWeeks - timelineWeeks} more than your ${timelineWeeks}-week target. More daily time or a longer timeline will close the gap.`,
      );
    } else {
      fit = { status: 'fits', availableHours, weeksNeeded: totalWeeks, weeksSpare: timelineWeeks - totalWeeks };
    }
    const trimmed = deferred.filter((d) => d.why === 'timeline');
    if (trimmed.length) {
      warnings.push(
        `To fit your timeline, ${listNames(trimmed.map((d) => d.name))} ${trimmed.length === 1 ? 'was' : 'were'} deferred. They'll come back if you extend the timeline or add more daily time.`,
      );
    }
  } else {
    fit = { status: 'open', weeksNeeded: totalWeeks };
  }

  return {
    roleId: role.id,
    roleName: role.name,
    source: 'rules',
    settings: {
      level: profile.level,
      dailyMinutes: profile.dailyMinutes,
      timelineWeeks,
      weeklyHours,
    },
    totalHours: plannedHours,
    totalWeeks,
    fit,
    phases,
    deferred: deferred.filter((d) => d.why !== 'optional'),
    excluded,
    warnings,
    inputsKey: roadmapInputsKey(profile, signals),
  };
};

/** What changed between two roadmaps, for the adaptation summary. */
export const diffRoadmaps = (previous, next) => {
  if (!previous) return null;
  const skillsOf = (roadmap) => {
    const map = new Map();
    for (const phase of roadmap.phases) {
      for (const skill of phase.skills) {
        map.set(skill.id, {
          name: skill.name,
          skipped: phase.skippedTopics.filter((t) => t.startsWith(`${skill.name}:`)).length,
        });
      }
    }
    return map;
  };
  const before = skillsOf(previous);
  const after = skillsOf(next);
  const wasCarried = new Set(previous.phases.filter((p) => p.carried).flatMap((p) => p.skills.map((s) => s.id)));
  const nowCarried = next.phases.filter((p) => p.carried).flatMap((p) => p.skills);
  // A skill that just moved into the "completed" history counts as reached.
  const removed = [
    ...[...before].filter(([id]) => !after.has(id)).map(([, s]) => s.name),
    ...nowCarried.filter((s) => !wasCarried.has(s.id)).map((s) => s.name),
  ];
  const added = [...after].filter(([id]) => !before.has(id)).map(([, s]) => s.name);
  let newlySkipped = 0;
  for (const [id, skill] of after) {
    if (before.has(id)) newlySkipped += Math.max(0, skill.skipped - before.get(id).skipped);
  }
  const remainingHours = (roadmap) => roadmap.phases.filter((p) => !p.carried).reduce((sum, p) => sum + p.estimatedHours, 0);
  // Phases whose depth changed because of an assessment result.
  const bandBySkill = (roadmap) => new Map(roadmap.phases.flatMap((p) => p.skills.map((s) => [s.id, { band: p.assessmentBand, name: s.name }])));
  const beforeBands = bandBySkill(previous);
  const adapted = [...bandBySkill(next)]
    .filter(([id, v]) => (v.band === 'repeat' || v.band === 'advance') && beforeBands.get(id)?.band !== v.band)
    .map(([, v]) => v);
  return {
    removed,
    added,
    adapted,
    newlySkipped,
    hoursDelta: roundHalf(remainingHours(next) - remainingHours(previous)),
    weeksDelta: next.totalWeeks - previous.totalWeeks,
  };
};

export const describeDiff = (diff) => {
  if (!diff) return 'Roadmap generated.';
  const parts = [];
  for (const change of diff.adapted || []) {
    parts.push(change.band === 'repeat' ? `Repeating ${change.name} fundamentals after your assessment` : `Skipped beginner ${change.name} content after your assessment`);
  }
  if (diff.removed.length) parts.push(`Removed ${listNames(diff.removed)} (target reached)`);
  if (diff.added.length) parts.push(`Added ${listNames(diff.added)}`);
  if (diff.newlySkipped) parts.push(`Skipped ${diff.newlySkipped} topic${diff.newlySkipped === 1 ? '' : 's'} you already know`);
  if (diff.hoursDelta < 0) parts.push(`${Math.abs(diff.hoursDelta)}h less work`);
  if (diff.hoursDelta > 0) parts.push(`${diff.hoursDelta}h more work`);
  return parts.length ? `${parts.join(' · ')}.` : 'No changes needed — your roadmap is already up to date.';
};

/**
 * When a phase is regenerated (new AI wording, re-sized topics), tasks the
 * user already finished in that phase are kept at the top of its list so
 * completed work never disappears.
 */
export const preserveCompletedTasks = (previous, next, completedTasks = {}) => {
  if (!previous) return next;
  const previousById = new Map(previous.phases.map((p) => [p.id, p]));
  return {
    ...next,
    phases: next.phases.map((phase) => {
      const before = previousById.get(phase.id);
      if (!before || phase.carried) return phase;
      const ids = new Set(phase.tasks.map((t) => t.id));
      const kept = before.tasks.filter((t) => completedTasks[t.id] && !ids.has(t.id));
      return kept.length ? { ...phase, tasks: [...kept, ...phase.tasks] } : phase;
    }),
  };
};

export const isEmptyDiff = (diff) =>
  Boolean(diff) && !diff.removed.length && !diff.added.length && !diff.adapted?.length && !diff.newlySkipped && !diff.hoursDelta;

/** Phase and overall progress, derived from completed task ids. */
export const roadmapStats = (roadmap, completedTasks = {}) => {
  if (!roadmap) return null;
  let currentFound = false;
  const phases = roadmap.phases.map((phase) => {
    const total = phase.tasks.length;
    const done = phase.tasks.filter((t) => completedTasks[t.id]).length;
    const hoursDone = phase.tasks.filter((t) => completedTasks[t.id]).reduce((s, t) => s + t.hours, 0);
    let status = 'upcoming';
    if (total && done === total) status = 'completed';
    else if (!currentFound) {
      status = 'current';
      currentFound = true;
    }
    return { id: phase.id, total, done, hoursDone, pct: total ? Math.round((done / total) * 100) : 0, status };
  });
  const totalTasks = phases.reduce((s, p) => s + p.total, 0);
  const doneTasks = phases.reduce((s, p) => s + p.done, 0);
  const currentIndex = phases.findIndex((p) => p.status === 'current');
  const currentPhase = currentIndex >= 0 ? roadmap.phases[currentIndex] : null;
  const upNext = [];
  if (currentIndex >= 0) {
    for (const phase of roadmap.phases.slice(currentIndex)) {
      for (const task of phase.tasks) {
        if (!completedTasks[task.id]) upNext.push({ ...task, phaseId: phase.id, phaseTitle: phase.title });
        if (upNext.length >= 4) break;
      }
      if (upNext.length >= 4) break;
    }
  }
  return {
    phases,
    byId: Object.fromEntries(phases.map((p) => [p.id, p])),
    totalTasks,
    doneTasks,
    pct: totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0,
    phasesDone: phases.filter((p) => p.status === 'completed').length,
    phasesTotal: phases.length,
    currentPhase,
    currentPhaseStats: currentIndex >= 0 ? phases[currentIndex] : null,
    upNext,
    hoursPlanned: roadmap.totalHours,
    hoursDone: phases.reduce((s, p) => s + p.hoursDone, 0),
  };
};

export const formatWeeks = (phase) =>
  phase.weekStart === phase.weekEnd ? `Week ${phase.weekStart}` : `Week ${phase.weekStart}–${phase.weekEnd}`;

export const priorityRank = (priority) => PRIORITY_META[priority]?.rank ?? 9;

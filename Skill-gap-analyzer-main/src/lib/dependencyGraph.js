/**
 * Prerequisite graph for a role: every required skill plus the prerequisite
 * chain beneath it, laid out in layers (foundations first).
 */

import { getSkill } from '../data/skills.js';

const SOLID = 50;

export const buildDependencyGraph = (role, analysis) => {
  if (!role || !analysis) return { nodes: [], edges: [], layers: [] };
  const levels = analysis.levels;
  const levelOf = (id) => levels[id]?.level ?? 0;
  const itemsBySkill = new Map(analysis.items.map((item) => [item.skillId, item]));
  const nodes = new Map();
  const edges = [];

  const choose = (entry) => {
    if (!Array.isArray(entry)) return entry;
    const known = entry.filter((id) => levelOf(id) >= SOLID).sort((a, b) => levelOf(b) - levelOf(a));
    return known[0] || entry.find((id) => itemsBySkill.has(id) || nodes.has(id)) || entry[0];
  };

  const visit = (id, trail = new Set()) => {
    if (nodes.has(id) || trail.has(id)) return;
    const skill = getSkill(id);
    if (!skill) return;
    const item = itemsBySkill.get(id);
    const level = levelOf(id);
    nodes.set(id, {
      id,
      name: skill.name,
      category: skill.category,
      level,
      required: item?.required ?? null,
      isRequirement: Boolean(item),
      priority: item?.priority || null,
      standing: item ? item.standing : level >= SOLID ? 'strong' : level > 0 ? 'improve' : 'missing',
    });
    trail.add(id);
    for (const entry of skill.prerequisites || []) {
      const prereq = choose(entry);
      if (!getSkill(prereq)) continue;
      visit(prereq, trail);
      edges.push({ from: prereq, to: id });
    }
    trail.delete(id);
  };
  for (const item of analysis.items) visit(item.skillId);

  // Longest path from a root decides the layer.
  const parents = new Map([...nodes.keys()].map((id) => [id, []]));
  for (const edge of edges) parents.get(edge.to)?.push(edge.from);
  const depth = new Map();
  const depthOf = (id, trail = new Set()) => {
    if (depth.has(id)) return depth.get(id);
    if (trail.has(id)) return 0;
    trail.add(id);
    const d = parents.get(id).length ? 1 + Math.max(...parents.get(id).map((p) => depthOf(p, trail))) : 0;
    depth.set(id, d);
    return d;
  };
  for (const id of nodes.keys()) nodes.get(id).depth = depthOf(id);

  const layerCount = Math.max(0, ...[...nodes.values()].map((n) => n.depth)) + 1;
  const layers = Array.from({ length: layerCount }, () => []);
  for (const node of nodes.values()) layers[node.depth].push(node);

  // Order each layer by the average position of its parents to reduce crossings.
  layers[0].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  for (let pass = 0; pass < 2; pass += 1) {
    for (let i = 1; i < layers.length; i += 1) {
      const position = new Map(layers[i - 1].map((n, idx) => [n.id, idx]));
      const prevPositions = new Map(layers.slice(0, i).flat().map((n) => [n.id, layers[n.depth].indexOf(n)]));
      layers[i].sort((a, b) => {
        const avg = (n) => {
          const ps = parents.get(n.id);
          if (!ps.length) return 0;
          return ps.reduce((s, p) => s + (position.get(p) ?? prevPositions.get(p) ?? 0), 0) / ps.length;
        };
        return avg(a) - avg(b);
      });
    }
  }
  layers.forEach((layer) => layer.forEach((node, index) => (node.row = index)));

  return { nodes: [...nodes.values()], edges, layers };
};

/** Every ancestor (prerequisite) of a node — used to highlight a learning path. */
export const ancestorsOf = (graph, id) => {
  const result = new Set();
  const walk = (current) => {
    for (const edge of graph.edges) {
      if (edge.to === current && !result.has(edge.from)) {
        result.add(edge.from);
        walk(edge.from);
      }
    }
  };
  walk(id);
  return result;
};

export const descendantsOf = (graph, id) => {
  const result = new Set();
  const walk = (current) => {
    for (const edge of graph.edges) {
      if (edge.from === current && !result.has(edge.to)) {
        result.add(edge.to);
        walk(edge.to);
      }
    }
  };
  walk(id);
  return result;
};

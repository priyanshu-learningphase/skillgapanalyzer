import { useMemo, useState } from 'react';
import { ancestorsOf, descendantsOf } from '../../lib/dependencyGraph';
import { STANDING_META } from '../../lib/analysis';

const NODE_W = 152;
const NODE_H = 42;
const GAP_X = 56;
const GAP_Y = 14;
const PAD = 8;

const STYLE = {
  strong: { fill: '#F0FDF4', stroke: '#86EFAC', dash: undefined },
  improve: { fill: '#FFFBEB', stroke: '#FCD34D', dash: undefined },
  missing: { fill: '#FFFFFF', stroke: '#CBD5E1', dash: '4 3' },
};

const truncate = (text, max = 19) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

/**
 * Prerequisite map: foundations on the left, role skills to the right.
 * Hover or focus a skill to highlight everything it depends on and unlocks.
 */
const DependencyGraph = ({ graph, onSelect }) => {
  const [focus, setFocus] = useState(null);

  const positions = useMemo(() => {
    const map = new Map();
    for (const node of graph.nodes) {
      map.set(node.id, { x: PAD + node.depth * (NODE_W + GAP_X), y: PAD + node.row * (NODE_H + GAP_Y) });
    }
    return map;
  }, [graph]);

  const related = useMemo(() => {
    if (!focus) return null;
    return new Set([focus, ...ancestorsOf(graph, focus), ...descendantsOf(graph, focus)]);
  }, [focus, graph]);

  if (!graph.nodes.length) return null;
  const width = PAD * 2 + graph.layers.length * (NODE_W + GAP_X) - GAP_X;
  const height = PAD * 2 + Math.max(...graph.layers.map((l) => l.length)) * (NODE_H + GAP_Y) - GAP_Y;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
        {Object.entries(STANDING_META).map(([key, meta]) => (
          <span key={key} className="inline-flex items-center gap-1.5">
            <span className="h-3 w-4 rounded border" style={{ background: STYLE[key].fill, borderColor: STYLE[key].stroke, borderStyle: STYLE[key].dash ? 'dashed' : 'solid' }} aria-hidden />
            {meta.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="font-semibold text-ink">Bold</span> = required by your role
        </span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-line bg-slate-50/50 p-3">
        <svg width={width} height={height} role="group" aria-label="Skill prerequisite map" className="block">
          {graph.edges.map((edge) => {
            const from = positions.get(edge.from);
            const to = positions.get(edge.to);
            if (!from || !to) return null;
            const x1 = from.x + NODE_W;
            const y1 = from.y + NODE_H / 2;
            const x2 = to.x;
            const y2 = to.y + NODE_H / 2;
            const mid = (x1 + x2) / 2;
            const active = related && related.has(edge.from) && related.has(edge.to);
            return (
              <path
                key={`${edge.from}-${edge.to}`}
                d={`M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`}
                fill="none"
                stroke={active ? '#6366F1' : '#CBD5E1'}
                strokeWidth={active ? 2 : 1.25}
                opacity={related && !active ? 0.25 : 1}
              />
            );
          })}
          {graph.nodes.map((node) => {
            const pos = positions.get(node.id);
            const style = STYLE[node.standing];
            const dimmed = related && !related.has(node.id);
            return (
              <g
                key={node.id}
                transform={`translate(${pos.x},${pos.y})`}
                role="button"
                tabIndex={0}
                aria-label={`${node.name}: ${STANDING_META[node.standing].label}, ${node.level}%${node.required ? ` of ${node.required}% required` : ''}`}
                onMouseEnter={() => setFocus(node.id)}
                onMouseLeave={() => setFocus(null)}
                onFocus={() => setFocus(node.id)}
                onBlur={() => setFocus(null)}
                onClick={() => onSelect?.(node.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect?.(node.id);
                  }
                }}
                className="cursor-pointer outline-none"
                opacity={dimmed ? 0.35 : 1}
              >
                <rect
                  width={NODE_W}
                  height={NODE_H}
                  rx="8"
                  fill={style.fill}
                  stroke={focus === node.id ? '#6366F1' : style.stroke}
                  strokeWidth={focus === node.id ? 2 : 1}
                  strokeDasharray={style.dash}
                />
                <text x="10" y="17" fontSize="12" fontWeight={node.isRequirement ? 600 : 400} fill="#111827">
                  {truncate(node.name)}
                </text>
                <text x="10" y="32" fontSize="10.5" fill="#64748B" className="tabular">
                  {node.required ? `${node.level}% / ${node.required}%` : node.level ? `${node.level}% · prerequisite` : 'prerequisite'}
                </text>
                <title>{node.name}</title>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export default DependencyGraph;

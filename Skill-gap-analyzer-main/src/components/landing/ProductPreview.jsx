import { Check, Circle, CircleDot } from 'lucide-react';
import ProgressBar from '../ui/ProgressBar';
import PriorityBadge from '../ui/PriorityBadge';

const SKILLS = [
  { name: 'C++', value: 82, target: 80, priority: null },
  { name: 'DSA', value: 52, target: 85, priority: 'high' },
  { name: 'SQL', value: 40, target: 65, priority: 'medium' },
  { name: 'System Design', value: 22, target: 65, priority: 'critical' },
];

const PHASES = [
  { weeks: 'Week 1–3', title: 'Data Structures', pct: 60, status: 'current' },
  { weeks: 'Week 4–5', title: 'Algorithms', pct: 0, status: 'upcoming' },
  { weeks: 'Week 6', title: 'SQL', pct: 0, status: 'upcoming' },
];

/** Static illustration of the product for the landing hero. */
const ProductPreview = () => (
  <div className="relative" aria-label="Product preview">
    <div className="card overflow-hidden shadow-pop">
      <div className="flex items-center gap-1.5 border-b border-line bg-slate-50/80 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
        <span className="ml-3 text-[11px] font-medium text-muted-light">Skill analysis · Software Engineer</span>
      </div>

      <div className="grid gap-0 sm:grid-cols-[1fr_1.35fr]">
        <div className="border-b border-line p-5 sm:border-b-0 sm:border-r">
          <p className="text-xs font-medium text-muted">Career Readiness</p>
          <p className="mt-1 text-5xl font-semibold tracking-tight text-ink">68%</p>
          <p className="mt-1 text-xs text-muted">
            <span className="font-medium text-success-700">+12%</span> since your last analysis
          </p>
          <div className="mt-5 space-y-2 text-xs">
            <div className="flex justify-between text-muted">
              <span>Strengths</span>
              <span className="tabular font-medium text-ink">4</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Priority gaps</span>
              <span className="tabular font-medium text-ink">3</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Roadmap</span>
              <span className="tabular font-medium text-ink">12 weeks</span>
            </div>
          </div>
        </div>

        <div className="p-5">
          <p className="text-xs font-medium text-muted">Skill levels vs. role target</p>
          <ul className="mt-3 space-y-3.5">
            {SKILLS.map((skill) => (
              <li key={skill.name}>
                <div className="mb-1.5 flex items-center justify-between text-[13px]">
                  <span className="font-medium text-ink">{skill.name}</span>
                  <span className="flex items-center gap-2">
                    {skill.priority && <PriorityBadge priority={skill.priority} showLabel={false} />}
                    <span className="tabular text-muted">{skill.value}%</span>
                  </span>
                </div>
                <ProgressBar value={skill.value} marker={skill.target} size="sm" tone={skill.value >= skill.target ? 'success' : 'accent'} label={`${skill.name} level`} />
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-line p-5">
        <p className="mb-3 text-xs font-medium text-muted">Your roadmap</p>
        <ol className="space-y-2.5">
          {PHASES.map((phase) => (
            <li key={phase.title} className="flex items-center gap-3 text-[13px]">
              {phase.status === 'current' ? (
                <CircleDot className="h-4 w-4 text-accent" aria-hidden />
              ) : phase.status === 'done' ? (
                <Check className="h-4 w-4 text-success" aria-hidden />
              ) : (
                <Circle className="h-4 w-4 text-slate-300" aria-hidden />
              )}
              <span className="w-20 shrink-0 text-xs text-muted">{phase.weeks}</span>
              <span className="flex-1 font-medium text-ink">{phase.title}</span>
              {phase.status === 'current' && (
                <span className="flex w-24 items-center gap-2">
                  <ProgressBar value={phase.pct} size="xs" label="Phase progress" />
                  <span className="tabular text-xs text-muted">{phase.pct}%</span>
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </div>
    <span className="absolute -top-2.5 right-4 rounded-md border border-line bg-white px-1.5 py-0.5 text-[10px] font-medium text-muted shadow-card">
      Example
    </span>
  </div>
);

export default ProductPreview;

import { Check } from 'lucide-react';
import ProgressBar from '../ui/ProgressBar';
import ScoreRing from '../ui/ScoreRing';

const SKILLS = [
  { name: 'JavaScript', value: 82, target: 80 },
  { name: 'SQL', value: 71, target: 75 },
  { name: 'Docker', value: 48, target: 60 },
  { name: 'AWS', value: 31, target: 55 },
];

const WEEK = [
  { title: 'Learn Docker fundamentals', done: true },
  { title: 'Build a Dockerized API', done: false },
  { title: 'Solve 15 DSA problems', done: false },
  { title: 'Complete the System Design assessment', done: false },
];

/** Static illustration of the dashboard for the landing hero. */
const ProductPreview = () => (
  <div className="relative" aria-label="Product preview">
    <div className="card overflow-hidden shadow-pop">
      <div className="flex items-center gap-1.5 border-b border-line bg-slate-50/80 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
        <span className="ml-3 text-[11px] font-medium text-muted-light">Dashboard · Backend Engineer at Microsoft</span>
      </div>

      <div className="grid sm:grid-cols-[1fr_1.3fr]">
        <div className="flex items-center gap-4 border-b border-line p-5 sm:flex-col sm:items-start sm:border-b-0 sm:border-r">
          <ScoreRing value={78} size={96} stroke={8} label="Career readiness 78 out of 100">
            <span className="text-2xl font-semibold tracking-tight text-ink">78</span>
            <span className="text-[10px] text-muted">/ 100</span>
          </ScoreRing>
          <div>
            <p className="text-xs font-medium text-muted">Career Readiness</p>
            <p className="mt-0.5 text-xs text-muted">
              <span className="font-medium text-success-700">+12</span> since last analysis
            </p>
            <p className="mt-2 text-xs text-muted">
              To reach 90: <span className="font-medium text-ink">System Design, AWS</span>
            </p>
          </div>
        </div>

        <div className="p-5">
          <p className="text-xs font-medium text-muted">Skills vs. role target</p>
          <ul className="mt-3 space-y-3">
            {SKILLS.map((skill) => (
              <li key={skill.name} className="grid grid-cols-[5.5rem_1fr_2.25rem] items-center gap-2 text-[13px]">
                <span className="font-medium text-ink">{skill.name}</span>
                <ProgressBar value={skill.value} marker={skill.target} size="sm" tone={skill.value >= skill.target ? 'success' : 'accent'} label={`${skill.name} level`} />
                <span className="tabular text-right text-xs text-muted">{skill.value}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-line p-5">
        <p className="mb-3 text-xs font-medium text-muted">This week</p>
        <ul className="space-y-2">
          {WEEK.map((item) => (
            <li key={item.title} className="flex items-center gap-2.5 text-[13px]">
              <span className={item.done ? 'flex h-4 w-4 items-center justify-center rounded bg-success text-white' : 'h-4 w-4 rounded border border-slate-300'} aria-hidden>
                {item.done && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
              <span className={item.done ? 'text-muted line-through decoration-slate-300' : 'text-ink'}>{item.title}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
    <span className="absolute -top-2.5 right-4 rounded-md border border-line bg-white px-1.5 py-0.5 text-[10px] font-medium text-muted shadow-card">Example</span>
  </div>
);

export default ProductPreview;

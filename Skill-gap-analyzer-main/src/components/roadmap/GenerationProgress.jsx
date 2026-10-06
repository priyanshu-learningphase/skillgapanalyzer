import { Check } from 'lucide-react';
import Card from '../ui/Card';
import { Spinner } from '../ui/Spinner';
import { GENERATION_STAGES } from '../../services/roadmapService';
import { cx } from '../../lib/cx';

/** Live status of roadmap generation, stage by stage. */
const GenerationProgress = ({ stage, aiEnabled }) => {
  const stages = GENERATION_STAGES.filter((s) => s.id !== 'ai' || aiEnabled);
  const currentIndex = stages.findIndex((s) => s.id === stage);
  return (
    <Card className="p-6" aria-live="polite" aria-busy="true">
      <p className="text-sm font-semibold text-ink">Building your roadmap</p>
      <p className="mt-1 text-sm text-muted">This takes a few seconds{aiEnabled ? ' — personalisation can take up to a minute' : ''}.</p>
      <ol className="mt-5 space-y-3">
        {stages.map((s, index) => {
          const done = currentIndex > index;
          const active = currentIndex === index;
          return (
            <li key={s.id} className="flex items-center gap-3 text-sm">
              <span className={cx('flex h-5 w-5 items-center justify-center rounded-full', done ? 'bg-success text-white' : active ? '' : 'border border-line')}>
                {done ? <Check className="h-3 w-3" strokeWidth={3} aria-hidden /> : active ? <Spinner className="h-4 w-4" /> : null}
              </span>
              <span className={cx(done ? 'text-muted' : active ? 'font-medium text-ink' : 'text-muted-light')}>{s.label}</span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
};

export default GenerationProgress;

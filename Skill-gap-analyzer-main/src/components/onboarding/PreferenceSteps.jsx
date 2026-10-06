import { Sprout, Hammer, Rocket, Clock, CalendarClock } from 'lucide-react';
import OptionCard from './OptionCard';
import { DAILY_TIME_OPTIONS, EXPERIENCE_LEVELS, TIMELINE_OPTIONS } from '../../data/options';
import { weeklyHoursFor } from '../../lib/roadmap';

const LEVEL_ICONS = { beginner: Sprout, intermediate: Hammer, advanced: Rocket };

export const LevelStep = ({ value, onChange }) => (
  <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Experience level">
    {EXPERIENCE_LEVELS.map((level) => (
      <OptionCard
        key={level.id}
        icon={LEVEL_ICONS[level.id]}
        title={level.label}
        description={level.description}
        selected={value === level.id}
        onSelect={() => onChange(level.id)}
      />
    ))}
  </div>
);

export const TimeStep = ({ value, onChange }) => (
  <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Daily learning time">
    {DAILY_TIME_OPTIONS.map((option) => (
      <OptionCard
        key={option.minutes}
        icon={Clock}
        title={option.label}
        description={`${option.hint} · about ${weeklyHoursFor(option.minutes)} h/week`}
        selected={value === option.minutes}
        onSelect={() => onChange(option.minutes)}
      />
    ))}
  </div>
);

export const TimelineStep = ({ value, onChange, dailyMinutes }) => (
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label="Target timeline">
    {TIMELINE_OPTIONS.map((option) => (
      <OptionCard
        key={option.label}
        icon={CalendarClock}
        title={option.label}
        description={
          option.weeks
            ? `${option.weeks} weeks · ~${Math.round(option.weeks * weeklyHoursFor(dailyMinutes))} learning hours`
            : 'Go at your own pace; we’ll estimate a finish date.'
        }
        selected={value === option.weeks}
        onSelect={() => onChange(option.weeks)}
      />
    ))}
  </div>
);

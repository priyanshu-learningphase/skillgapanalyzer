import { useState } from 'react';
import { Plus } from 'lucide-react';
import Button from '../ui/Button';
import { dayKey } from '../../lib/progress';

/** Log learning time that isn't tied to a roadmap task. */
const LogTimeForm = ({ skills, onSubmit }) => {
  const [hours, setHours] = useState('1');
  const [date, setDate] = useState(dayKey());
  const [skillId, setSkillId] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const value = Number(hours);
    if (!Number.isFinite(value) || value <= 0 || value > 16) {
      setError('Enter between 0.25 and 16 hours.');
      return;
    }
    if (date > dayKey()) {
      setError('You can’t log time in the future.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await onSubmit({ hours: Math.round(value * 4) / 4, date, skillId: skillId || null, note });
      setNote('');
      setHours('1');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="log-hours" className="label">
            Hours
          </label>
          <input id="log-hours" type="number" min="0.25" max="16" step="0.25" value={hours} onChange={(e) => setHours(e.target.value)} className="input" />
        </div>
        <div>
          <label htmlFor="log-date" className="label">
            Date
          </label>
          <input id="log-date" type="date" max={dayKey()} value={date} onChange={(e) => setDate(e.target.value)} className="input" />
        </div>
      </div>
      <div>
        <label htmlFor="log-skill" className="label">
          Skill <span className="font-normal text-muted">(optional)</span>
        </label>
        <select id="log-skill" value={skillId} onChange={(e) => setSkillId(e.target.value)} className="input">
          <option value="">General study</option>
          {skills.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="log-note" className="label">
          Note <span className="font-normal text-muted">(optional)</span>
        </label>
        <input id="log-note" value={note} maxLength={140} onChange={(e) => setNote(e.target.value)} placeholder="What did you work on?" className="input" />
      </div>
      {error && (
        <p className="text-sm text-danger-700" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" icon={Plus} loading={saving} className="w-full">
        Log time
      </Button>
    </form>
  );
};

export default LogTimeForm;

import { useState } from 'react';
import { ClipboardPaste, Bookmark, KanbanSquare } from 'lucide-react';
import Segmented from '../ui/Segmented';
import Button from '../ui/Button';
import { parseJobDescription } from '../../lib/jobDescription';

/**
 * Choose the job to tailor for: paste a description, or reuse a job already
 * analysed on the Jobs page or tracked in Applications.
 */
const JobPicker = ({ jobs, applications, onPick, onCancel }) => {
  const withJd = applications.filter((a) => a.parsed && (a.parsed.required.length || a.parsed.preferred.length));
  const [mode, setMode] = useState(withJd.length ? 'application' : jobs.length ? 'saved' : 'paste');
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const usePasted = () => {
    if (text.trim().length < 120) return setError('Paste the full job description — at least a few lines.');
    const parsed = parseJobDescription(text);
    if (!parsed.required.length && !parsed.preferred.length) return setError('No recognisable technical skills found. Make sure it’s the full job description.');
    setError('');
    onPick({ source: 'paste', id: null, title: parsed.title, parsed });
    return null;
  };

  const options = [
    { value: 'paste', label: 'Paste description', icon: ClipboardPaste },
    ...(jobs.length ? [{ value: 'saved', label: 'Analysed job', icon: Bookmark, count: jobs.length }] : []),
    ...(withJd.length ? [{ value: 'application', label: 'Application', icon: KanbanSquare, count: withJd.length }] : []),
  ];

  return (
    <div>
      {options.length > 1 && (
        <div className="mb-3 overflow-x-auto">
          <Segmented label="Job source" value={mode} onChange={setMode} options={options} />
        </div>
      )}
      {mode === 'paste' && (
        <div>
          <label htmlFor="tailor-jd" className="sr-only">
            Job description
          </label>
          <textarea id="tailor-jd" value={text} onChange={(e) => setText(e.target.value)} rows={7} className="input resize-y text-[13px]" placeholder="Paste the full job post — requirements and nice-to-haves…" aria-describedby={error ? 'tailor-jd-error' : undefined} />
          {error && (
            <p id="tailor-jd-error" className="mt-1.5 text-sm text-danger-700" role="alert">
              {error}
            </p>
          )}
          <div className="mt-3 flex justify-end gap-2">
            {onCancel && (
              <Button variant="secondary" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button onClick={usePasted} disabled={!text.trim()}>
              Use this job
            </Button>
          </div>
        </div>
      )}
      {mode === 'saved' && (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {jobs.map((job) => (
            <li key={job.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="min-w-0 truncate text-ink">{job.parsed.title}</span>
              <Button size="sm" variant="secondary" onClick={() => onPick({ source: 'saved', id: job.id, title: job.parsed.title, parsed: job.parsed })}>
                Select
              </Button>
            </li>
          ))}
        </ul>
      )}
      {mode === 'application' && (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {withJd.map((app) => (
            <li key={app.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="min-w-0">
                <span className="block truncate font-medium text-ink">{app.company}</span>
                <span className="block truncate text-xs text-muted">{app.role}</span>
              </span>
              <Button size="sm" variant="secondary" onClick={() => onPick({ source: 'application', id: app.id, title: `${app.role} at ${app.company}`, parsed: { ...app.parsed, title: app.role } })}>
                Select
              </Button>
            </li>
          ))}
        </ul>
      )}
      {mode !== 'paste' && onCancel && (
        <div className="mt-3 flex justify-end">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
};

export default JobPicker;

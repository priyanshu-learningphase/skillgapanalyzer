import { useRef, useState } from 'react';
import { FileUp, ClipboardPaste, Loader2, Lock } from 'lucide-react';
import Button from '../ui/Button';
import Segmented from '../ui/Segmented';
import { readResumeFile } from '../../services/pdfText';
import { cx } from '../../lib/cx';

/**
 * Collect resume text from a PDF/TXT upload or a paste. Text extraction runs
 * locally in the browser.
 */
const ResumeUpload = ({ onText, busy }) => {
  const [mode, setMode] = useState('upload');
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  const [pasted, setPasted] = useState('');
  const inputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    setError('');
    setReading(true);
    try {
      const text = await readResumeFile(file);
      onText(text, file.name);
    } catch (err) {
      console.error(err);
      setError(err.message || 'We couldn’t read that file.');
    } finally {
      setReading(false);
    }
  };

  const working = reading || busy;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Resume input"
          value={mode}
          onChange={(m) => {
            setMode(m);
            setError('');
          }}
          options={[
            { value: 'upload', label: 'Upload file', icon: FileUp },
            { value: 'paste', label: 'Paste text', icon: ClipboardPaste },
          ]}
        />
        <span className="inline-flex items-center gap-1.5 text-xs text-muted">
          <Lock className="h-3 w-3" aria-hidden /> Processed in your browser — the file isn’t uploaded anywhere
        </span>
      </div>

      {mode === 'upload' ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          className={cx(
            'flex flex-col items-center justify-center rounded-card border border-dashed px-6 py-10 text-center transition-colors',
            dragging ? 'border-accent bg-accent-50/50' : 'border-slate-300 bg-slate-50/50',
          )}
        >
          {working ? <Loader2 className="h-6 w-6 animate-spin text-muted" aria-hidden /> : <FileUp className="h-6 w-6 text-muted" aria-hidden />}
          <p className="mt-3 text-sm font-medium text-ink">{working ? 'Reading your resume…' : 'Drop your resume here'}</p>
          <p className="mt-1 text-xs text-muted">PDF or .txt, up to 5 MB</p>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.txt,application/pdf,text/plain"
            className="sr-only"
            onChange={(e) => {
              handleFile(e.target.files?.[0]);
              e.target.value = '';
            }}
            aria-label="Upload resume"
          />
          <Button variant="secondary" size="sm" className="mt-4" onClick={() => inputRef.current?.click()} disabled={working}>
            Choose file
          </Button>
        </div>
      ) : (
        <div>
          <label htmlFor="resume-text" className="sr-only">
            Resume text
          </label>
          <textarea
            id="resume-text"
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            rows={10}
            placeholder="Paste the full text of your resume…"
            className="input min-h-[12rem] resize-y font-mono text-[13px]"
          />
          <div className="mt-3 flex justify-end">
            <Button
              onClick={() => {
                if (pasted.trim().length < 80) {
                  setError('Paste a bit more — at least a few lines of your resume.');
                  return;
                }
                setError('');
                onText(pasted, 'Pasted text');
              }}
              loading={busy}
            >
              Analyze resume
            </Button>
          </div>
        </div>
      )}
      {error && (
        <p className="mt-3 rounded-lg border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default ResumeUpload;

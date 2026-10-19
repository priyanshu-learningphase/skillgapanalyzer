/**
 * ATS Resume Analyzer & Tailor — compare a resume with one job, act on the
 * feedback, edit with a live preview and download PDF or DOCX.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, Download, Replace, Target, BarChart3, PenLine, Lock, Trash2, AlertTriangle, FilePlus2 } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Segmented from '../components/ui/Segmented';
import { ConfirmDialog, Modal } from '../components/ui/Overlay';
import ResumeUpload from '../components/skills/ResumeUpload';
import JobPicker from '../components/resume/JobPicker';
import AtsReport from '../components/resume/AtsReport';
import ResumeEditor from '../components/resume/ResumeEditor';
import ResumePreview from '../components/resume/ResumePreview';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { emptyDraft, findPlaceholders, toResumeDraft } from '../lib/resumeDraft';
import { analyzeResumeForJob, suggestBullets, summaryTemplate } from '../lib/ats';
import { relativeTime } from '../lib/progress';

const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

const ResumeTailor = () => {
  const { insights, tracker, actions } = useWorkspace();
  const { userProfile } = useAuth();
  const toast = useToast();
  const [params] = useSearchParams();
  const saved = insights.resumeDraft;

  const [draft, setDraft] = useState(saved?.draft || null);
  const [meta, setMeta] = useState({ fileName: saved?.fileName || '', importedAt: saved?.importedAt || null });
  const [job, setJob] = useState(saved?.job || null);
  const [dismissed, setDismissed] = useState(saved?.dismissed || []);
  const [tab, setTab] = useState('analysis');
  const [pickingJob, setPickingJob] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saveState, setSaveState] = useState('saved');
  const [downloading, setDownloading] = useState(null);
  const [exportError, setExportError] = useState(null);
  const pendingFocus = useRef(null);
  // What was last written, so unchanged state never triggers a save.
  const lastSaved = useRef(saved ? JSON.stringify({ draft: saved.draft, job: saved.job || null, dismissed: saved.dismissed || [], meta: { fileName: saved.fileName || '', importedAt: saved.importedAt || null } }) : null);
  // Latest save function; `actions` gets a new identity after every save.
  const saveRef = useRef(actions.saveInsight);
  saveRef.current = actions.saveInsight;

  // Opened from an application: tailor for that job.
  useEffect(() => {
    const appId = params.get('app');
    const app = appId && tracker.applications.find((a) => a.id === appId);
    if (app?.parsed && (app.parsed.required.length || app.parsed.preferred.length)) {
      setJob({ source: 'application', id: app.id, title: `${app.role} at ${app.company}`, parsed: { ...app.parsed, title: app.role } });
    }
  }, [params, tracker.applications]);

  // Autosave (debounced) only when something changed since the last save.
  useEffect(() => {
    if (!draft) return undefined;
    const json = JSON.stringify({ draft, job, dismissed, meta });
    if (json === lastSaved.current) return undefined;
    setSaveState('saving');
    const t = setTimeout(async () => {
      lastSaved.current = json;
      const ok = await saveRef.current('resumeDraft', { draft, job, dismissed, ...meta, updatedAt: new Date().toISOString() });
      setSaveState(ok === false ? 'error' : 'saved');
    }, 800);
    return () => clearTimeout(t);
  }, [draft, job, dismissed, meta]);

  useEffect(() => {
    if (pendingFocus.current && tab === 'edit') {
      const el = document.getElementById(pendingFocus.current);
      if (el) {
        el.focus();
        el.scrollIntoView({ block: 'center' });
        const at = el.value.indexOf('[');
        if (at >= 0) el.setSelectionRange(at, el.value.indexOf(']', at) + 1);
      }
      pendingFocus.current = null;
    }
  });

  const report = useMemo(() => (draft && job ? analyzeResumeForJob(draft, job.parsed) : null), [draft, job]);
  const suggestions = useMemo(() => (draft ? suggestBullets(draft).filter((s) => !dismissed.includes(s.id)) : []), [draft, dismissed]);
  const placeholders = useMemo(() => (draft ? findPlaceholders(draft) : []), [draft]);

  const importText = (text, fileName) => {
    const next = toResumeDraft(text);
    if (!next.header.name && !next.experience.length && !next.projects.length && !next.skills.length) {
      toast.error('That doesn’t look like a resume', { description: 'We couldn’t find a name, skills, experience or projects. Try another file or paste the text.' });
      return;
    }
    setDraft(next);
    setMeta({ fileName: fileName || 'Pasted text', importedAt: new Date().toISOString() });
    setDismissed([]);
    setReplacing(false);
    toast.success('Resume imported', { description: 'Check the editor: automatic section detection isn’t perfect.' });
  };

  const startBlank = () => {
    const blank = emptyDraft();
    blank.header.name = userProfile?.name || '';
    setDraft(blank);
    setMeta({ fileName: 'Started from scratch', importedAt: new Date().toISOString() });
    setTab('edit');
  };

  const applySuggestion = (s) => {
    setDraft((d) => {
      const update = (entries) => entries.map((e) => ({ ...e, bullets: e.bullets.map((b) => (b.id === s.id ? { ...b, text: s.suggested } : b)) }));
      return { ...d, experience: update(d.experience), projects: update(d.projects) };
    });
    if (s.needsInput) {
      pendingFocus.current = s.id;
      setTab('edit');
    }
  };

  const download = async (kind) => {
    if (placeholders.length) {
      setExportError(placeholders);
      return;
    }
    setDownloading(kind);
    try {
      const lib = await import('../lib/resumeExport');
      const base = `${slug(draft.header.name) || 'resume'}${job ? `-${slug(job.title)}` : ''}`;
      if (kind === 'pdf') lib.downloadBytes(await lib.buildPdf(draft), `${base}.pdf`, 'application/pdf');
      else lib.downloadBytes(await lib.buildDocx(draft), `${base}.docx`, lib.DOCX_TYPE);
    } catch (err) {
      console.error(err);
      toast.error('Couldn’t create the file', { description: err.message });
    } finally {
      setDownloading(null);
    }
  };

  const deleteSaved = async () => {
    await actions.saveInsight('resumeDraft', null);
    lastSaved.current = null;
    setDraft(null);
    setJob(null);
    setDismissed([]);
    setConfirmDelete(false);
    toast.success('Saved resume deleted');
  };

  const downloads = draft && (
    <>
      <Button variant="secondary" icon={Download} onClick={() => download('docx')} loading={downloading === 'docx'}>
        DOCX
      </Button>
      <Button icon={Download} onClick={() => download('pdf')} loading={downloading === 'pdf'}>
        PDF
      </Button>
    </>
  );

  return (
    <div>
      <PageHeader
        title="Resume Analyzer"
        description="Check your resume against a specific job, fix what’s missing and download an ATS-friendly version."
        actions={downloads}
      />

      {!draft || replacing ? (
        <Card className="p-6">
          <h2 className="text-[15px] font-semibold text-ink">{replacing ? 'Replace your resume' : 'Start with your resume'}</h2>
          <p className="mt-1 max-w-xl text-sm text-muted">Upload a PDF or DOCX, or paste the text. We’ll split it into editable sections.</p>
          <div className="mt-5">
            <ResumeUpload onText={importText} />
          </div>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
            {replacing ? (
              <Button variant="secondary" onClick={() => setReplacing(false)}>
                Keep current resume
              </Button>
            ) : (
              <Button variant="ghost" icon={FilePlus2} onClick={startBlank}>
                Start from scratch instead
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="flex items-start justify-between gap-3 p-4">
              <div className="flex min-w-0 items-start gap-3">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
                <div className="min-w-0">
                  <p className="text-xs text-muted">Resume</p>
                  <p className="truncate text-sm font-medium text-ink">{meta.fileName || 'Your resume'}</p>
                  <p className="text-xs text-muted">
                    {saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Couldn’t save — retry from the toast' : 'All changes saved'}
                    {meta.importedAt && ` · imported ${relativeTime(meta.importedAt)}`}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0">
                <Button size="sm" variant="ghost" icon={Replace} onClick={() => setReplacing(true)}>
                  Replace
                </Button>
                <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setConfirmDelete(true)} aria-label="Delete saved resume" />
              </div>
            </Card>
            <Card className="flex items-start justify-between gap-3 p-4">
              <div className="flex min-w-0 items-start gap-3">
                <Target className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
                <div className="min-w-0">
                  <p className="text-xs text-muted">Target job</p>
                  <p className="truncate text-sm font-medium text-ink">{job ? job.title : 'Not chosen yet'}</p>
                  {job && (
                    <p className="text-xs text-muted">
                      {job.parsed.required.length} required · {job.parsed.preferred.length} preferred skills
                    </p>
                  )}
                </div>
              </div>
              <Button size="sm" variant={job ? 'ghost' : 'primary'} onClick={() => setPickingJob(true)}>
                {job ? 'Change' : 'Choose job'}
              </Button>
            </Card>
          </div>

          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
            <Lock className="h-3 w-3" aria-hidden /> Your resume text is saved privately in your workspace so you can keep editing. Delete it any time.
          </p>

          <div className="mt-5 mb-4 flex flex-wrap items-center justify-between gap-3">
            <Segmented
              label="Resume view"
              size="md"
              value={tab}
              onChange={setTab}
              options={[
                { value: 'analysis', label: 'Analysis', icon: BarChart3 },
                { value: 'edit', label: 'Edit & preview', icon: PenLine },
              ]}
            />
            {placeholders.length > 0 && (
              <p className="flex items-center gap-1.5 text-xs font-medium text-warning-700">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> {placeholders.length} placeholder{placeholders.length === 1 ? '' : 's'} to fill before downloading
              </p>
            )}
          </div>

          {tab === 'analysis' ? (
            report ? (
              <AtsReport
                report={report}
                suggestions={suggestions}
                job={job}
                hasSummary={Boolean(draft.summary.trim())}
                onApply={applySuggestion}
                onDismiss={(id) => setDismissed((list) => [...list, id])}
                onInsertSummary={() => {
                  setDraft((d) => ({ ...d, summary: summaryTemplate(d, job.parsed) }));
                  pendingFocus.current = 'r-summary';
                  setTab('edit');
                }}
                onOpenEditor={() => setTab('edit')}
              />
            ) : (
              <Card>
                <CardHeader title="Choose the job to tailor for" description="Your resume is compared with this job’s required and preferred skills." />
                <CardBody>
                  <JobPicker jobs={insights.jobs || []} applications={tracker.applications} onPick={(j) => setJob(j)} />
                </CardBody>
              </Card>
            )
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              <ResumeEditor draft={draft} onChange={setDraft} />
              <div className="xl:sticky xl:top-20 xl:self-start">
                {report && (
                  <div className="mb-3 flex items-center justify-between rounded-lg border border-line bg-white px-3 py-2 text-sm shadow-card">
                    <span className="text-muted">Estimated ATS match</span>
                    <span className="tabular font-semibold text-ink">{report.score}/100</span>
                  </div>
                )}
                <div className="max-h-[calc(100vh-9rem)] overflow-y-auto rounded-card">
                  <ResumePreview draft={draft} />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <Modal open={pickingJob} onClose={() => setPickingJob(false)} size="lg" title="Choose the job to tailor for">
        <JobPicker
          jobs={insights.jobs || []}
          applications={tracker.applications}
          onPick={(j) => {
            setJob(j);
            setDismissed([]);
            setPickingJob(false);
            setTab('analysis');
          }}
          onCancel={() => setPickingJob(false)}
        />
      </Modal>
      <Modal
        open={Boolean(exportError)}
        onClose={() => setExportError(null)}
        title="Fill in the placeholders first"
        description="These still contain bracketed text. Replace each one with a real detail, or delete it, then download."
        footer={
          <Button
            onClick={() => {
              setExportError(null);
              setTab('edit');
            }}
          >
            Go to editor
          </Button>
        }
      >
        <ul className="space-y-2 text-sm">
          {(exportError || []).map((p, i) => (
            <li key={i}>
              <span className="text-muted">{p.where}:</span> <span className="rounded bg-warning-100 px-1 text-warning-700">{p.text}</span>
            </li>
          ))}
        </ul>
      </Modal>
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={deleteSaved}
        tone="danger"
        title="Delete your saved resume?"
        description="The resume text and your edits are removed from your workspace. Files you’ve downloaded aren’t affected."
        confirmLabel="Delete"
      />
    </div>
  );
};

export default ResumeTailor;

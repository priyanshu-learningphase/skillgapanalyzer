/**
 * One application: match and missing skills, interview rounds, outcome,
 * next action, contacts and timeline.
 */

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, MapPin, Pencil, Trash2, Plus, Route, Check, X, CheckCircle2, UserRound, Mail, Phone, Link2, GraduationCap, FileText } from 'lucide-react';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import ScoreRing from '../components/ui/ScoreRing';
import PriorityBadge from '../components/ui/PriorityBadge';
import Field, { describedBy, inputClass } from '../components/ui/Field';
import { Modal, ConfirmDialog } from '../components/ui/Overlay';
import { EmptyState } from '../components/ui/States';
import ApplicationForm from '../components/applications/ApplicationForm';
import { StatusBadge, formatDate, relativeDay } from '../components/applications/parts';
import { useApplications } from '../hooks/useApplications';
import { useWorkspace } from '../context/WorkspaceContext';
import { useToast } from '../context/ToastContext';
import { APPLICATION_STATUSES, INTERVIEW_OUTCOMES, INTERVIEW_TYPES, STATUS_MAP, daysUntil, validateContact } from '../lib/applications';
import { hasAssessment } from '../data/assessments/index';
import { relativeTime } from '../lib/progress';
import { cx } from '../lib/cx';

const CLOSING = ['offer', 'rejected', 'withdrawn'];
const EMPTY_ROUND = { round: '', type: 'technical', date: '', time: '', outcome: 'scheduled', notes: '' };
const EMPTY_CONTACT = { name: '', title: '', email: '', phone: '', link: '', notes: '' };

const InterviewModal = ({ open, onClose, initial, onSave }) => {
  const [v, setV] = useState(initial || EMPTY_ROUND);
  const [error, setError] = useState('');
  const set = (f) => (e) => setV((x) => ({ ...x, [f]: e.target.value }));
  const save = () => {
    if (!v.round.trim()) return setError('Name this round, e.g. “Technical round 1”.');
    onSave(v);
    onClose();
    return null;
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial?.id ? 'Edit interview round' : 'Add interview round'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save round</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="round-name" label="Round" error={error} className="sm:col-span-2">
          <input id="round-name" value={v.round} onChange={set('round')} className={inputClass(error)} placeholder="e.g. Technical round 1" aria-invalid={Boolean(error)} aria-describedby={describedBy('round-name', error)} />
        </Field>
        <Field id="round-type" label="Type">
          <select id="round-type" value={v.type} onChange={set('type')} className="input">
            {INTERVIEW_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <Field id="round-outcome" label="Outcome">
          <select id="round-outcome" value={v.outcome} onChange={set('outcome')} className="input">
            {INTERVIEW_OUTCOMES.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field id="round-date" label="Date" optional>
          <input id="round-date" type="date" value={v.date || ''} onChange={set('date')} className="input" />
        </Field>
        <Field id="round-time" label="Time" optional>
          <input id="round-time" type="time" value={v.time || ''} onChange={set('time')} className="input" />
        </Field>
        <Field id="round-notes" label="Notes" optional className="sm:col-span-2" hint="Topics covered, questions asked, feedback.">
          <textarea id="round-notes" value={v.notes} onChange={set('notes')} rows={4} className="input resize-y" aria-describedby="round-notes-hint" />
        </Field>
      </div>
    </Modal>
  );
};

const ContactModal = ({ open, onClose, initial, onSave }) => {
  const [v, setV] = useState(initial || EMPTY_CONTACT);
  const [errors, setErrors] = useState({});
  const set = (f) => (e) => setV((x) => ({ ...x, [f]: e.target.value }));
  const save = () => {
    const result = validateContact(v);
    setErrors(result.errors);
    if (!result.ok) return;
    onSave(v);
    onClose();
  };
  const input = (id, label, props = {}) => (
    <Field id={`ct-${id}`} label={label} error={errors[id]} optional={props.optional}>
      <input id={`ct-${id}`} type={props.type || 'text'} value={v[id]} onChange={set(id)} className={inputClass(errors[id])} aria-invalid={Boolean(errors[id])} aria-describedby={describedBy(`ct-${id}`, errors[id])} />
    </Field>
  );
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial?.id ? 'Edit contact' : 'Add contact'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save contact</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {input('name', 'Name')}
        {input('title', 'Title', { optional: true })}
        {input('email', 'Email', { optional: true, type: 'email' })}
        {input('phone', 'Phone', { optional: true, type: 'tel' })}
        <div className="sm:col-span-2">{input('link', 'LinkedIn or profile link', { optional: true, type: 'url' })}</div>
        <Field id="ct-notes" label="Notes" optional className="sm:col-span-2">
          <textarea id="ct-notes" value={v.notes} onChange={set('notes')} rows={2} className="input resize-y" />
        </Field>
      </div>
    </Modal>
  );
};

const ApplicationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { actions } = useWorkspace();
  const tracker = useApplications();
  const app = tracker.applications.find((a) => a.id === id);
  const match = tracker.matches[id];

  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(false);
  const [targeting, setTargeting] = useState(false);
  const [round, setRound] = useState(null);
  const [contact, setContact] = useState(null);
  const [closing, setClosing] = useState(null);
  const [closingNote, setClosingNote] = useState('');

  if (!app) {
    return (
      <Card>
        <EmptyState title="Application not found" description="It may have been deleted." action={<Button to="/applications" icon={ArrowLeft}>Back to applications</Button>} />
      </Card>
    );
  }

  const changeStatus = (status) => {
    if (CLOSING.includes(status)) {
      setClosingNote('');
      setClosing(status);
    } else tracker.move(app.id, status);
  };

  const targetJob = async () => {
    setTargeting(true);
    try {
      await actions.targetJob({ parsed: { ...app.parsed, title: `${app.role} at ${app.company}` } });
      toast.success('Goal set to this job', { description: 'Generating a roadmap for its required skills.' });
      navigate('/roadmap', { state: { autoGenerate: true } });
    } finally {
      setTargeting(false);
      setConfirmTarget(false);
    }
  };

  const next = app.nextAction && !app.nextAction.done ? app.nextAction : null;
  const nextDays = next?.due ? daysUntil(next.due) : null;

  return (
    <div>
      <Link to="/applications" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Applications
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">{app.company}</h1>
            <StatusBadge status={app.status} />
          </div>
          <p className="mt-0.5 text-sm text-ink-soft">{app.role}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            {app.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" aria-hidden /> {app.location}
              </span>
            )}
            {app.url && (
              <a href={app.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 font-medium text-ink hover:underline">
                Job posting <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            )}
            <span>Updated {relativeTime(app.updatedAt)}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="detail-status" className="sr-only">
            Status
          </label>
          <select id="detail-status" value={app.status} onChange={(e) => changeStatus(e.target.value)} className="input h-9 w-auto py-1.5">
            {APPLICATION_STATUSES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <Button variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button variant="ghost" icon={Trash2} onClick={() => setConfirmDelete(true)} aria-label="Delete application" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Your match" description="Your current skills against this job’s required and preferred skills." />
            <CardBody>
              {match ? (
                <>
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                    <ScoreRing value={match.match} size={104} stroke={9} tone={match.match >= 75 ? 'success' : match.match >= 50 ? 'accent' : 'warning'} label={`Job match ${match.match}%`}>
                      <span className="text-2xl font-semibold text-ink">{match.match}%</span>
                      <span className="text-2xs text-muted">job match</span>
                    </ScoreRing>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-ink">
                        You meet <span className="font-semibold">{match.have.length}</span> of {match.rows.length} skills this job lists.
                      </p>
                      {match.criticalMissing.length > 0 ? (
                        <p className="mt-1 text-sm text-muted">
                          Critical to close: <span className="font-medium text-ink">{match.criticalMissing.slice(0, 4).map((g) => g.skillName).join(', ')}</span>
                        </p>
                      ) : (
                        <p className="mt-1 text-sm text-muted">No critical gaps for this job.</p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {match.gaps.length > 0 && (
                          <Button size="sm" icon={Route} onClick={() => setConfirmTarget(true)}>
                            Build roadmap for this job
                          </Button>
                        )}
                        <Button size="sm" variant="secondary" icon={FileText} to={`/resume?app=${app.id}`}>
                          Tailor resume
                        </Button>
                        {match.missing.some((r) => hasAssessment(r.id)) && (
                          <Button size="sm" variant="secondary" icon={GraduationCap} to="/assessments">
                            Prove skills with assessments
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  <ul className="mt-5 divide-y divide-line border-t border-line">
                    {match.rows.map((row) => {
                      const gap = match.gaps.find((g) => g.skillId === row.id);
                      return (
                        <li key={row.id} className="flex items-center gap-3 py-2 text-sm">
                          {row.has ? <Check className="h-4 w-4 shrink-0 text-success-600" aria-label="Have" /> : <X className="h-4 w-4 shrink-0 text-danger" aria-label="Missing" />}
                          <Link to={`/gap?skill=${row.id}`} className="min-w-0 flex-1 truncate text-ink hover:underline">
                            {row.name}
                          </Link>
                          {gap && !row.has && <PriorityBadge priority={gap.priority} />}
                          <span className={cx('w-16 text-xs', row.kind === 'required' ? 'font-medium text-ink' : 'text-muted')}>{row.kind === 'required' ? 'Required' : 'Preferred'}</span>
                          <span className="tabular w-14 text-right text-xs text-muted">
                            {row.level}/{row.target}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : (
                <div className="flex flex-col items-start gap-3 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
                  <p>{app.description ? 'No recognisable technical skills in this description.' : 'Add the job description to see your match and the skills to close.'}</p>
                  <Button size="sm" variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>
                    {app.description ? 'Edit description' : 'Add description'}
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Interview rounds"
              description={app.interviews?.length ? `${app.interviews.length} round${app.interviews.length === 1 ? '' : 's'}` : 'Record each round, its date and the outcome.'}
              action={
                <Button size="sm" variant="secondary" icon={Plus} onClick={() => setRound({ ...EMPTY_ROUND })}>
                  Add round
                </Button>
              }
            />
            <CardBody>
              {app.interviews?.length ? (
                <ol className="space-y-3">
                  {app.interviews.map((r) => (
                    <li key={r.id} className="rounded-lg border border-line p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-ink">{r.round}</p>
                          <p className="text-xs text-muted">
                            {INTERVIEW_TYPES.find((t) => t.id === r.type)?.label}
                            {r.date && ` · ${formatDate(r.date)}${r.time ? ` at ${r.time}` : ''}`}
                            {r.outcome === 'scheduled' && r.date && ` · ${relativeDay(daysUntil(r.date))}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <label className="sr-only" htmlFor={`outcome-${r.id}`}>
                            Outcome of {r.round}
                          </label>
                          <select id={`outcome-${r.id}`} value={r.outcome} onChange={(e) => tracker.saveInterview(app.id, { ...r, outcome: e.target.value })} className="rounded-md border border-line bg-white px-1.5 py-1 text-xs">
                            {INTERVIEW_OUTCOMES.map((o) => (
                              <option key={o.id} value={o.id}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                          <Button size="xs" variant="ghost" icon={Pencil} onClick={() => setRound(r)} aria-label={`Edit ${r.round}`} />
                          <Button size="xs" variant="ghost" icon={Trash2} onClick={() => tracker.removeInterview(app.id, r.id)} aria-label={`Delete ${r.round}`} />
                        </div>
                      </div>
                      {r.notes && <p className="mt-2 whitespace-pre-line text-sm text-ink-soft">{r.notes}</p>}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted">No interviews yet.</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Notes & job description" />
            <CardBody>
              <p className="whitespace-pre-line text-sm text-ink-soft">{app.notes || <span className="text-muted">No notes.</span>}</p>
              {app.description && (
                <details className="mt-4 rounded-lg border border-line">
                  <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-ink">Job description</summary>
                  <p className="max-h-80 overflow-y-auto whitespace-pre-line border-t border-line px-3 py-2 text-[13px] text-ink-soft">{app.description}</p>
                </details>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Next action" />
            <CardBody>
              {next ? (
                <>
                  <p className="text-sm font-medium text-ink">{next.text}</p>
                  {next.due && <p className={cx('mt-0.5 text-xs', nextDays < 0 ? 'font-medium text-danger-700' : 'text-muted')}>{relativeDay(nextDays)} · {formatDate(next.due)}</p>}
                  <Button size="sm" variant="secondary" icon={CheckCircle2} className="mt-3" onClick={() => tracker.completeNextAction(app.id)}>
                    Mark done
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted">{app.nextAction?.done ? `Done: ${app.nextAction.text}` : 'No next action set.'}</p>
                  <Button size="sm" variant="secondary" icon={Plus} className="mt-3" onClick={() => setEditing(true)}>
                    Set next action
                  </Button>
                </>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Key dates" />
            <CardBody>
              <dl className="space-y-2 text-sm">
                {[
                  ['Applied', app.appliedOn],
                  ['Deadline', app.deadline],
                  ['Added', app.createdAt?.slice(0, 10)],
                ].map(([label, date]) => (
                  <div key={label} className="flex justify-between gap-3">
                    <dt className="text-muted">{label}</dt>
                    <dd className="text-ink">{date ? formatDate(date) : '—'}</dd>
                  </div>
                ))}
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Contacts"
              action={
                <Button size="xs" variant="ghost" icon={Plus} onClick={() => setContact({ ...EMPTY_CONTACT })}>
                  Add
                </Button>
              }
            />
            <CardBody>
              {app.contacts?.length ? (
                <ul className="space-y-3">
                  {app.contacts.map((c) => (
                    <li key={c.id} className="text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <p className="flex items-center gap-1.5 font-medium text-ink">
                          <UserRound className="h-3.5 w-3.5 text-muted" aria-hidden /> {c.name}
                        </p>
                        <div className="flex">
                          <Button size="xs" variant="ghost" icon={Pencil} onClick={() => setContact(c)} aria-label={`Edit ${c.name}`} />
                          <Button size="xs" variant="ghost" icon={Trash2} onClick={() => tracker.removeContact(app.id, c.id)} aria-label={`Delete ${c.name}`} />
                        </div>
                      </div>
                      {c.title && <p className="text-xs text-muted">{c.title}</p>}
                      <div className="mt-1 space-y-0.5 text-xs">
                        {c.email && (
                          <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 text-ink hover:underline">
                            <Mail className="h-3 w-3 text-muted" aria-hidden /> {c.email}
                          </a>
                        )}
                        {c.phone && (
                          <p className="flex items-center gap-1.5 text-ink">
                            <Phone className="h-3 w-3 text-muted" aria-hidden /> {c.phone}
                          </p>
                        )}
                        {c.link && (
                          <a href={c.link} target="_blank" rel="noreferrer noopener" className="flex items-center gap-1.5 text-ink hover:underline">
                            <Link2 className="h-3 w-3 text-muted" aria-hidden /> Profile
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">Recruiters, referrers or interviewers.</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Timeline" />
            <CardBody>
              <ol className="relative space-y-3 border-l border-line pl-4">
                {[...(app.history || [])].reverse().map((h, i) => (
                  <li key={`${h.at}-${i}`} className="text-sm">
                    <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-slate-300" aria-hidden />
                    <p className="text-ink">{STATUS_MAP[h.status]?.label || h.status}</p>
                    {h.note && <p className="text-xs text-muted">{h.note}</p>}
                    <p className="text-2xs text-muted-light">{new Date(h.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        </div>
      </div>

      <ApplicationForm open={editing} initial={app} mode="edit" onClose={() => setEditing(false)} onSubmit={(values) => tracker.update(app.id, values)} />
      {round && <InterviewModal open onClose={() => setRound(null)} initial={round} onSave={(r) => tracker.saveInterview(app.id, r)} />}
      {contact && <ContactModal open onClose={() => setContact(null)} initial={contact} onSave={(c) => tracker.saveContact(app.id, c)} />}
      <Modal
        open={Boolean(closing)}
        onClose={() => setClosing(null)}
        title={`Record outcome: ${closing ? STATUS_MAP[closing].label : ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setClosing(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                tracker.move(app.id, closing, closingNote);
                setClosing(null);
              }}
            >
              Save outcome
            </Button>
          </>
        }
      >
        <Field id="outcome-note" label="What happened?" optional hint="e.g. offer details, feedback received, or why you withdrew.">
          <textarea id="outcome-note" value={closingNote} onChange={(e) => setClosingNote(e.target.value)} rows={3} maxLength={300} className="input resize-y" aria-describedby="outcome-note-hint" />
        </Field>
      </Modal>
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await tracker.remove(app.id);
          navigate('/applications', { replace: true });
        }}
        tone="danger"
        title="Delete this application?"
        description={`${app.role} at ${app.company}, including its interviews, contacts and notes, will be removed. This can’t be undone.`}
        confirmLabel="Delete"
      />
      <ConfirmDialog
        open={confirmTarget}
        onClose={() => setConfirmTarget(false)}
        onConfirm={targetJob}
        loading={targeting}
        title="Build a roadmap for this job?"
        description={`Your goal becomes “${app.role} at ${app.company}” and a roadmap is generated for its required and preferred skills. Your skills and progress are kept; you can switch back from Profile.`}
        confirmLabel="Set goal & generate"
      />
    </div>
  );
};

export default ApplicationDetail;

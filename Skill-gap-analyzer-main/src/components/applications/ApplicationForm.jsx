import { useEffect, useState } from 'react';
import { Modal } from '../ui/Overlay';
import Button from '../ui/Button';
import Field, { describedBy, inputClass } from '../ui/Field';
import { APPLICATION_STATUSES, LIMITS, validateApplication } from '../../lib/applications';

const EMPTY = { company: '', role: '', status: 'saved', location: '', url: '', appliedOn: '', deadline: '', nextActionText: '', nextActionDue: '', description: '', notes: '' };

const fromApplication = (app) =>
  app
    ? {
        ...EMPTY,
        ...app,
        appliedOn: app.appliedOn || '',
        deadline: app.deadline || '',
        nextActionText: app.nextAction && !app.nextAction.done ? app.nextAction.text : '',
        nextActionDue: app.nextAction && !app.nextAction.done ? app.nextAction.due || '' : '',
      }
    : EMPTY;

/** Add or edit an application. `initial` may be a saved application or a draft. */
const ApplicationForm = ({ open, onClose, initial, onSubmit, mode = 'add' }) => {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (open) {
      setValues(fromApplication(initial));
      setErrors({});
      setSubmitError('');
    }
  }, [open, initial]);

  const set = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }));

  const submit = async (e) => {
    e?.preventDefault();
    const result = validateApplication(values);
    setErrors(result.errors);
    if (!result.ok) return;
    setSaving(true);
    setSubmitError('');
    try {
      await onSubmit(values);
      onClose();
    } catch (err) {
      setSubmitError(err.message || 'Couldn’t save this application.');
    } finally {
      setSaving(false);
    }
  };

  const field = (id, label, props = {}) => (
    <Field id={`app-${id}`} label={label} error={errors[id]} hint={props.hint} optional={props.optional}>
      <input
        id={`app-${id}`}
        type={props.type || 'text'}
        value={values[id]}
        onChange={set(id)}
        maxLength={props.maxLength}
        placeholder={props.placeholder}
        aria-invalid={Boolean(errors[id])}
        aria-describedby={describedBy(`app-${id}`, errors[id], props.hint)}
        className={inputClass(errors[id])}
        autoComplete="off"
      />
    </Field>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={mode === 'add' ? 'Track an application' : 'Edit application'}
      description={mode === 'add' ? 'Paste the job description to see your match and missing skills.' : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            {mode === 'add' ? 'Add application' : 'Save changes'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        {submitError && (
          <p className="rounded-lg border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700 sm:col-span-2" role="alert">
            {submitError}
          </p>
        )}
        {field('company', 'Company', { maxLength: LIMITS.company, placeholder: 'e.g. Microsoft' })}
        {field('role', 'Role', { maxLength: LIMITS.role, placeholder: 'e.g. Software Engineer Intern' })}
        <Field id="app-status" label="Status" error={errors.status}>
          <select id="app-status" value={values.status} onChange={set('status')} className="input">
            {APPLICATION_STATUSES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        {field('location', 'Location', { optional: true, placeholder: 'e.g. Bengaluru · Hybrid' })}
        {field('url', 'Job link', { optional: true, type: 'url', placeholder: 'https://…', maxLength: LIMITS.url })}
        {field('appliedOn', 'Applied on', { optional: true, type: 'date' })}
        {field('deadline', 'Application deadline', { optional: true, type: 'date' })}
        <div className="hidden sm:block" />
        {field('nextActionText', 'Next action', { optional: true, placeholder: 'e.g. Follow up with the recruiter', maxLength: LIMITS.nextAction })}
        {field('nextActionDue', 'Next action due', { optional: true, type: 'date' })}
        <Field
          id="app-description"
          label="Job description"
          optional
          error={errors.description}
          hint="Used to compare the job’s requirements with your skills. Stays in your account."
          className="sm:col-span-2"
        >
          <textarea
            id="app-description"
            value={values.description}
            onChange={set('description')}
            rows={6}
            maxLength={LIMITS.description}
            aria-describedby={describedBy('app-description', errors.description, 'hint')}
            className={inputClass(errors.description, 'resize-y text-[13px]')}
            placeholder="Paste the full job post…"
          />
        </Field>
        <Field id="app-notes" label="Notes" optional className="sm:col-span-2">
          <textarea id="app-notes" value={values.notes} onChange={set('notes')} rows={3} maxLength={LIMITS.notes} className="input resize-y" placeholder="Referral, salary range, anything worth remembering…" />
        </Field>
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  );
};

export default ApplicationForm;

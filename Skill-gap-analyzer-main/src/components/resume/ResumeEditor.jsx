import { Plus, Trash2, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react';
import Card, { CardHeader, CardBody } from '../ui/Card';
import Button from '../ui/Button';
import Field from '../ui/Field';
import { newBullet, newEntry, newItem, newSkillGroup } from '../../lib/resumeDraft';

const move = (list, index, delta) => {
  const next = [...list];
  const [item] = next.splice(index, 1);
  next.splice(Math.max(0, Math.min(next.length, index + delta)), 0, item);
  return next;
};

const autoRows = (text, min = 2) => Math.min(8, Math.max(min, Math.ceil(String(text || '').length / 80)));

const IconButton = ({ icon, label, onClick, disabled }) => <Button size="xs" variant="ghost" icon={icon} onClick={onClick} disabled={disabled} aria-label={label} className="h-7 w-7 px-0" />;

/** Entries with a heading, subheading, dates and bullets (experience, projects, education). */
const EntrySection = ({ title, sectionKey, entries, onChange, labels }) => {
  const update = (index, patch) => onChange(entries.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  return (
    <Card>
      <CardHeader
        title={title}
        action={
          <Button size="sm" variant="ghost" icon={Plus} onClick={() => onChange([...entries, newEntry()])}>
            Add
          </Button>
        }
      />
      <CardBody className="space-y-4">
        {!entries.length && <p className="text-sm text-muted">Nothing here yet.</p>}
        {entries.map((entry, index) => (
          <div key={entry.id} className="rounded-lg border border-line p-3">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
              <Field id={`${entry.id}-heading`} label={labels.heading}>
                <input id={`${entry.id}-heading`} value={entry.heading} onChange={(e) => update(index, { heading: e.target.value })} className="input" />
              </Field>
              <Field id={`${entry.id}-dates`} label="Dates" optional>
                <input id={`${entry.id}-dates`} value={entry.dates} onChange={(e) => update(index, { dates: e.target.value })} className="input" placeholder="Jun 2025 – Aug 2025" />
              </Field>
              <Field id={`${entry.id}-sub`} label={labels.subheading} optional className="sm:col-span-2">
                <input id={`${entry.id}-sub`} value={entry.subheading} onChange={(e) => update(index, { subheading: e.target.value })} className="input" />
              </Field>
            </div>
            <fieldset className="mt-3">
              <legend className="label">{labels.bullets}</legend>
              <ul className="space-y-2">
                {entry.bullets.map((bullet, bi) => {
                  const edited = bullet.original && bullet.text.trim() !== bullet.original.trim();
                  return (
                    <li key={bullet.id} className="flex items-start gap-1.5">
                      <span className="mt-2.5 text-muted" aria-hidden>
                        •
                      </span>
                      <div className="min-w-0 flex-1">
                        <label htmlFor={bullet.id} className="sr-only">
                          {labels.bullets} {bi + 1}
                        </label>
                        <textarea
                          id={bullet.id}
                          value={bullet.text}
                          rows={autoRows(bullet.text)}
                          onChange={(e) => update(index, { bullets: entry.bullets.map((b) => (b.id === bullet.id ? { ...b, text: e.target.value } : b)) })}
                          className="input resize-y py-1.5 text-[13px]"
                        />
                        {edited && (
                          <p className="mt-1 flex items-center gap-2 text-2xs text-muted">
                            <span className="rounded bg-accent-50 px-1 font-medium text-accent-700">Edited</span>
                            <span className="truncate">Original: {bullet.original}</span>
                            <button
                              type="button"
                              onClick={() => update(index, { bullets: entry.bullets.map((b) => (b.id === bullet.id ? { ...b, text: b.original } : b)) })}
                              className="inline-flex shrink-0 items-center gap-0.5 font-medium text-ink hover:underline"
                            >
                              <RotateCcw className="h-3 w-3" aria-hidden /> Revert
                            </button>
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <IconButton icon={ArrowUp} label="Move bullet up" disabled={bi === 0} onClick={() => update(index, { bullets: move(entry.bullets, bi, -1) })} />
                        <IconButton icon={ArrowDown} label="Move bullet down" disabled={bi === entry.bullets.length - 1} onClick={() => update(index, { bullets: move(entry.bullets, bi, 1) })} />
                      </div>
                      <IconButton icon={Trash2} label="Delete bullet" onClick={() => update(index, { bullets: entry.bullets.filter((b) => b.id !== bullet.id) })} />
                    </li>
                  );
                })}
              </ul>
              <Button size="xs" variant="ghost" icon={Plus} className="mt-2" onClick={() => update(index, { bullets: [...entry.bullets, { ...newBullet(''), original: '' }] })}>
                Add bullet
              </Button>
            </fieldset>
            <div className="mt-3 flex justify-end gap-1 border-t border-line pt-2">
              <IconButton icon={ArrowUp} label={`Move ${sectionKey} entry up`} disabled={index === 0} onClick={() => onChange(move(entries, index, -1))} />
              <IconButton icon={ArrowDown} label={`Move ${sectionKey} entry down`} disabled={index === entries.length - 1} onClick={() => onChange(move(entries, index, 1))} />
              <Button size="xs" variant="ghost" icon={Trash2} onClick={() => onChange(entries.filter((e) => e.id !== entry.id))}>
                Remove
              </Button>
            </div>
          </div>
        ))}
      </CardBody>
    </Card>
  );
};

const ItemSection = ({ title, items, onChange, placeholder }) => (
  <Card>
    <CardHeader
      title={title}
      action={
        <Button size="sm" variant="ghost" icon={Plus} onClick={() => onChange([...items, newItem('')])}>
          Add
        </Button>
      }
    />
    <CardBody className="space-y-2">
      {!items.length && <p className="text-sm text-muted">Nothing here yet.</p>}
      {items.map((item, i) => (
        <div key={item.id} className="flex items-center gap-1.5">
          <label htmlFor={item.id} className="sr-only">
            {title} {i + 1}
          </label>
          <input id={item.id} value={item.text} onChange={(e) => onChange(items.map((x) => (x.id === item.id ? { ...x, text: e.target.value } : x)))} className="input" placeholder={placeholder} />
          <IconButton icon={Trash2} label={`Delete ${title.toLowerCase()} item`} onClick={() => onChange(items.filter((x) => x.id !== item.id))} />
        </div>
      ))}
    </CardBody>
  </Card>
);

/** Structured resume editor. Every change is passed up as a whole draft. */
const ResumeEditor = ({ draft, onChange }) => {
  const set = (patch) => onChange({ ...draft, ...patch });
  const header = (field) => (e) => set({ header: { ...draft.header, [field]: e.target.value } });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Header" />
        <CardBody className="grid gap-3 sm:grid-cols-2">
          {[
            ['name', 'Full name'],
            ['email', 'Email'],
            ['phone', 'Phone'],
            ['location', 'Location'],
          ].map(([field, label]) => (
            <Field key={field} id={`h-${field}`} label={label}>
              <input id={`h-${field}`} value={draft.header[field]} onChange={header(field)} className="input" />
            </Field>
          ))}
          <Field id="h-links" label="Links" hint="Separate with “ | ”, e.g. linkedin.com/in/you | github.com/you" className="sm:col-span-2">
            <input id="h-links" value={draft.header.links} onChange={header('links')} className="input" aria-describedby="h-links-hint" />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Summary" />
        <CardBody>
          <label htmlFor="r-summary" className="sr-only">
            Summary
          </label>
          <textarea id="r-summary" value={draft.summary} onChange={(e) => set({ summary: e.target.value })} rows={autoRows(draft.summary, 3)} className="input resize-y text-[13px]" placeholder="2–3 lines: who you are, your strongest relevant skills, the role you want." />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Technical skills"
          action={
            <Button size="sm" variant="ghost" icon={Plus} onClick={() => set({ skills: [...draft.skills, newSkillGroup('', '')] })}>
              Add group
            </Button>
          }
        />
        <CardBody className="space-y-2">
          {draft.skills.map((g, i) => (
            <div key={g.id} className="grid grid-cols-[8rem_minmax(0,1fr)_auto] items-center gap-1.5">
              <label htmlFor={`${g.id}-g`} className="sr-only">
                Skill group {i + 1} name
              </label>
              <input id={`${g.id}-g`} value={g.group} onChange={(e) => set({ skills: draft.skills.map((x) => (x.id === g.id ? { ...x, group: e.target.value } : x)) })} className="input" placeholder="Languages" />
              <label htmlFor={`${g.id}-i`} className="sr-only">
                Skill group {i + 1} items
              </label>
              <input id={`${g.id}-i`} value={g.items} onChange={(e) => set({ skills: draft.skills.map((x) => (x.id === g.id ? { ...x, items: e.target.value } : x)) })} className="input" placeholder="JavaScript, Python, SQL" />
              <IconButton icon={Trash2} label="Delete skill group" onClick={() => set({ skills: draft.skills.filter((x) => x.id !== g.id) })} />
            </div>
          ))}
          {!draft.skills.length && <p className="text-sm text-muted">Add groups like Languages, Frameworks, Tools.</p>}
        </CardBody>
      </Card>

      <EntrySection title="Experience" sectionKey="experience" entries={draft.experience} onChange={(experience) => set({ experience })} labels={{ heading: 'Role and organisation', subheading: 'Team, location or extra detail', bullets: 'Bullets' }} />
      <EntrySection title="Projects" sectionKey="project" entries={draft.projects} onChange={(projects) => set({ projects })} labels={{ heading: 'Project name (and stack)', subheading: 'Stack or link', bullets: 'Bullets' }} />
      <EntrySection title="Education" sectionKey="education" entries={draft.education} onChange={(education) => set({ education })} labels={{ heading: 'Degree and institution', subheading: 'CGPA, coursework or honours', bullets: 'Details' }} />
      <ItemSection title="Certifications" items={draft.certifications} onChange={(certifications) => set({ certifications })} placeholder="e.g. AWS Certified Cloud Practitioner (2025)" />
      <ItemSection title="Achievements" items={draft.achievements} onChange={(achievements) => set({ achievements })} placeholder="e.g. Top 10 at Smart India Hackathon 2025" />
    </div>
  );
};

export default ResumeEditor;

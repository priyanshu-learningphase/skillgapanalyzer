import { draftSections, headerLines } from '../../lib/resumeDraft';

const PLACEHOLDER_SPLIT = /(\[[^\]\n]{2,120}\])/g;

/** Text with "[…]" placeholders highlighted so they can't be missed. */
export const Highlighted = ({ text }) =>
  String(text || '')
    .split(PLACEHOLDER_SPLIT)
    .map((part, i) =>
      i % 2 ? (
        <mark key={i} className="rounded bg-warning-100 px-0.5 text-warning-700">
          {part}
        </mark>
      ) : (
        part
      ),
    );

/**
 * Single-column preview matching the exported PDF/DOCX layout (the same
 * section order and content come from draftSections).
 */
const ResumePreview = ({ draft }) => {
  const [name, contact] = headerLines(draft.header);
  const sections = draftSections(draft);
  return (
    <article className="rounded-card border border-line bg-white px-6 py-7 text-[12.5px] leading-snug text-ink shadow-card sm:px-9" aria-label="Resume preview">
      {name ? <h2 className="text-center text-xl font-bold tracking-tight">{name}</h2> : <p className="text-center text-muted">Your name</p>}
      {contact && <p className="mt-1 text-center text-[11.5px] text-slate-600">{contact}</p>}
      {sections.map((section) => (
        <section key={section.key} className="mt-4">
          <h3 className="border-b border-slate-400 pb-0.5 text-[11.5px] font-bold uppercase tracking-wide">{section.title}</h3>
          {section.paragraphs?.map((p, i) => (
            <p key={i} className="mt-1.5">
              <Highlighted text={p} />
            </p>
          ))}
          {section.lines?.map((line, i) => {
            const [group, ...rest] = line.split(': ');
            return (
              <p key={i} className="mt-1">
                {rest.length ? (
                  <>
                    <span className="font-semibold">{group}:</span> <Highlighted text={rest.join(': ')} />
                  </>
                ) : (
                  <Highlighted text={line} />
                )}
              </p>
            );
          })}
          {section.entries?.map((entry) => (
            <div key={entry.id} className="mt-2">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-semibold">
                  <Highlighted text={entry.heading} />
                </p>
                {entry.dates && <p className="shrink-0 text-[11.5px] text-slate-600">{entry.dates}</p>}
              </div>
              {entry.subheading && (
                <p className="text-[11.5px] italic text-slate-600">
                  <Highlighted text={entry.subheading} />
                </p>
              )}
              <ul className="mt-0.5 list-disc space-y-0.5 pl-4">
                {entry.bullets
                  .filter((b) => b.text.trim())
                  .map((b) => (
                    <li key={b.id}>
                      <Highlighted text={b.text} />
                    </li>
                  ))}
              </ul>
            </div>
          ))}
          {section.items && (
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {section.items.map((item, i) => (
                <li key={i}>
                  <Highlighted text={item} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
      {!sections.length && <p className="mt-6 text-center text-muted">Add sections in the editor to see them here.</p>}
    </article>
  );
};

export default ResumePreview;

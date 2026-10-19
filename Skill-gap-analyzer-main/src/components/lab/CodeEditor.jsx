import { useRef } from 'react';

/**
 * Lightweight code editor: a monospace textarea where Tab indents (Shift+Tab
 * or Escape then Tab moves focus on, so keyboard users are never trapped).
 */
const CodeEditor = ({ id, value, onChange, label, rows = 14, language }) => {
  const escaped = useRef(false);

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      escaped.current = true;
      return;
    }
    if (e.key === 'Tab' && !e.shiftKey && !escaped.current) {
      e.preventDefault();
      const el = e.currentTarget;
      const { selectionStart: start, selectionEnd: end } = el;
      const next = `${value.slice(0, start)}  ${value.slice(end)}`;
      onChange(next);
      requestAnimationFrame(() => el.setSelectionRange(start + 2, start + 2));
      return;
    }
    escaped.current = false;
  };

  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        rows={rows}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        data-language={language}
        aria-describedby={`${id}-help`}
        className="block w-full resize-y rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 font-mono text-[13px] leading-relaxed text-slate-100 caret-white focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
      />
      <p id={`${id}-help`} className="mt-1 text-2xs text-muted">
        Tab indents. Press Esc, then Tab, to move focus out of the editor.
      </p>
    </div>
  );
};

export default CodeEditor;

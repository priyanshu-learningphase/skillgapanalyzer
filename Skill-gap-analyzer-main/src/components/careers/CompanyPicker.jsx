import { useState } from 'react';
import { Building2 } from 'lucide-react';
import { COMPANIES } from '../../data/companies';
import { cx } from '../../lib/cx';

/**
 * Pick a target company: none, a known profile, or a custom name.
 * value: { id, name } | null
 */
const CompanyPicker = ({ value, onChange, compact = false }) => {
  const [customName, setCustomName] = useState(value?.id === 'custom' ? value.name : '');
  const selectedId = value?.id || null;
  const profile = COMPANIES.find((c) => c.id === selectedId);

  const chip = (id, label, onSelect) => (
    <button
      key={id || 'none'}
      type="button"
      role="radio"
      aria-checked={selectedId === id}
      onClick={onSelect}
      className={cx(
        'h-8 rounded-lg border px-3 text-[13px] font-medium transition-colors',
        selectedId === id ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink hover:border-slate-400',
      )}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Target company">
        {chip(null, 'No preference', () => onChange(null))}
        {COMPANIES.map((c) => chip(c.id, c.name, () => onChange({ id: c.id, name: c.name })))}
        {chip('custom', 'Other company', () => onChange({ id: 'custom', name: customName.trim() || 'My target company' }))}
      </div>
      {selectedId === 'custom' && (
        <div className="mt-3 max-w-xs animate-fade-in">
          <label htmlFor="custom-company" className="sr-only">
            Company name
          </label>
          <input
            id="custom-company"
            className="input"
            placeholder="Company name"
            value={customName}
            maxLength={60}
            onChange={(e) => {
              setCustomName(e.target.value);
              onChange({ id: 'custom', name: e.target.value.trim() || 'My target company' });
            }}
          />
          <p className="mt-1.5 text-xs text-muted">We’ll use general expectations for your role.</p>
        </div>
      )}
      {profile && !compact && (
        <p className="mt-3 flex items-start gap-2 text-sm text-muted animate-fade-in">
          <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-light" aria-hidden />
          <span>
            <span className="font-medium text-ink">{profile.name}</span> typically emphasises {profile.focus.charAt(0).toLowerCase() + profile.focus.slice(1)}{' '}
            <span className="text-muted-light">Based on commonly reported interview focus — not official requirements.</span>
          </span>
        </p>
      )}
    </div>
  );
};

export default CompanyPicker;

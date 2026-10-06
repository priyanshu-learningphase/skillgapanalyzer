import { useState } from 'react';
import { X } from 'lucide-react';
import OptionCard from './OptionCard';
import SkillPicker from './SkillPicker';
import { FEATURED_ROLE_IDS, ROLES, ROLE_MAP } from '../../data/roles';
import { roleIcon } from '../careers/roleIcons';

export const CUSTOM_ROLE_MIN_SKILLS = 3;

const RoleStep = ({ value, onChange }) => {
  const [showAll, setShowAll] = useState(() => Boolean(value.targetRoleId && !FEATURED_ROLE_IDS.includes(value.targetRoleId) && value.targetRoleId !== 'custom'));
  const featured = FEATURED_ROLE_IDS.map((id) => ROLE_MAP[id]);
  const others = ROLES.filter((r) => !FEATURED_ROLE_IDS.includes(r.id));
  const roles = showAll ? [...featured, ...others] : featured;
  const custom = value.customRole || { name: '', skills: [] };

  const setCustom = (patch) => onChange({ targetRoleId: 'custom', customRole: { ...custom, ...patch } });

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label="Target role">
        {roles.map((role) => (
          <OptionCard
            key={role.id}
            icon={roleIcon(role.id)}
            title={role.name}
            description={role.tagline}
            selected={value.targetRoleId === role.id}
            onSelect={() => onChange({ targetRoleId: role.id, customRole: null })}
          />
        ))}
        <OptionCard
          icon={roleIcon('custom')}
          title="Custom Role"
          description="Define your own target and the skills it needs."
          selected={value.targetRoleId === 'custom'}
          onSelect={() => onChange({ targetRoleId: 'custom', customRole: custom })}
        />
      </div>

      {!showAll && (
        <button type="button" onClick={() => setShowAll(true)} className="mt-4 text-sm font-medium text-muted hover:text-ink">
          Show {others.length} more roles — {others.map((r) => r.name).join(', ')}
        </button>
      )}

      {value.targetRoleId === 'custom' && (
        <div className="card mt-6 space-y-5 p-5 animate-fade-in">
          <div>
            <label htmlFor="custom-role" className="label">
              Role name
            </label>
            <input
              id="custom-role"
              className="input max-w-sm"
              placeholder="e.g. Game Developer"
              value={custom.name}
              maxLength={60}
              onChange={(e) => setCustom({ name: e.target.value })}
            />
          </div>
          <div>
            <p className="label">
              Skills this role requires <span className="font-normal text-muted">(at least {CUSTOM_ROLE_MIN_SKILLS}, most important first)</span>
            </p>
            {custom.skills.length > 0 && (
              <ol className="mb-4 flex flex-wrap gap-1.5">
                {custom.skills.map((skill, index) => (
                  <li key={skill.id} className="inline-flex h-7 items-center gap-1.5 rounded-md bg-ink pl-2 pr-1 text-[13px] text-white">
                    <span className="tabular text-[11px] text-slate-400">{index + 1}</span>
                    {skill.name}
                    <button
                      type="button"
                      onClick={() => setCustom({ skills: custom.skills.filter((s) => s.id !== skill.id) })}
                      className="rounded p-0.5 hover:bg-white/15"
                      aria-label={`Remove ${skill.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ol>
            )}
            <SkillPicker
              selectedIds={custom.skills.map((s) => s.id)}
              onAdd={(skill) => setCustom({ skills: [...custom.skills, { id: skill.id, name: skill.name }].slice(0, 20) })}
              placeholder="Add required skills"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleStep;

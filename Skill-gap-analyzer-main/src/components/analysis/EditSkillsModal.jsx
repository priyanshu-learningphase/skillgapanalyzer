import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Modal } from '../ui/Overlay';
import Button from '../ui/Button';
import SkillPicker from '../onboarding/SkillPicker';
import { levelLabel, SKILL_LEVELS } from '../../data/options';

/** Add, remove and fine-tune skill levels in one place. */
const EditSkillsModal = ({ open, onClose, skills, onSave, suggestions = [] }) => {
  const [draft, setDraft] = useState(skills);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setDraft(skills);
  }, [open, skills]);

  const save = async () => {
    setSaving(true);
    try {
      await onSave(draft);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const changed = JSON.stringify(draft) !== JSON.stringify(skills);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Update your skills"
      description="Changes recalculate your readiness and flag your roadmap for an update."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving} disabled={!changed}>
            Save changes
          </Button>
        </>
      }
    >
      <SkillPicker
        selectedIds={draft.map((s) => s.id)}
        onAdd={(skill) => setDraft((d) => [...d, { id: skill.id, name: skill.name, level: SKILL_LEVELS[1].value }])}
        suggestions={suggestions}
        suggestionLabel="Skills your target role uses"
      />
      <ul className="mt-6 divide-y divide-line rounded-lg border border-line">
        {draft.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted">No skills yet — add some above.</li>}
        {draft.map((skill) => (
          <li key={skill.id} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 px-4 py-3 sm:grid-cols-[10rem_1fr_6.5rem_auto]">
            <span className="truncate text-sm font-medium text-ink">{skill.name}</span>
            <button
              type="button"
              onClick={() => setDraft((d) => d.filter((s) => s.id !== skill.id))}
              className="justify-self-end rounded p-1 text-muted-light hover:bg-slate-100 hover:text-ink sm:order-last"
              aria-label={`Remove ${skill.name}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={skill.level}
              onChange={(e) => setDraft((d) => d.map((s) => (s.id === skill.id ? { ...s, level: Number(e.target.value) } : s)))}
              className="w-full accent-ink"
              aria-label={`${skill.name} level`}
            />
            <span className="tabular text-right text-xs text-muted">
              <span className="font-medium text-ink">{skill.level}%</span> · {levelLabel(skill.level)}
            </span>
          </li>
        ))}
      </ul>
    </Modal>
  );
};

export default EditSkillsModal;

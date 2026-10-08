import { useState } from 'react';
import { Modal } from '../ui/Overlay';
import Button from '../ui/Button';
import ResumeUpload from '../skills/ResumeUpload';
import DetectedSkills from './DetectedSkills';
import { parseResume } from '../../lib/resume';
import { useWorkspace } from '../../context/WorkspaceContext';

const REASON = { experience: 'in experience', project: 'in a project', listed: 'listed' };

/** Upload a resume during onboarding and pick which detected skills to add. */
const ResumeImportModal = ({ open, onClose, existingIds, onAdd }) => {
  const { actions } = useWorkspace();
  const [detected, setDetected] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [error, setError] = useState('');

  const reset = () => {
    setDetected(null);
    setSelected(new Set());
    setError('');
  };

  const handleText = async (text, fileName) => {
    const parsed = parseResume(text);
    if (!parsed.skills.length) {
      setError('We couldn’t find any recognisable skills in that resume. Add them manually instead.');
      return;
    }
    setError('');
    const skills = parsed.skills.map((s) => ({ id: s.id, name: s.name, level: s.suggestedLevel, reason: REASON[s.evidence] }));
    setDetected(skills);
    setSelected(new Set(skills.filter((s) => !existingIds.has(s.id)).map((s) => s.id)));
    // Keep the full analysis for the Resume Analyzer page.
    actions.saveInsight('resume', { parsed, fileName, analyzedAt: new Date().toISOString() });
  };

  const add = () => {
    onAdd(detected.filter((s) => selected.has(s.id)));
    reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Import skills from your resume"
      description="We detect skills and estimate a level from where they appear. You can adjust levels next."
      size="lg"
      footer={
        detected && (
          <>
            <Button variant="secondary" onClick={reset}>
              Use another file
            </Button>
            <Button onClick={add} disabled={!selected.size}>
              Add {selected.size} skill{selected.size === 1 ? '' : 's'}
            </Button>
          </>
        )
      }
    >
      {detected ? (
        <DetectedSkills
          skills={detected}
          selected={selected}
          existingIds={existingIds}
          onToggle={(id) =>
            setSelected((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            })
          }
        />
      ) : (
        <>
          <ResumeUpload onText={handleText} />
          {error && (
            <p className="mt-3 text-sm text-danger-700" role="alert">
              {error}
            </p>
          )}
        </>
      )}
    </Modal>
  );
};

export default ResumeImportModal;

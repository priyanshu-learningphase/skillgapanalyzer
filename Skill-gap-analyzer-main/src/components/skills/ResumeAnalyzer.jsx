import { useMemo, useState } from 'react';
import ResumeUpload from './ResumeUpload';
import ResumeReport from './ResumeReport';
import Card from '../ui/Card';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { parseResume, compareResumeToRole } from '../../lib/resume';

/**
 * Upload → parse → compare with the target role. The parsed summary (not the
 * raw text) is saved so the report survives reloads and re-scores when the
 * target role changes.
 */
const ResumeAnalyzer = () => {
  const { role, career, insights, actions } = useWorkspace();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const saved = replacing ? null : insights.resume;

  const report = useMemo(() => (saved && role ? compareResumeToRole(saved.parsed, role) : null), [saved, role]);
  const owned = new Set((career?.skills || []).map((s) => s.id));
  const newSkills = saved ? saved.parsed.skills.filter((s) => !owned.has(s.id)) : [];

  const analyze = async (text, fileName) => {
    setBusy(true);
    try {
      const parsed = parseResume(text);
      if (!parsed.skills.length && parsed.sectionsFound.length === 0) {
        toast.error('That doesn’t look like a resume', { description: 'We couldn’t find any sections or skills. Try another file or paste the text.' });
        return;
      }
      await actions.saveInsight('resume', { parsed, fileName, analyzedAt: new Date().toISOString() });
      setReplacing(false);
    } finally {
      setBusy(false);
    }
  };

  const importSkills = async () => {
    setImporting(true);
    try {
      const result = await actions.importSkills(
        newSkills.map((s) => ({ id: s.id, name: s.name, level: s.suggestedLevel })),
        { label: 'your resume' },
      );
      if (result.added) {
        toast.success(`Added ${result.added} skill${result.added === 1 ? '' : 's'}`, {
          description: result.analysis ? `Readiness is now ${result.analysis.readiness}/100. Levels are estimates — refine them with assessments.` : undefined,
        });
      }
    } finally {
      setImporting(false);
    }
  };

  if (saved && report) {
    return <ResumeReport saved={saved} report={report} role={role} newSkills={newSkills} onImport={importSkills} importing={importing} onReset={() => setReplacing(true)} />;
  }

  return (
    <Card className="p-6">
      <h2 className="text-[15px] font-semibold text-ink">Analyse your resume</h2>
      <p className="mt-1 max-w-xl text-sm text-muted">
        We’ll extract your skills, projects, education, experience and certifications, then compare them with {role ? `${role.name} requirements` : 'your target role'} and show what to fix.
      </p>
      <div className="mt-5">
        <ResumeUpload onText={analyze} busy={busy} />
      </div>
    </Card>
  );
};

export default ResumeAnalyzer;

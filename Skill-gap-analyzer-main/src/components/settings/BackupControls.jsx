import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import Button from '../ui/Button';
import { ConfirmDialog } from '../ui/Overlay';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';

const MAX_BACKUP_BYTES = 5 * 1024 * 1024;

/**
 * Download everything as a JSON backup, or restore one. Restoring is also how
 * browser-only data moves into an account once Firebase is set up.
 */
const BackupControls = () => {
  const { actions } = useWorkspace();
  const toast = useToast();
  const inputRef = useRef(null);
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);

  const exportBackup = () => {
    const backup = actions.exportWorkspace();
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
    const link = Object.assign(document.createElement('a'), { href: url, download: `skillgap-backup-${backup.exportedAt.slice(0, 10)}.json` });
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const pick = async (file) => {
    if (!file) return;
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error('That file is over 5 MB, which is too large for a SkillGap backup.');
      const backup = JSON.parse(await file.text());
      if (backup?.app !== 'skillgap') throw new Error('This file isn’t a SkillGap backup.');
      setPending({ backup, name: file.name });
    } catch (err) {
      toast.error('Couldn’t read the backup', { description: err instanceof SyntaxError ? 'The file isn’t valid JSON.' : err.message });
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const restore = async () => {
    setBusy(true);
    try {
      const result = await actions.importWorkspace(pending.backup);
      toast.success('Backup restored', { description: `${result.applications} application${result.applications === 1 ? '' : 's'} and ${result.analyses} analysis snapshot${result.analyses === 1 ? '' : 's'} imported.` });
      setPending(null);
    } catch (err) {
      toast.error('Couldn’t restore the backup', { description: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" icon={Download} onClick={exportBackup}>
        Export backup
      </Button>
      <Button variant="secondary" icon={Upload} onClick={() => inputRef.current?.click()}>
        Import backup
      </Button>
      <input ref={inputRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => pick(e.target.files?.[0])} aria-label="Choose a backup file" />
      <ConfirmDialog
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        onConfirm={restore}
        loading={busy}
        tone="danger"
        title="Replace your data with this backup?"
        description={pending ? `Your current profile, roadmap, progress, applications, calendar and saved results will be replaced by “${pending.name}” (exported ${new Date(pending.backup.exportedAt).toLocaleDateString()}). Export a backup first if you might need the current data.` : ''}
        confirmLabel="Replace with backup"
      />
    </div>
  );
};

export default BackupControls;

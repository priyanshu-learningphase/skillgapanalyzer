import { ShieldCheck, ClipboardCheck, FolderGit2, User } from 'lucide-react';
import Badge from '../ui/Badge';
import { EVIDENCE_LEVELS } from '../../lib/evidence';

const ICONS = { practical: ShieldCheck, quiz: ClipboardCheck, project: FolderGit2, self: User, none: User };

/** How a skill level is backed: practical, quiz, project or self-reported. */
const EvidenceBadge = ({ level = 'none', short = false, className }) => {
  const meta = EVIDENCE_LEVELS[level] || EVIDENCE_LEVELS.none;
  return (
    <Badge tone={meta.tone} icon={ICONS[level]} className={className}>
      {short ? meta.short : meta.label}
    </Badge>
  );
};

export default EvidenceBadge;

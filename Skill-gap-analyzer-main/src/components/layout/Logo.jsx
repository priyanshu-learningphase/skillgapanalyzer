import { Link } from 'react-router-dom';
import { cx } from '../../lib/cx';

/** Mark: two filled bars and an outlined one — the gap you're closing. */
export const LogoMark = ({ className }) => (
  <span className={cx('inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink', className)} aria-hidden>
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="8" width="3" height="6" rx="1" fill="white" />
      <rect x="6.5" y="5" width="3" height="9" rx="1" fill="white" />
      <rect x="11.25" y="2.25" width="2.5" height="11.5" rx="1" stroke="#A5B4FC" strokeWidth="1.5" strokeDasharray="2 1.5" />
    </svg>
  </span>
);

const Logo = ({ to = '/', className }) => (
  <Link to={to} className={cx('inline-flex items-center gap-2 rounded-md', className)} aria-label="SkillGap home">
    <LogoMark />
    <span className="text-[15px] font-semibold tracking-tight text-ink">SkillGap</span>
  </Link>
);

export default Logo;

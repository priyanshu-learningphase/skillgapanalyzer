import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Settings, HardDrive } from 'lucide-react';
import Popover from '../ui/Popover';
import { useAuth } from '../../context/AuthContext';

export const initialsFor = (name, email) => {
  const source = (name || email || '').trim();
  if (!source) return 'You';
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
};

const ProfileMenu = () => {
  const { userProfile, currentUser, logout, isLocalMode } = useAuth();
  const navigate = useNavigate();
  const name = userProfile?.name || (isLocalMode ? 'Local profile' : currentUser?.email);

  return (
    <Popover
      panelClassName="w-60"
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-label="Account menu"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-ink ring-offset-2 hover:ring-2 hover:ring-line"
        >
          {initialsFor(userProfile?.name, currentUser?.email)}
        </button>
      )}
    >
      {(close) => (
        <div className="py-1.5">
          <div className="border-b border-line px-3.5 pb-2.5 pt-1.5">
            <p className="truncate text-sm font-medium text-ink">{name}</p>
            <p className="truncate text-xs text-muted">
              {isLocalMode ? (
                <span className="inline-flex items-center gap-1">
                  <HardDrive className="h-3 w-3" aria-hidden /> Stored in this browser
                </span>
              ) : (
                currentUser?.email
              )}
            </p>
          </div>
          <Link to="/settings" onClick={close} className="flex items-center gap-2 px-3.5 py-2 text-sm text-ink hover:bg-slate-50">
            <Settings className="h-4 w-4 text-muted" aria-hidden /> Settings
          </Link>
          {!isLocalMode && (
            <button
              type="button"
              onClick={async () => {
                close();
                await logout();
                navigate('/');
              }}
              className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-sm text-ink hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4 text-muted" aria-hidden /> Sign out
            </button>
          )}
        </div>
      )}
    </Popover>
  );
};

export default ProfileMenu;

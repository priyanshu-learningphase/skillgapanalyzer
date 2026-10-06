import { Check, HardDrive } from 'lucide-react';
import Logo from '../layout/Logo';
import Button from '../ui/Button';

const POINTS = [
  'A readiness score for your target role',
  'Priority-ranked skill gaps',
  'A dependency-aware roadmap sized to your schedule',
  'Progress tracking that adapts the plan',
];

/** Two-column auth layout: form on the left, a quiet product summary on the right. */
const AuthLayout = ({ title, subtitle, children }) => (
  <div className="flex min-h-screen bg-white">
    <div className="flex w-full flex-col px-4 py-6 sm:px-8 lg:w-1/2">
      <Logo />
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
        <div className="mt-8">{children}</div>
      </div>
    </div>
    <div className="hidden border-l border-line bg-canvas lg:flex lg:w-1/2 lg:items-center lg:justify-center">
      <div className="max-w-sm px-8">
        <p className="eyebrow">What you get</p>
        <ul className="mt-4 space-y-3">
          {POINTS.map((point) => (
            <li key={point} className="flex items-start gap-3 text-sm text-ink">
              <span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-ink">
                <Check className="h-2.5 w-2.5 text-white" aria-hidden />
              </span>
              {point}
            </li>
          ))}
        </ul>
      </div>
    </div>
  </div>
);

/** Shown on auth pages when Firebase isn't configured. */
export const LocalModeNotice = ({ next = '/dashboard' }) => (
  <div className="card p-5">
    <div className="flex items-start gap-3">
      <HardDrive className="mt-0.5 h-4 w-4 text-muted" aria-hidden />
      <div className="text-sm">
        <p className="font-medium text-ink">Accounts aren’t enabled on this deployment</p>
        <p className="mt-1 text-muted">
          You can use every feature without signing in — your profile, roadmap and progress are saved in this browser. Add Firebase
          credentials to enable accounts and cross-device sync.
        </p>
      </div>
    </div>
    <Button to={next} className="mt-5 w-full">
      Continue without an account
    </Button>
  </div>
);

export default AuthLayout;

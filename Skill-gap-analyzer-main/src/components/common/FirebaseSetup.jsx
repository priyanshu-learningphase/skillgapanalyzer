import { Database } from 'lucide-react';
import { LogoMark } from '../layout/Logo';
import { firebaseInitError, missingFirebaseEnv } from '../../config/firebase';

/**
 * Shown instead of the app when Firebase isn't configured. All user data
 * lives in Firestore, so there is nothing useful to run without it.
 */
const FirebaseSetup = () => (
  <div className="flex min-h-screen items-center justify-center bg-canvas p-4 sm:p-6">
    <div className="w-full max-w-lg rounded-card border border-line bg-white p-6 shadow-card sm:p-8" role="alert">
      <div className="flex items-center gap-3">
        <LogoMark />
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-warning-50">
          <Database className="h-4 w-4 text-warning-600" aria-hidden />
        </div>
      </div>
      <h1 className="mt-5 text-lg font-semibold text-ink">Connect Firebase to continue</h1>
      <p className="mt-1 text-sm text-muted">
        {firebaseInitError
          ? `Firebase couldn’t start: ${firebaseInitError.message}`
          : 'SkillGap stores accounts and all user data in Firebase. This build is missing its Firebase configuration.'}
      </p>

      {missingFirebaseEnv.length > 0 && (
        <div className="mt-5">
          <p className="text-sm font-medium text-ink">Missing environment variables</p>
          <ul className="mt-2 space-y-1">
            {missingFirebaseEnv.map((name) => (
              <li key={name} className="rounded-md bg-slate-50 px-2.5 py-1.5 font-mono text-xs text-ink">
                {name}
              </li>
            ))}
          </ul>
        </div>
      )}

      <ol className="mt-5 list-decimal space-y-1.5 pl-5 text-sm text-muted">
        <li>Copy <code className="font-mono text-xs text-ink">.env.example</code> to <code className="font-mono text-xs text-ink">.env</code>.</li>
        <li>Paste your web app config from Firebase console → Project settings → Your apps.</li>
        <li>Restart the dev server, or rebuild before deploying.</li>
      </ol>
    </div>
  </div>
);

export default FirebaseSetup;

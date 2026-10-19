import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';

export { safeNext } from '../lib/redirect';

/**
 * Where "Analyze my skills" should take someone: straight to onboarding (or
 * their analysis if they've done it), via sign-up when an account is needed.
 */
export const useStartPath = (roleId) => {
  const { currentUser } = useAuth();
  const { isOnboarded } = useWorkspace();
  const target = roleId ? `/onboarding?role=${roleId}` : isOnboarded ? '/gap' : '/onboarding';
  if (!currentUser) return `/signup?next=${encodeURIComponent(target)}`;
  return target;
};

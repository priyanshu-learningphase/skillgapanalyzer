import { Compass } from 'lucide-react';
import Logo from '../components/layout/Logo';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';

const NotFound = () => {
  const { currentUser } = useAuth();
  return (
    <div className="flex min-h-screen flex-col bg-canvas px-4 py-6 sm:px-8">
      <Logo />
      <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-white shadow-card">
          <Compass className="h-5 w-5 text-muted" aria-hidden />
        </span>
        <p className="mt-6 text-sm font-medium text-muted">404</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">This page doesn’t exist</h1>
        <p className="mt-2 text-sm text-muted">The link may be broken or the page may have moved.</p>
        <div className="mt-6 flex gap-2">
          <Button to={currentUser ? '/dashboard' : '/'}>{currentUser ? 'Go to dashboard' : 'Go home'}</Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

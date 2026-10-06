import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Menu, Search, X, CloudOff, Loader2 } from 'lucide-react';
import Sidebar from './Sidebar';
import SearchPalette from './SearchPalette';
import NotificationsMenu from './NotificationsMenu';
import ProfileMenu from './ProfileMenu';
import { LogoMark } from './Logo';
import { useWorkspace } from '../../context/WorkspaceContext';
import { ErrorState } from '../ui/States';
import { Skeleton } from '../ui/Spinner';
import ErrorBoundary from '../common/ErrorBoundary';

const SyncIndicator = () => {
  const { syncStatus } = useWorkspace();
  if (syncStatus === 'saving') {
    return (
      <span className="hidden items-center gap-1.5 text-xs text-muted-light sm:inline-flex" aria-live="polite">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> Saving
      </span>
    );
  }
  if (syncStatus === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-danger-700" role="status">
        <CloudOff className="h-3.5 w-3.5" aria-hidden /> Not saved
      </span>
    );
  }
  return null;
};

const PageSkeleton = () => (
  <div className="space-y-6" aria-busy="true" aria-label="Loading">
    <div className="space-y-2">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-64" />
    </div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>
    <Skeleton className="h-64" />
  </div>
);

const AppShell = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const { status, error, reload } = useWorkspace();

  useEffect(() => setDrawerOpen(false), [location.pathname]);

  useEffect(() => {
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (event) => event.key === 'Escape' && setDrawerOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  return (
    <div className="min-h-screen bg-canvas">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[80] focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow-pop">
        Skip to content
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-line bg-white lg:block">
        <Sidebar />
      </aside>

      {drawerOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-slate-900/30 animate-fade-in" onClick={() => setDrawerOpen(false)} aria-hidden />
            <aside className="relative h-full w-72 max-w-[85vw] border-r border-line bg-white shadow-pop animate-slide-in-left" aria-label="Navigation">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="absolute right-3 top-3.5 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-slate-100"
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" />
              </button>
              <Sidebar onNavigate={() => setDrawerOpen(false)} />
            </aside>
          </div>,
          document.body,
        )}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-line bg-white/90 px-3 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-slate-100 hover:text-ink lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </button>
          <LogoMark className="lg:hidden" />

          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="ml-1 flex h-8 w-full max-w-xs items-center gap-2 rounded-lg border border-line bg-slate-50 px-2.5 text-left text-[13px] text-muted-light transition-colors hover:border-slate-300 hover:bg-white sm:ml-0"
            aria-label="Search"
          >
            <Search className="h-3.5 w-3.5" aria-hidden />
            <span className="flex-1 truncate">Search…</span>
            <kbd className="hidden rounded border border-line bg-white px-1.5 text-[10px] font-medium text-muted sm:inline">Ctrl K</kbd>
          </button>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
            <SyncIndicator />
            <NotificationsMenu />
            <ProfileMenu />
          </div>
        </header>

        <main id="main" className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {status === 'loading' && <PageSkeleton />}
          {status === 'error' && (
            <div className="card">
              <ErrorState title="We couldn’t load your workspace" description={error} onRetry={reload} />
            </div>
          )}
          {status === 'ready' && (
            <ErrorBoundary resetKey={location.pathname}>
              <div key={location.pathname.split('/')[1]} className="animate-fade-in">
                <Outlet />
              </div>
            </ErrorBoundary>
          )}
        </main>
      </div>

      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
};

export default AppShell;

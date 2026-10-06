import { Component } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

/**
 * Catches render errors so a bug in one page never leaves a blank screen.
 * `resetKey` (e.g. the current path) clears the error on navigation.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled UI error', error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className={this.props.fullPage ? 'flex min-h-screen items-center justify-center bg-canvas p-6' : 'py-10'} role="alert">
        <div className="mx-auto max-w-md rounded-card border border-line bg-white p-8 text-center shadow-card">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-danger-50">
            <AlertTriangle className="h-5 w-5 text-danger-600" aria-hidden />
          </div>
          <h2 className="mt-4 text-[15px] font-semibold text-ink">Something went wrong on this page</h2>
          <p className="mt-1 text-sm text-muted">Your data is safe. Reload to try again — if it keeps happening, go back to the dashboard.</p>
          <div className="mt-5 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-ink px-3.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              <RotateCw className="h-3.5 w-3.5" aria-hidden /> Reload
            </button>
            <a href="/dashboard" className="inline-flex h-9 items-center rounded-lg border border-line px-3.5 text-sm font-medium text-ink hover:bg-slate-50">
              Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;

import { useState } from 'react';
import { Github } from 'lucide-react';
import Button from '../ui/Button';
import { useWorkspace } from '../../context/WorkspaceContext';
import { fetchGithubData, normalizeUsername } from '../../services/githubService';
import { analyzeGithub } from '../../lib/github';

/** Username input that fetches public GitHub data and scores it against a role. */
const GithubForm = ({ initial = '', onResult, compact = false, role: roleOverride }) => {
  const [username, setUsername] = useState(initial);
  const [state, setState] = useState({ loading: false, error: null });
  const { role: workspaceRole } = useWorkspace();
  const role = roleOverride || workspaceRole;

  const run = async (event) => {
    event?.preventDefault();
    if (!normalizeUsername(username)) return;
    setState({ loading: true, error: null });
    try {
      const data = await fetchGithubData(username);
      const result = analyzeGithub(data, role);
      setState({ loading: false, error: null });
      await onResult({ ...result, analyzedAt: new Date().toISOString(), roleId: role?.id || null });
    } catch (error) {
      setState({ loading: false, error });
    }
  };

  return (
    <div>
      <form onSubmit={run} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="gh-user" className="sr-only">
          GitHub username
        </label>
        <div className="relative flex-1">
          <Github className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-light" aria-hidden />
          <input
            id="gh-user"
            className="input h-10 pl-9"
            placeholder="GitHub username or profile URL"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="off"
            spellCheck="false"
          />
        </div>
        <Button type="submit" size="lg" loading={state.loading} disabled={!username.trim()}>
          Analyze
        </Button>
      </form>
      {!compact && <p className="mt-2 text-xs text-muted">Reads public data only, via GitHub’s public API. No sign-in needed.</p>}
      {state.error && (
        <p className="mt-3 rounded-lg border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700" role="alert">
          {state.error.message}
        </p>
      )}
    </div>
  );
};

export default GithubForm;

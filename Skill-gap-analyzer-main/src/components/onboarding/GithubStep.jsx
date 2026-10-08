import { useState } from 'react';
import { Github, CheckCircle2 } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import DetectedSkills from './DetectedSkills';
import GithubForm from '../skills/GithubForm';
import { useWorkspace } from '../../context/WorkspaceContext';

/** Optional onboarding step: pull evidence from a public GitHub profile. */
const GithubStep = ({ skills, onAddSkills, role }) => {
  const { insights, actions } = useWorkspace();
  const result = insights.github;
  const existing = new Set(skills.map((s) => s.id));
  const detected = (result?.detectedSkills || []).slice(0, 15).map((s) => ({ id: s.id, name: s.name, level: Math.min(60, 35 + s.weight * 3), reason: 'in your repos' }));
  const [selected, setSelected] = useState(() => new Set(detected.filter((s) => !existing.has(s.id)).map((s) => s.id)));
  const [added, setAdded] = useState(false);

  const onResult = async (next) => {
    await actions.saveInsight('github', next);
    const fresh = next.detectedSkills.slice(0, 15).filter((s) => !existing.has(s.id)).map((s) => s.id);
    setSelected(new Set(fresh));
    setAdded(false);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <Github className="h-5 w-5 text-ink" aria-hidden />
          <p className="text-sm font-semibold text-ink">{result ? `@${result.username}` : 'Your GitHub profile'}</p>
          {result && <span className="ml-auto text-sm text-muted">Profile score {result.score}/100</span>}
        </div>
        <p className="mb-4 mt-1 text-sm text-muted">We read public repositories, languages and READMEs to find skills your projects already prove. You can skip this.</p>
        <GithubForm initial={result?.username || ''} onResult={onResult} compact role={role} />
      </Card>

      <Card className="p-5">
        <p className="text-sm font-semibold text-ink">Skills found</p>
        {!result ? (
          <p className="mt-2 text-sm text-muted">Analyse a profile to see detected skills here.</p>
        ) : detected.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No recognisable technologies in public repositories.</p>
        ) : added ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-success-700">
            <CheckCircle2 className="h-4 w-4" aria-hidden /> Added to your skills
          </p>
        ) : (
          <>
            <div className="mt-3">
              <DetectedSkills
                skills={detected}
                selected={selected}
                existingIds={existing}
                onToggle={(id) =>
                  setSelected((prev) => {
                    const next = new Set(prev);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  })
                }
              />
            </div>
            <Button
              className="mt-4"
              disabled={!selected.size}
              onClick={() => {
                onAddSkills(detected.filter((s) => selected.has(s.id)));
                setAdded(true);
              }}
            >
              Add {selected.size} skill{selected.size === 1 ? '' : 's'}
            </Button>
          </>
        )}
      </Card>
    </div>
  );
};

export default GithubStep;

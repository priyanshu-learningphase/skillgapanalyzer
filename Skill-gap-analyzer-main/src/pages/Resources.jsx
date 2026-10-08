/**
 * Resources — curated learning material organised by skill.
 */

import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, ExternalLink, Map } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import ResourceList from '../components/roadmap/ResourceList';
import { useWorkspace } from '../context/WorkspaceContext';
import { SKILLS, getSkill } from '../data/skills';
import { cx } from '../lib/cx';

const Resources = () => {
  const { roadmap, analysis } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');

  // Your roadmap's skills first (in order), then remaining gaps, then the catalog.
  const groups = useMemo(() => {
    const seen = new Set();
    const pick = (ids) =>
      ids
        .filter((id) => id && !seen.has(id) && seen.add(id))
        .map((id) => getSkill(id))
        .filter(Boolean);
    const roadmapSkills = pick((roadmap?.phases || []).flatMap((p) => p.skills.map((s) => s.id)));
    const gapSkills = pick((analysis?.gaps || []).map((g) => g.skillId));
    const catalog = pick(SKILLS.map((s) => s.id));
    return [
      { title: 'In your roadmap', items: roadmapSkills },
      { title: 'Other gaps', items: gapSkills },
      { title: 'All skills', items: catalog },
    ].filter((g) => g.items.length);
  }, [roadmap, analysis]);

  const q = query.trim().toLowerCase();
  const filtered = groups
    .map((g) => ({ ...g, items: g.items.filter((s) => !q || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)) }))
    .filter((g) => g.items.length);

  const selectedId = params.get('skill') || groups[0]?.items[0]?.id;
  const skill = getSkill(selectedId);
  const phase = roadmap?.phases.find((p) => p.skills.some((s) => s.id === selectedId));
  const resources = phase?.skills.length === 1 ? phase.resources : skill?.resources || [];

  return (
    <div>
      <PageHeader title="Learning resources" description="A short, curated list per skill — learn it, practise it, build something with it." />

      <div className="grid gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <Card className="overflow-hidden lg:sticky lg:top-20 lg:max-h-[calc(100vh-7rem)] lg:self-start">
          <div className="border-b border-line p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-light" aria-hidden />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter skills" className="input h-8 pl-8 text-[13px]" aria-label="Filter skills" />
            </div>
          </div>
          <nav className="max-h-72 overflow-y-auto p-2 lg:max-h-[calc(100vh-12rem)]" aria-label="Skills">
            {filtered.map((group) => (
              <div key={group.title} className="mb-2">
                <p className="px-2 pb-1 pt-2 text-[11px] font-medium text-muted-light">{group.title}</p>
                {group.items.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setParams({ skill: s.id })}
                    aria-current={s.id === selectedId ? 'true' : undefined}
                    className={cx(
                      'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[13px]',
                      s.id === selectedId ? 'bg-slate-100 font-medium text-ink' : 'text-muted hover:bg-slate-50 hover:text-ink',
                    )}
                  >
                    <span className="truncate">{s.name}</span>
                  </button>
                ))}
              </div>
            ))}
            {filtered.length === 0 && <p className="px-2 py-4 text-sm text-muted">No skills match.</p>}
          </nav>
        </Card>

        {skill ? (
          <Card className="p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs text-muted">{skill.category}</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight">{skill.name}</h2>
                <p className="mt-1 max-w-xl text-sm text-muted">{skill.why}</p>
              </div>
              {phase && <Badge tone="accent">In your roadmap · Week {phase.weekStart}</Badge>}
            </div>

            <div className="mt-6 grid gap-8 border-t border-line pt-6 md:grid-cols-[minmax(0,1fr)_14rem]">
              <ResourceList resources={resources} practice={skill.practice} project={{ title: skill.project }} />
              <div className="space-y-5">
                <div>
                  <p className="mb-2 text-xs font-medium text-muted">Topics</p>
                  <ol className="space-y-1.5 text-sm text-ink">
                    {skill.topics.map((t, i) => (
                      <li key={t} className="flex gap-2">
                        <span className="tabular w-4 shrink-0 text-xs text-muted-light">{i + 1}</span>
                        {t}
                      </li>
                    ))}
                  </ol>
                </div>
                {skill.roadmapSh && (
                  <a
                    href={`https://roadmap.sh/${skill.roadmapSh}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-ink hover:underline"
                  >
                    <Map className="h-3.5 w-3.5" aria-hidden /> Full map on roadmap.sh <ExternalLink className="h-3 w-3 text-muted" aria-hidden />
                  </a>
                )}
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-6 text-sm text-muted">Select a skill to see resources.</Card>
        )}
      </div>
    </div>
  );
};

export default Resources;

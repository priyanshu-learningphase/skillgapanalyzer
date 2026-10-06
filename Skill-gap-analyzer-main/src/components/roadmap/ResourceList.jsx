import { FileText, PlayCircle, GraduationCap, BookOpen, Dumbbell, Hammer, ExternalLink, Search } from 'lucide-react';

export const RESOURCE_META = {
  docs: { label: 'Documentation', icon: FileText, group: 'learn' },
  video: { label: 'Video', icon: PlayCircle, group: 'learn' },
  course: { label: 'Course', icon: GraduationCap, group: 'learn' },
  article: { label: 'Article', icon: BookOpen, group: 'learn' },
  practice: { label: 'Practice', icon: Dumbbell, group: 'practice' },
  project: { label: 'Project', icon: Hammer, group: 'build' },
};

const ResourceLink = ({ resource }) => {
  const meta = RESOURCE_META[resource.type] || RESOURCE_META.article;
  const Icon = resource.suggested ? Search : meta.icon;
  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noreferrer"
      className="group flex items-center gap-3 rounded-lg border border-line px-3 py-2.5 transition-colors hover:border-slate-300 hover:bg-slate-50"
    >
      <Icon className="h-4 w-4 shrink-0 text-muted" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink">{resource.title}</span>
        <span className="block text-xs text-muted">{resource.suggested ? `Suggested ${meta.label.toLowerCase()} · search` : meta.label}</span>
      </span>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-light group-hover:text-ink" aria-hidden />
    </a>
  );
};

/** Resources grouped as Learn / Practice / Build, kept short on purpose. */
const ResourceList = ({ resources = [], practice, project }) => {
  const learn = resources.filter((r) => (RESOURCE_META[r.type]?.group || 'learn') === 'learn');
  const practiceLinks = resources.filter((r) => RESOURCE_META[r.type]?.group === 'practice');
  const buildLinks = resources.filter((r) => RESOURCE_META[r.type]?.group === 'build');

  return (
    <div className="space-y-5">
      {learn.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted">Learn</p>
          <div className="space-y-2">
            {learn.map((r) => (
              <ResourceLink key={r.url} resource={r} />
            ))}
          </div>
        </div>
      )}
      {(practice || practiceLinks.length > 0) && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted">Practice</p>
          {practice && <p className="mb-2 text-sm text-ink">{practice}</p>}
          <div className="space-y-2">
            {practiceLinks.map((r) => (
              <ResourceLink key={r.url} resource={r} />
            ))}
          </div>
        </div>
      )}
      {(project?.title || buildLinks.length > 0) && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted">Build</p>
          {project?.title && (
            <div className="rounded-lg bg-slate-50 px-3 py-2.5">
              <p className="text-sm font-medium text-ink">{project.title}</p>
              {project.description && <p className="mt-0.5 text-sm text-muted">{project.description}</p>}
            </div>
          )}
          <div className="mt-2 space-y-2">
            {buildLinks.map((r) => (
              <ResourceLink key={r.url} resource={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourceList;

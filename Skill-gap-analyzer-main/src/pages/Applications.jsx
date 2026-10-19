/**
 * Job application tracker — board and list views, upcoming deadlines and
 * interviews, and application stats.
 */

import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Search, LayoutGrid, List, KanbanSquare, Briefcase, Send, MessagesSquare, Trophy, Activity, Import } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Stat from '../components/ui/Stat';
import Segmented from '../components/ui/Segmented';
import { EmptyState } from '../components/ui/States';
import ApplicationForm from '../components/applications/ApplicationForm';
import BoardView from '../components/applications/BoardView';
import ListView from '../components/applications/ListView';
import { UpcomingList } from '../components/applications/parts';
import { useApplications } from '../hooks/useApplications';
import { useWorkspace } from '../context/WorkspaceContext';
import { useToast } from '../context/ToastContext';
import { APPLICATION_STATUSES, filterApplications } from '../lib/applications';

const VIEW_KEY = 'skillgap.applications.view';
const readView = () => {
  try {
    return window.localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'board';
  } catch {
    return 'board';
  }
};

const Applications = () => {
  const { insights } = useWorkspace();
  const tracker = useApplications();
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [view, setView] = useState(readView);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('updated');
  const [form, setForm] = useState({ open: false, initial: null });

  // Opened from the Jobs page with a job to track.
  useEffect(() => {
    if (location.state?.draft) {
      setForm({ open: true, initial: location.state.draft });
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, location.pathname, navigate]);

  const changeView = (next) => {
    setView(next);
    try {
      window.localStorage.setItem(VIEW_KEY, next);
    } catch {
      /* per-device preference only */
    }
  };

  const visible = useMemo(
    () => filterApplications(tracker.applications, { search, status: view === 'board' ? 'all' : status, sort, matches: tracker.matchPct }),
    [tracker.applications, tracker.matchPct, search, status, sort, view],
  );

  const tracked = new Set(tracker.applications.map((a) => a.jobId).filter(Boolean));
  const untrackedJobs = (insights.jobs || []).filter((j) => !tracked.has(j.id));

  const add = async (values) => {
    const app = await tracker.add(values);
    toast.success(`Tracking ${app.company}`, { description: app.parsed?.required.length ? 'Open it to see your match and missing skills.' : undefined });
  };

  const move = (id, next) => tracker.move(id, next);
  const s = tracker.stats;

  return (
    <div>
      <PageHeader
        title="Applications"
        description="Track every application from saved to offer, with deadlines, interviews and how well you match."
        actions={
          <Button icon={Plus} onClick={() => setForm({ open: true, initial: null })}>
            Add application
          </Button>
        }
      />

      {!tracker.applications.length ? (
        <Card>
          <EmptyState
            icon={KanbanSquare}
            title="No applications yet"
            description="Add a job you’re interested in or have applied to. Paste its description to see your match and the skills to close."
            action={
              <Button icon={Plus} onClick={() => setForm({ open: true, initial: null })}>
                Add your first application
              </Button>
            }
            secondaryAction={
              untrackedJobs.length ? (
                <Button variant="secondary" icon={Import} onClick={() => setForm({ open: true, initial: { role: untrackedJobs[0].parsed.title, parsed: untrackedJobs[0].parsed, jobId: untrackedJobs[0].id } })}>
                  Track “{untrackedJobs[0].parsed.title}”
                </Button>
              ) : null
            }
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Stat label="Active" icon={Briefcase} value={s.active} hint={`${s.total} tracked`} />
              <Stat label="Submitted" icon={Send} value={s.submitted} hint={s.byStatus.saved ? `${s.byStatus.saved} saved to apply` : 'All submitted'} />
              <Stat label="Response rate" icon={Activity} value={s.responseRate ?? '—'} unit={s.responseRate != null ? '%' : undefined} hint="Reached a test, interview or offer" />
              <Stat label="Offers" icon={Trophy} value={s.offers} hint={s.interviewRate != null ? `${s.interviewRate}% reached interviews` : 'No submissions yet'} />
            </div>
            <Card>
              <CardHeader title="Coming up" icon={MessagesSquare} description="Deadlines, interviews and next actions" />
              <CardBody className="pt-2">
                <UpcomingList items={tracker.upcoming} limit={5} />
              </CardBody>
            </Card>
          </div>

          <div className="mt-6 flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="relative lg:w-72">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-light" aria-hidden />
              <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company, role, notes…" aria-label="Search applications" className="input pl-8" />
            </div>
            {view === 'list' && (
              <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status" className="input lg:w-44">
                <option value="all">All statuses</option>
                <option value="active">Active only</option>
                {APPLICATION_STATUSES.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.label}
                  </option>
                ))}
              </select>
            )}
            <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort applications" className="input lg:w-48">
              <option value="updated">Recently updated</option>
              <option value="deadline">Deadline (soonest)</option>
              <option value="applied">Applied (newest)</option>
              <option value="company">Company (A–Z)</option>
              <option value="match">Best match</option>
              {view === 'list' && <option value="status">Status</option>}
            </select>
            <Segmented
              label="View"
              value={view}
              onChange={changeView}
              className="lg:ml-auto"
              options={[
                { value: 'board', label: 'Board', icon: LayoutGrid },
                { value: 'list', label: 'List', icon: List },
              ]}
            />
          </div>

          <div className="mt-4">
            {visible.length ? (
              view === 'board' ? (
                <BoardView applications={visible} matchPct={tracker.matchPct} onMove={move} />
              ) : (
                <ListView applications={visible} matchPct={tracker.matchPct} />
              )
            ) : (
              <Card>
                <EmptyState compact icon={Search} title="No applications match" description="Try a different search or filter." />
              </Card>
            )}
          </div>

          {untrackedJobs.length > 0 && (
            <Card className="mt-4">
              <CardHeader title="Analysed jobs you haven’t tracked" description="From the job description analyzer." />
              <CardBody>
                <ul className="divide-y divide-line">
                  {untrackedJobs.slice(0, 5).map((job) => (
                    <li key={job.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="min-w-0 truncate text-ink">{job.parsed.title}</span>
                      <Button size="sm" variant="secondary" icon={Plus} onClick={() => setForm({ open: true, initial: { role: job.parsed.title, parsed: job.parsed, jobId: job.id } })}>
                        Track
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}
        </>
      )}

      <ApplicationForm open={form.open} initial={form.initial} onClose={() => setForm({ open: false, initial: null })} onSubmit={add} mode="add" />
    </div>
  );
};

export default Applications;

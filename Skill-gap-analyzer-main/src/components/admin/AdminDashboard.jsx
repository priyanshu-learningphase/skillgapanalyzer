/**
 * Admin Dashboard — campus-wide readiness analytics for placement cells.
 * Built from student profiles and analysis snapshots (see lib/campus.js).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, Download, Users, TrendingUp, BadgeCheck, Activity, AlertTriangle, BarChart3, Search, ArrowUp, ArrowDown } from 'lucide-react';
import { getCampusData } from '../../services/firestoreService';
import { buildCampusAnalytics, filterStudents, studentsToCsv, ATTENTION_REASONS, INACTIVE_DAYS } from '../../lib/campus';
import { relativeTime } from '../../lib/progress';
import { BAND_STYLE } from '../analysis/ReadinessCard';
import PageHeader from '../ui/PageHeader';
import Card, { CardHeader, CardBody } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Stat from '../ui/Stat';
import ProgressBar from '../ui/ProgressBar';
import Segmented from '../ui/Segmented';
import LineChart from '../ui/LineChart';
import ColumnChart from '../ui/ColumnChart';
import BarList from '../ui/BarList';
import { EmptyState, ErrorState } from '../ui/States';
import { Skeleton } from '../ui/Spinner';
import { cx } from '../../lib/cx';

const PAGE_SIZE = 25;
const share = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);

const downloadCsv = (rows) => {
  // BOM so Excel opens names with accents correctly.
  const blob = new Blob([`﻿${studentsToCsv(rows)}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), { href: url, download: `students-${new Date().toISOString().slice(0, 10)}.csv` });
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const SortHeader = ({ id, label, sort, onSort, className }) => {
  const active = sort.key === id;
  const Icon = sort.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th scope="col" aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'} className={cx('px-3 py-2 text-left font-medium', className)}>
      <button type="button" onClick={() => onSort(id)} className={cx('inline-flex items-center gap-1 hover:text-ink', active && 'text-ink')}>
        {label}
        {active && <Icon className="h-3 w-3" aria-hidden />}
      </button>
    </th>
  );
};

const StudentsTable = ({ students, roles, filter, setFilter, tableRef }) => {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [sort, setSort] = useState({ key: 'readiness', dir: 'desc' });
  const [limit, setLimit] = useState(PAGE_SIZE);

  const counts = useMemo(
    () => ({
      all: students.length,
      attention: students.filter((s) => s.needsAttention).length,
      ready: students.filter((s) => s.band?.id === 'ready').length,
      'not-started': students.filter((s) => s.readiness == null).length,
    }),
    [students],
  );
  const rows = useMemo(() => filterStudents(students, { filter, role, search, sort: sort.key, dir: sort.dir }), [students, filter, role, search, sort]);

  const onSort = (key) => setSort((prev) => ({ key, dir: prev.key === key && prev.dir === 'desc' ? 'asc' : key === 'name' ? 'asc' : 'desc' }));

  return (
    <section ref={tableRef} className="mt-4 scroll-mt-20" aria-label="Students">
      <Card>
        <CardHeader
          title="Students"
          description={`${rows.length} of ${students.length} shown`}
          action={
            <Button variant="secondary" size="sm" icon={Download} onClick={() => downloadCsv(rows)} disabled={!rows.length} title="Download the students matching your filters">
              Export CSV
            </Button>
          }
        />
        <div className="flex flex-col gap-2 px-5 pt-4 lg:flex-row lg:items-center">
          <div className="relative lg:w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-light" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setLimit(PAGE_SIZE);
              }}
              placeholder="Search name, email, role…"
              aria-label="Search students"
              className="input pl-8"
            />
          </div>
          <div className="overflow-x-auto">
            <Segmented
              label="Filter students"
              value={filter}
              onChange={(value) => {
                setFilter(value);
                setLimit(PAGE_SIZE);
              }}
              options={[
                { value: 'all', label: 'All', count: counts.all },
                { value: 'attention', label: 'Needs attention', count: counts.attention },
                { value: 'ready', label: 'Job-ready', count: counts.ready },
                { value: 'not-started', label: 'Not started', count: counts['not-started'] },
              ]}
            />
          </div>
          <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Filter by target role" className="input lg:ml-auto lg:w-52">
            <option value="">All roles</option>
            {roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {rows.length ? (
          <>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-y border-line bg-slate-50 text-xs text-muted">
                  <tr>
                    <SortHeader id="name" label="Student" sort={sort} onSort={onSort} className="pl-5" />
                    <th scope="col" className="hidden px-3 py-2 text-left font-medium md:table-cell">Target</th>
                    <SortHeader id="readiness" label="Readiness" sort={sort} onSort={onSort} />
                    <SortHeader id="delta" label="Change" sort={sort} onSort={onSort} className="hidden sm:table-cell" />
                    <SortHeader id="gaps" label="Critical gaps" sort={sort} onSort={onSort} className="hidden lg:table-cell" />
                    <SortHeader id="active" label="Last analysis" sort={sort} onSort={onSort} className="hidden sm:table-cell pr-5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.slice(0, limit).map((s) => (
                    <tr key={s.id} className="align-top">
                      <td className="py-2.5 pl-5 pr-3">
                        <p className="font-medium text-ink">{s.name}</p>
                        <p className="text-xs text-muted">{s.email}</p>
                        <p className="mt-0.5 text-xs text-muted md:hidden">
                          {s.roleName || 'No goal yet'}
                          {s.companyName && ` · ${s.companyName}`}
                        </p>
                        {s.reasons.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {s.reasons.map((reason) => (
                              <Badge key={reason} tone={reason === 'not-started' ? 'neutral' : 'warning'}>
                                {ATTENTION_REASONS[reason]}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="hidden px-3 py-2.5 md:table-cell">
                        <p className="text-ink">{s.roleName || <span className="text-muted">No goal yet</span>}</p>
                        {s.companyName && <p className="text-xs text-muted">{s.companyName}</p>}
                      </td>
                      <td className="px-3 py-2.5">
                        {s.readiness == null ? (
                          <span className="text-muted">—</span>
                        ) : (
                          <div className="w-24" title={s.band.label}>
                            <p className="tabular font-semibold text-ink">
                              {s.readiness}
                              <span className="text-xs font-normal text-muted"> /100</span>
                            </p>
                            <ProgressBar value={s.readiness} size="xs" tone={BAND_STYLE[s.band.id].tone} className="mt-1" label={`${s.name} readiness: ${s.band.label}`} />
                          </div>
                        )}
                      </td>
                      <td className="tabular hidden px-3 py-2.5 sm:table-cell">
                        {s.delta == null ? (
                          <span className="text-muted">—</span>
                        ) : (
                          <span className={cx('font-medium', s.delta > 0 ? 'text-success-700' : s.delta < 0 ? 'text-danger-700' : 'text-muted')}>
                            {s.delta > 0 ? '+' : ''}
                            {s.delta}
                          </span>
                        )}
                      </td>
                      <td className="hidden px-3 py-2.5 lg:table-cell">
                        {s.criticalGaps.length ? (
                          <p className="max-w-[14rem] text-ink">
                            {s.criticalGaps.slice(0, 2).join(', ')}
                            {s.criticalGaps.length > 2 && <span className="text-muted"> +{s.criticalGaps.length - 2}</span>}
                          </p>
                        ) : (
                          <span className="text-muted">{s.readiness == null ? '—' : 'None'}</span>
                        )}
                        {s.gapCount > 0 && <p className="text-xs text-muted">{s.gapCount} gaps in total</p>}
                      </td>
                      <td className="hidden py-2.5 pl-3 pr-5 text-muted sm:table-cell">{s.lastActiveAt ? relativeTime(s.lastActiveAt) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > limit && (
              <div className="border-t border-line p-3 text-center">
                <Button variant="ghost" size="sm" onClick={() => setLimit((n) => n + PAGE_SIZE)}>
                  Show {Math.min(PAGE_SIZE, rows.length - limit)} more
                </Button>
              </div>
            )}
          </>
        ) : (
          <EmptyState compact icon={Users} title="No students match" description="Try a different filter or search." />
        )}
      </Card>
    </section>
  );
};

const AdminDashboard = () => {
  const [campus, setCampus] = useState(null);
  const [loadedAt, setLoadedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [groupBy, setGroupBy] = useState('role');
  const [filter, setFilter] = useState('all');
  const tableRef = useRef(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setCampus(buildCampusAnalytics(await getCampusData()));
      setLoadedAt(new Date().toISOString());
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err?.code === 'permission-denied' ? 'Your account doesn’t have permission to view campus analytics.' : 'Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const showAttention = () => {
    setFilter('attention');
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    tableRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  };

  const roles = useMemo(() => (campus ? [...new Set(campus.students.map((s) => s.roleName).filter(Boolean))].sort() : []), [campus]);
  const s = campus?.summary;

  return (
    <div>
      <PageHeader
        eyebrow="Placement cell"
        title="Campus analytics"
        description={`Readiness across your students, from each student’s latest analysis.${loadedAt ? ` Updated ${relativeTime(loadedAt)}.` : ''}`}
        actions={
          <Button variant="secondary" icon={RefreshCw} onClick={fetchAnalytics} loading={loading}>
            Refresh
          </Button>
        }
      />

      {loading && !campus ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <ErrorState title="Couldn’t load campus analytics" description={error} onRetry={fetchAnalytics} />
        </Card>
      ) : !s.registered ? (
        <Card>
          <EmptyState icon={BarChart3} title="No students yet" description="Once students sign up and analyse their skills, campus insights will appear here." />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <Stat label="Students" icon={Users} value={s.registered} hint={s.notStarted ? `${s.notStarted} not started yet` : 'All have analysed their skills'} />
            <Stat label="Average readiness" icon={TrendingUp} value={s.averageReadiness ?? '—'} unit={s.averageReadiness != null ? '/100' : undefined} hint={`${s.analysed} analysed`}>
              {s.averageReadiness != null && <ProgressBar value={s.averageReadiness} size="sm" className="mt-3" label="Average readiness" />}
            </Stat>
            <Stat label="Job-ready (80+)" icon={BadgeCheck} value={s.jobReady} hint={`${share(s.jobReady, s.analysed)}% of analysed students`} />
            <Stat label={`Active (${INACTIVE_DAYS} days)`} icon={Activity} value={s.activeRecently} hint={`of ${s.analysed} analysed`} />
            <Stat
              label="Need attention"
              icon={AlertTriangle}
              value={s.needsAttention}
              hint={
                s.needsAttention ? (
                  <button type="button" onClick={showAttention} className="font-medium text-ink hover:underline">
                    View students →
                  </button>
                ) : (
                  'No one flagged'
                )
              }
              className="col-span-2 lg:col-span-1"
            />
          </div>

          {s.analysed === 0 ? (
            <Card className="mt-4">
              <EmptyState compact icon={BarChart3} title="No analyses yet" description="Charts appear once students complete their first skill analysis." />
            </Card>
          ) : (
            <>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader title="Readiness spread" description="Students in each readiness band." />
                  <CardBody>
                    <ColumnChart
                      ariaLabel="Students per readiness band"
                      bars={campus.distribution.map((d) => ({ id: d.id, label: d.label, sublabel: d.range, value: d.students }))}
                      tooltip={(bar) => `${bar.value} student${bar.value === 1 ? '' : 's'} · ${share(bar.value, s.analysed)}% of analysed`}
                    />
                  </CardBody>
                </Card>
                <Card>
                  <CardHeader title="Readiness over time" description="Weekly average of each student’s latest score." />
                  <CardBody>
                    {campus.trend.length > 1 ? (
                      <LineChart points={campus.trend} target={80} targetLabel="80 = job-ready" ariaLabel="Average campus readiness by week" format={(v) => `${v}/100`} />
                    ) : (
                      <EmptyState compact icon={TrendingUp} title="Not enough history yet" description="The trend appears once analyses span more than one week." />
                    )}
                  </CardBody>
                </Card>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader title="Most common skill gaps" description="Students missing each skill in their latest analysis." />
                  <CardBody>
                    {campus.topGaps.length ? (
                      <BarList
                        ariaLabel="Most common skill gaps"
                        max={s.analysed}
                        rows={campus.topGaps.slice(0, 8).map((g) => ({
                          key: g.name,
                          label: g.name,
                          value: g.students,
                          valueLabel: `${share(g.students, s.analysed)}%`,
                          detail: `${g.students} student${g.students === 1 ? '' : 's'}${g.critical ? ` · ${g.critical} critical` : ''}`,
                        }))}
                      />
                    ) : (
                      <p className="text-sm text-muted">No gaps recorded — every analysed student meets their targets.</p>
                    )}
                  </CardBody>
                </Card>
                <Card>
                  <CardHeader
                    title="Average readiness"
                    description={groupBy === 'role' ? 'By target role.' : 'By target company.'}
                    action={
                      <Segmented
                        label="Group readiness by"
                        value={groupBy}
                        onChange={setGroupBy}
                        options={[
                          { value: 'role', label: 'Role' },
                          { value: 'company', label: 'Company' },
                        ]}
                      />
                    }
                  />
                  <CardBody>
                    {(groupBy === 'role' ? campus.byRole : campus.byCompany).length ? (
                      <BarList
                        ariaLabel={`Average readiness by target ${groupBy}`}
                        max={100}
                        rows={(groupBy === 'role' ? campus.byRole : campus.byCompany).slice(0, 8).map((g) => ({
                          key: g.name,
                          label: g.name,
                          value: g.averageReadiness,
                          detail: `${g.students} student${g.students === 1 ? '' : 's'}${g.jobReady ? ` · ${g.jobReady} job-ready` : ''}`,
                        }))}
                      />
                    ) : (
                      <p className="text-sm text-muted">No students have picked a target company yet.</p>
                    )}
                    {groupBy === 'company' && campus.noCompany > 0 && campus.byCompany.length > 0 && (
                      <p className="mt-4 text-xs text-muted">
                        {campus.noCompany} student{campus.noCompany === 1 ? ' hasn’t' : 's haven’t'} picked a target company.
                      </p>
                    )}
                  </CardBody>
                </Card>
              </div>
            </>
          )}

          <StudentsTable students={campus.students} roles={roles} filter={filter} setFilter={setFilter} tableRef={tableRef} />
          <p className="mt-3 text-xs text-muted">
            Based on profiles and analysis snapshots only. Roadmaps, progress and resume, job and GitHub results stay private to each student.
          </p>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;

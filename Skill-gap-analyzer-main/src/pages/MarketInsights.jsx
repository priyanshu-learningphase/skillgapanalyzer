/**
 * Career market insights — skill demand from real job ads, linked to the
 * user's gaps. Shows a clear setup state when no data provider is configured.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Globe2, RefreshCw, Database, Info, MapPin, Briefcase, IndianRupee, TrendingUp, ArrowUpRight, ArrowDownRight, PlugZap } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Segmented from '../components/ui/Segmented';
import BarList from '../components/ui/BarList';
import { EmptyState, ErrorState } from '../components/ui/States';
import { Skeleton } from '../components/ui/Spinner';
import { useWorkspace } from '../context/WorkspaceContext';
import { ROLES } from '../data/roles';
import { EXPERIENCE_LEVELS, MARKET_LOCATIONS, addSnapshot, marketGaps, skillTrends } from '../lib/market';
import { fetchMarketInsights } from '../services/marketService';
import { dayKey } from '../lib/progress';
import { cx } from '../lib/cx';

const lakh = (inr) => `₹${(inr / 100000).toFixed(inr >= 1000000 ? 0 : 1)} L`;
const LEVEL_LABEL = { internship: 'Internships', entry: 'Entry level', experienced: 'Experienced', unspecified: 'Not stated' };

const NotConfigured = () => (
  <Card>
    <div className="grid gap-6 p-6 md:grid-cols-[1fr_18rem]">
      <div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-white shadow-card">
          <PlugZap className="h-5 w-5 text-muted" aria-hidden />
        </div>
        <h2 className="mt-4 text-[15px] font-semibold text-ink">Market data isn’t connected yet</h2>
        <p className="mt-1 max-w-xl text-sm text-muted">
          This page analyses real, recent job ads: which skills employers ask for in your target role, by city and experience level, with salary ranges when enough ads state one. It needs a job-ads data provider configured on the server.
        </p>
        <p className="mt-3 max-w-xl text-sm text-muted">No sample numbers are shown in the meantime. Made-up figures would look like real market data, and they aren’t.</p>
        <div className="mt-5 rounded-lg border border-line bg-slate-50 p-4 text-sm">
          <p className="font-medium text-ink">For the site owner: connect Adzuna (India supported)</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted">
            <li>
              Create a free API key at{' '}
              <a href="https://developer.adzuna.com/" target="_blank" rel="noreferrer noopener" className="font-medium text-ink underline">
                developer.adzuna.com
              </a>
              .
            </li>
            <li>
              Add <code className="font-mono text-xs text-ink">ADZUNA_APP_ID</code> and <code className="font-mono text-xs text-ink">ADZUNA_APP_KEY</code> to the server environment (not the browser).
            </li>
            <li>Restart the server. Results are cached for 6 hours per search.</li>
          </ol>
        </div>
      </div>
      <div className="rounded-lg border border-dashed border-line p-4 text-sm">
        <p className="font-medium text-ink">Until then</p>
        <ul className="mt-2 space-y-2 text-muted">
          <li>
            <Link to="/gap" className="font-medium text-ink hover:underline">
              Skill Gap
            </Link>{' '}
            shows your target role’s configured requirements (a curated profile, not live market data).
          </li>
          <li>
            <Link to="/jobs" className="font-medium text-ink hover:underline">
              Jobs
            </Link>{' '}
            analyses any real job description you paste.
          </li>
        </ul>
      </div>
    </div>
  </Card>
);

const MarketInsights = () => {
  const { role, analysis, insights, actions } = useWorkspace();
  const defaultRole = role && role.id !== 'custom' && ROLES.some((r) => r.id === role.id) ? role.id : 'software-engineer';
  const [filters, setFilters] = useState({ role: defaultRole, location: 'india', level: 'all' });
  const [state, setState] = useState({ status: 'loading', data: null, error: null, notConfigured: false });
  const saveRef = useRef(actions.saveInsight);
  saveRef.current = actions.saveInsight;
  const snapshotsRef = useRef(insights.market?.snapshots || []);
  snapshotsRef.current = insights.market?.snapshots || [];

  const load = useCallback(async () => {
    setState((s) => ({ ...s, status: 'loading', error: null }));
    try {
      const data = await fetchMarketInsights(filters);
      setState({ status: 'ready', data, error: null, notConfigured: false });
      // Keep one snapshot per search per day so trends build up over time.
      if (data.sampleSize > 0) {
        const key = `${filters.role}|${filters.location}|${filters.level}`;
        const snapshots = addSnapshot(snapshotsRef.current, key, data, dayKey());
        saveRef.current('market', { snapshots: snapshots.slice(-60) });
      }
    } catch (err) {
      setState({ status: 'error', data: null, error: err.message, notConfigured: Boolean(err.notConfigured) });
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const key = `${filters.role}|${filters.location}|${filters.level}`;
  const trends = useMemo(() => skillTrends(insights.market?.snapshots || [], key), [insights.market, key]);
  const data = state.data;
  const gaps = useMemo(() => (data ? marketGaps(data.topSkills, analysis?.levels || {}) : []), [data, analysis]);
  const missing = gaps.filter((g) => g.missing).slice(0, 6);
  const roleName = ROLES.find((r) => r.id === filters.role)?.name;

  return (
    <div>
      <PageHeader title="Market insights" description="What employers are asking for right now, from real job ads, and how it compares with your skills." />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
          <div>
            <label htmlFor="mk-role" className="label">
              Role
            </label>
            <select id="mk-role" value={filters.role} onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value }))} className="input">
              {ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="mk-location" className="label">
              Location
            </label>
            <select id="mk-location" value={filters.location} onChange={(e) => setFilters((f) => ({ ...f, location: e.target.value }))} className="input">
              {MARKET_LOCATIONS.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto">
            <Segmented label="Experience level" size="md" value={filters.level} onChange={(level) => setFilters((f) => ({ ...f, level }))} options={EXPERIENCE_LEVELS.map((l) => ({ value: l.id, label: l.label }))} />
          </div>
        </div>
      </Card>

      {state.status === 'loading' ? (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      ) : state.notConfigured ? (
        <NotConfigured />
      ) : state.status === 'error' ? (
        <Card>
          <ErrorState title="Couldn’t load market data" description={state.error} onRetry={load} />
        </Card>
      ) : !data.sampleSize ? (
        <Card>
          <EmptyState icon={Briefcase} title="No matching ads in this sample" description={`The provider returned ${data.analysedAds} ads for “${data.query}” in ${data.location}, but none matched “${EXPERIENCE_LEVELS.find((l) => l.id === filters.level).label}”. Try all levels or another city.`} />
        </Card>
      ) : (
        <>
          <Card className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 p-4 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5" aria-hidden /> Source:{' '}
              <a href={data.providerUrl} target="_blank" rel="noreferrer noopener" className="font-medium text-ink underline">
                {data.provider}
              </a>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" aria-hidden /> {data.location}
            </span>
            <span>
              Sample: <span className="font-medium text-ink">{data.sampleSize}</span> of the {data.analysedAds} most recent ads ({data.totalMatching?.toLocaleString()} matching “{data.query}”)
            </span>
            {data.postedRange && (
              <span>
                Posted {data.postedRange.from} → {data.postedRange.to}
              </span>
            )}
            <span>
              Fetched {new Date(data.fetchedAt).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              {data.cached ? ' (cached)' : ''}
            </span>
            <Button size="xs" variant="ghost" icon={RefreshCw} onClick={load} className="ml-auto">
              Refresh
            </Button>
          </Card>

          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Card>
              <CardHeader title={`Most requested skills · ${roleName}`} description="Share of ads in the sample that mention each skill." />
              <CardBody>
                {data.topSkills.length ? (
                  <BarList
                    ariaLabel="Skill demand"
                    max={100}
                    rows={gaps.map((s) => ({
                      key: s.id,
                      label: s.name,
                      value: s.share,
                      valueLabel: `${s.share}%`,
                      detail: `${s.ads} ad${s.ads === 1 ? '' : 's'} · you: ${s.level}%${s.missing ? ' (gap)' : ''}`,
                    }))}
                  />
                ) : (
                  <p className="text-sm text-muted">No skill was mentioned in at least two ads of this sample.</p>
                )}
              </CardBody>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader title="In demand, missing from your profile" description="Skills in this market where you’re below 40%." />
                <CardBody>
                  {missing.length ? (
                    <ul className="space-y-2">
                      {missing.map((s) => (
                        <li key={s.id} className="flex items-center justify-between gap-3 text-sm">
                          <Link to={`/gap?skill=${s.id}`} className="min-w-0 truncate font-medium text-ink hover:underline">
                            {s.name}
                          </Link>
                          <span className="shrink-0 text-xs text-muted">
                            in {s.share}% of ads · you {s.level}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted">You have at least some level in every skill this sample asks for.</p>
                  )}
                  {missing.length > 0 && (
                    <p className="mt-3 text-xs text-muted">
                      Open a skill to see resources, or{' '}
                      <Link to="/roadmap" className="font-medium text-ink hover:underline">
                        update your roadmap
                      </Link>{' '}
                      if it’s part of your target role.
                    </p>
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="Salary range" icon={IndianRupee} />
                <CardBody>
                  {data.salary.median ? (
                    <>
                      <p className="tabular text-2xl font-semibold text-ink">
                        {lakh(data.salary.p25)} – {lakh(data.salary.p75)}
                        <span className="text-sm font-normal text-muted"> /year</span>
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Middle 50% of {data.salary.count} ads that state a salary · median {lakh(data.salary.median)}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted">
                      Not enough data: {data.salary.count} ad{data.salary.count === 1 ? '' : 's'} in this sample state{data.salary.count === 1 ? 's' : ''} a salary (we need at least 5). Provider estimates aren’t used.
                    </p>
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="Experience level mix" description="Estimated from ad titles and years mentioned." />
                <CardBody>
                  <ul className="space-y-1.5 text-sm">
                    {Object.entries(data.levelCounts).map(([lvl, count]) => (
                      <li key={lvl} className={cx('flex justify-between', filters.level === lvl && 'font-medium')}>
                        <span className="text-ink">{LEVEL_LABEL[lvl]}</span>
                        <span className="tabular text-muted">{count}</span>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            </div>
          </div>

          <Card className="mt-4">
            <CardHeader title="Demand over time" icon={TrendingUp} />
            <CardBody>
              {trends ? (
                <>
                  <p className="mb-3 text-xs text-muted">
                    From your {trends.points} saved snapshots of this search, {trends.from} → {trends.to}.
                  </p>
                  <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {trends.skills
                      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
                      .slice(0, 9)
                      .map((t) => {
                        const name = data.topSkills.find((s) => s.id === t.id)?.name || t.id;
                        return (
                          <li key={t.id} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm">
                            <span className="truncate text-ink">{name}</span>
                            <span className={cx('tabular inline-flex items-center gap-0.5 text-xs font-medium', t.change > 0 ? 'text-success-700' : t.change < 0 ? 'text-danger-700' : 'text-muted')}>
                              {t.change > 0 ? <ArrowUpRight className="h-3 w-3" aria-hidden /> : t.change < 0 ? <ArrowDownRight className="h-3 w-3" aria-hidden /> : null}
                              {t.before}% → {t.now}%
                            </span>
                          </li>
                        );
                      })}
                  </ul>
                </>
              ) : (
                <p className="text-sm text-muted">Trends appear once you’ve viewed this search on at least two different days. One snapshot is saved per day, so the history reflects real data over time.</p>
              )}
            </CardBody>
          </Card>

          <Card className="mt-4 p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
              <Info className="h-4 w-4 text-muted" aria-hidden /> Limitations
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted">
              {data.limitations.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </Card>
        </>
      )}
      <p className="mt-4 flex items-center gap-1.5 text-xs text-muted">
        <Globe2 className="h-3.5 w-3.5" aria-hidden /> Market data is fetched by the server; your profile is never sent to the provider.
      </p>
    </div>
  );
};

export default MarketInsights;

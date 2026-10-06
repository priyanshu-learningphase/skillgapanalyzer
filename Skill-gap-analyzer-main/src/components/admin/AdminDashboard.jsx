/**
 * Admin Dashboard — campus-wide readiness analytics for placement cells.
 */

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Users, TrendingUp, Target, AlertTriangle, BarChart3 } from 'lucide-react';
import { getCampusAnalytics } from '../../services/firestoreService';
import PageHeader from '../ui/PageHeader';
import Card, { CardHeader, CardBody } from '../ui/Card';
import Button from '../ui/Button';
import Stat from '../ui/Stat';
import ProgressBar from '../ui/ProgressBar';
import { EmptyState, ErrorState } from '../ui/States';
import { Skeleton } from '../ui/Spinner';

const scoreTone = (score) => (score >= 70 ? 'success' : score >= 50 ? 'warning' : 'danger');

const AdminDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setAnalytics(await getCampusAnalytics());
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

  return (
    <div>
      <PageHeader
        eyebrow="Placement cell"
        title="Campus analytics"
        description="Readiness across students, based on each student’s most recent analysis."
        actions={
          <Button variant="secondary" icon={RefreshCw} onClick={fetchAnalytics} loading={loading}>
            Refresh
          </Button>
        }
      />

      {loading && !analytics ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <ErrorState title="Couldn’t load campus analytics" description={error} onRetry={fetchAnalytics} />
        </Card>
      ) : analytics.totalStudents === 0 ? (
        <Card>
          <EmptyState icon={BarChart3} title="No analyses yet" description="Once students complete a skill analysis, campus insights will appear here." />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Students analysed" icon={Users} value={analytics.totalStudents} hint={`${analytics.totalAnalyses} analyses in total`} />
            <Stat label="Average readiness" icon={TrendingUp} value={analytics.averageReadiness} unit="%">
              <ProgressBar value={analytics.averageReadiness} size="sm" tone={scoreTone(analytics.averageReadiness)} className="mt-3" label="Average readiness" />
            </Stat>
            <Stat label="Career paths" icon={Target} value={analytics.roleWiseStats.length} hint="chosen by students" />
            <Stat label="Top skill gap" icon={AlertTriangle} value={analytics.topMissingSkills[0]?.skill || '—'} hint={analytics.topMissingSkills[0] ? `${analytics.topMissingSkills[0].count} students` : undefined} />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Top missing skills" description="Share of students with each gap." />
              <CardBody>
                <ol className="space-y-3.5">
                  {analytics.topMissingSkills.slice(0, 8).map((item, index) => (
                    <li key={item.skill} className="flex items-center gap-3">
                      <span className="tabular w-4 text-xs font-medium text-muted-light">{index + 1}</span>
                      <div className="flex-1">
                        <div className="mb-1.5 flex items-center justify-between text-sm">
                          <span className="font-medium text-ink">{item.skill}</span>
                          <span className="tabular text-xs text-muted">
                            {item.count} student{item.count === 1 ? '' : 's'}
                          </span>
                        </div>
                        <ProgressBar value={item.count} max={analytics.totalStudents} size="sm" tone="ink" label={`${item.skill} gap share`} />
                      </div>
                    </li>
                  ))}
                </ol>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Readiness by role" description="Average readiness per career path." />
              <CardBody>
                <ul className="space-y-3.5">
                  {analytics.roleWiseStats.map((item) => (
                    <li key={item.role}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="font-medium text-ink">{item.role}</span>
                        <span className="tabular text-xs text-muted">
                          <span className="font-semibold text-ink">{item.averageScore}%</span> · {item.studentCount} student{item.studentCount === 1 ? '' : 's'}
                        </span>
                      </div>
                      <ProgressBar value={item.averageScore} size="sm" tone={scoreTone(item.averageScore)} label={`${item.role} readiness`} />
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;

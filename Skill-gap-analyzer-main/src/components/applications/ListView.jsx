import { useNavigate } from 'react-router-dom';
import { StatusBadge, MatchBadge, nextUp, formatDate } from './parts';
import { cx } from '../../lib/cx';

/** Sortable list (sorting is chosen in the toolbar). Rows open the detail page. */
const ListView = ({ applications, matchPct }) => {
  const navigate = useNavigate();
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-slate-50 text-xs text-muted">
            <tr>
              <th scope="col" className="px-4 py-2 text-left font-medium">Company & role</th>
              <th scope="col" className="px-3 py-2 text-left font-medium">Status</th>
              <th scope="col" className="hidden px-3 py-2 text-left font-medium sm:table-cell">Match</th>
              <th scope="col" className="hidden px-3 py-2 text-left font-medium md:table-cell">Applied</th>
              <th scope="col" className="hidden px-3 py-2 text-left font-medium md:table-cell">Deadline</th>
              <th scope="col" className="hidden px-3 py-2 pr-4 text-left font-medium lg:table-cell">Next up</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {applications.map((app) => {
              const next = nextUp(app);
              return (
                <tr key={app.id} onClick={() => navigate(`/applications/${app.id}`)} className="cursor-pointer align-top hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <a
                      href={`/applications/${app.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(`/applications/${app.id}`);
                      }}
                      className="font-medium text-ink hover:underline"
                    >
                      {app.company}
                    </a>
                    <p className="text-xs text-muted">{app.role}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={app.status} />
                  </td>
                  <td className="hidden px-3 py-2.5 sm:table-cell">{matchPct[app.id] == null ? <span className="text-muted">—</span> : <MatchBadge value={matchPct[app.id]} />}</td>
                  <td className="hidden px-3 py-2.5 text-muted md:table-cell">{formatDate(app.appliedOn) || '—'}</td>
                  <td className="hidden px-3 py-2.5 text-muted md:table-cell">{formatDate(app.deadline) || '—'}</td>
                  <td className={cx('hidden max-w-[16rem] px-3 py-2.5 pr-4 lg:table-cell', next?.overdue ? 'font-medium text-danger-700' : 'text-muted')}>
                    <span className="line-clamp-2">{next?.label || '—'}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ListView;

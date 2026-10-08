import { NavLink } from 'react-router-dom';
import { cx } from '../../lib/cx';

/** Route-based tab bar for pages with sub-views. */
const Tabs = ({ items, className }) => (
  <nav className={cx('-mx-1 mb-6 flex gap-1 overflow-x-auto border-b border-line px-1', className)} aria-label="Sections">
    {items.map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        className={({ isActive }) =>
          cx(
            '-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
            isActive ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink',
          )
        }
      >
        {item.icon && <item.icon className="h-4 w-4" aria-hidden />}
        {item.label}
        {item.badge != null && <span className="tabular rounded bg-slate-100 px-1.5 text-[11px] text-muted">{item.badge}</span>}
      </NavLink>
    ))}
  </nav>
);

export default Tabs;

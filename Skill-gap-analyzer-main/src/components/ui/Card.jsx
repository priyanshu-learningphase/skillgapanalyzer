import { cx } from '../../lib/cx';

export const Card = ({ as: Tag = 'div', interactive = false, className, children, ...props }) => (
  <Tag className={cx(interactive ? 'card-interactive' : 'card', className)} {...props}>
    {children}
  </Tag>
);

export const CardHeader = ({ title, description, action, icon: Icon, className }) => (
  <div className={cx('flex items-start justify-between gap-4 px-5 pt-5', className)}>
    <div className="min-w-0">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
        {Icon && <Icon className="h-4 w-4 text-muted" aria-hidden />}
        {title}
      </h2>
      {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

export const CardBody = ({ className, children }) => <div className={cx('px-5 py-4', className)}>{children}</div>;

export default Card;

import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cx } from '../../lib/cx';

const VARIANTS = {
  primary: 'bg-ink text-white hover:bg-slate-800 active:bg-slate-900 shadow-card',
  accent: 'bg-accent text-white hover:bg-accent-600 active:bg-accent-700 shadow-card',
  secondary: 'bg-white text-ink border border-line hover:bg-slate-50 hover:border-slate-300 shadow-card',
  ghost: 'text-muted hover:text-ink hover:bg-slate-100',
  danger: 'bg-white text-danger-700 border border-danger-100 hover:bg-danger-50',
  link: 'text-accent-600 hover:text-accent-700 underline-offset-4 hover:underline px-0',
};

const SIZES = {
  xs: 'h-7 px-2 text-xs gap-1 rounded-md',
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-9 px-3.5 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-5 text-[15px] gap-2 rounded-lg',
};

/**
 * Button. Pass `to` to render a router link, `href` for an external link.
 */
const Button = forwardRef(
  ({ variant = 'primary', size = 'md', loading = false, icon: Icon, iconRight: IconRight, to, href, className, children, disabled, ...props }, ref) => {
    const classes = cx(
      'inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 select-none',
      VARIANTS[variant],
      variant !== 'link' && SIZES[size],
      variant === 'link' && 'text-sm gap-1',
      className,
    );
    const iconSize = size === 'lg' ? 'h-4 w-4' : 'h-3.5 w-3.5';
    const content = (
      <>
        {loading ? <Loader2 className={cx(iconSize, 'animate-spin')} aria-hidden /> : Icon && <Icon className={iconSize} aria-hidden />}
        {children}
        {IconRight && !loading && <IconRight className={iconSize} aria-hidden />}
      </>
    );

    if (to) {
      return (
        <Link ref={ref} to={to} className={classes} {...props}>
          {content}
        </Link>
      );
    }
    if (href) {
      return (
        <a ref={ref} href={href} className={classes} target="_blank" rel="noreferrer" {...props}>
          {content}
        </a>
      );
    }
    return (
      <button ref={ref} type="button" className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
        {content}
      </button>
    );
  },
);

Button.displayName = 'Button';

export default Button;

import { Link } from 'react-router-dom';

// One button component for the whole app so every button looks and behaves the same.
// Props: variant (primary | secondary | ghost | danger), size, icon (a Lucide component),
// `to` (renders a router Link instead of a <button>), loading (shows a spinner and disables).
export default function Button({ variant = 'primary', size, icon: Icon, to, loading = false, block, className = '', children, ...rest }) {
  const classes = ['btn', `btn--${variant}`, size && `btn--${size}`, block && 'btn--block', className].filter(Boolean).join(' ');
  const content = (
    <>
      {loading ? <span className="spinner" aria-hidden="true" /> : Icon && <Icon size={18} aria-hidden="true" />}
      {children}
    </>
  );
  if (to) return <Link to={to} className={classes} {...rest}>{content}</Link>;
  return <button type="button" className={classes} disabled={loading || rest.disabled} {...rest}>{content}</button>;
}

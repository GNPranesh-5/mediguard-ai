export default function EmptyState({ icon: Icon, title, message, children }) {
  return (
    <div className="state">
      {Icon && <Icon size={36} aria-hidden="true" />}
      <h3>{title}</h3>
      <p className="muted">{message}</p>
      {children && <div className="state__actions">{children}</div>}
    </div>
  );
}

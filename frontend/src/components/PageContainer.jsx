// Standard page wrapper: consistent width, vertical spacing, and a main heading.
export default function PageContainer({ title, intro, actions, children }) {
  return (
    <div className="container page">
      {(title || actions) && (
        <header className="page__head">
          <div>
            {title && <h1 className="page__title">{title}</h1>}
            {intro && <p className="muted page__intro">{intro}</p>}
          </div>
          {actions && <div className="page__actions">{actions}</div>}
        </header>
      )}
      {children}
    </div>
  );
}

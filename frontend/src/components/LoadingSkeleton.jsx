// Grey animated placeholders shown while data loads. `variant` picks a layout.
export default function LoadingSkeleton({ variant = 'cards', count = 3 }) {
  if (variant === 'result') {
    return (
      <div aria-busy="true" aria-label="Loading medicine details">
        <div className="skeleton" style={{ height: 40, width: '60%', marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 24, width: '30%', marginBottom: 32 }} />
        <div className="skeleton" style={{ height: 260, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 160 }} />
      </div>
    );
  }
  return (
    <div className="grid-cards" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => <div key={i} className="skeleton" style={{ height: 150 }} />)}
    </div>
  );
}

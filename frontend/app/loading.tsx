export default function Loading() {
  return (
    <div role="status" aria-label="Loading analytics" className="loading">
      <span className="sr-only">Loading analytics…</span>
      <div className="skeleton skeleton-heading" />
      <div className="skeleton skeleton-filters" />
      <div className="kpi-grid">
        {Array.from({ length: 8 }, (_, i) => (
          <div className="skeleton skeleton-metric" key={i} />
        ))}
      </div>
      <div className="skeleton skeleton-chart" />
    </div>
  );
}

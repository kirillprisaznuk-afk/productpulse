export function AnalyticsLoading({
  name,
  compact = false,
}: {
  name: string;
  compact?: boolean;
}) {
  return (
    <div role="status" aria-label={`Loading ${name}`}>
      <span className="sr-only">Loading {name}…</span>
      {!compact && (
        <>
          <div className="skeleton skeleton-heading" />
          <div className="skeleton skeleton-filters" />
        </>
      )}
      <div className="skeleton skeleton-chart" />
      <div className="skeleton skeleton-chart" style={{ marginTop: 24 }} />
    </div>
  );
}

import Link from "next/link";
export function ErrorState({
  message,
  retry = "/",
}: {
  message: string;
  retry?: string;
}) {
  return (
    <section className="state-panel" role="alert">
      <span className="state-symbol" aria-hidden="true">
        !
      </span>
      <h2>Analytics unavailable</h2>
      <p>{message}</p>
      <a className="button" href={retry}>
        Try again
      </a>
      <Link href={retry.split("?")[0] || "/"} className="text-link">
        Reset filters
      </Link>
    </section>
  );
}
export function EmptyState({
  title = "No data in this period",
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <span className="data-tag">
        <i aria-hidden="true" />
        Synthetic demo
      </span>
    </header>
  );
}

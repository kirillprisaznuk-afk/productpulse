"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <section className="state-panel" role="alert">
      <h1>This view could not be loaded</h1>
      <p>Please try again. Your analytics filters are preserved in the URL.</p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </section>
  );
}

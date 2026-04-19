import type { ReactElement, ReactNode } from "react";

interface StatCardProps {
  title: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
}

export function StatCard({ title, value, hint }: StatCardProps): ReactElement {
  return (
    <section className="card">
      <div className="muted">{title}</div>
      <div className="stat-value">{value}</div>
      {hint ? <div className="muted">{hint}</div> : null}
    </section>
  );
}

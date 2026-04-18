import type { ReactElement } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  hint?: string;
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

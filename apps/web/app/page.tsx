import type { ReactElement } from "react";

import { RunTable } from "@/components/run-table";
import { StatCard } from "@/components/stat-card";
import { getDashboardSummary } from "@/lib/api";

export default async function DashboardPage(): Promise<ReactElement> {
  const summary = await getDashboardSummary();

  return (
    <main className="stack">
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          Local-first supervision of AI-agent workspaces and runs.
        </p>
      </div>

      <section className="stats-grid">
        <StatCard title="Workspaces" value={summary.workspaces} />
        <StatCard title="Agents" value={summary.agents} />
        <StatCard title="Enabled schedules" value={summary.enabled_schedules} />
        <StatCard
          title="Execution mode"
          value={summary.execution_enabled ? "enabled" : "dry-run"}
          hint="Real execution is intentionally off by default."
        />
      </section>

      <section className="card">
        <h3>Recent runs</h3>
        {summary.recent_runs.length === 0 ? (
          <p className="muted">No runs yet.</p>
        ) : (
          <RunTable runs={summary.recent_runs} />
        )}
      </section>
    </main>
  );
}

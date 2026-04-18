import type { ReactElement } from "react";

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
          <table>
            <thead>
              <tr>
                <th>Run</th>
                <th>Status</th>
                <th>Trigger</th>
                <th>Dry-run</th>
                <th>Started</th>
              </tr>
            </thead>
            <tbody>
              {summary.recent_runs.map((run) => (
                <tr key={run.id}>
                  <td>{run.id}</td>
                  <td>
                    <span className="badge">{run.status}</span>
                  </td>
                  <td>{run.trigger}</td>
                  <td>{run.dry_run ? "yes" : "no"}</td>
                  <td>{new Date(run.started_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

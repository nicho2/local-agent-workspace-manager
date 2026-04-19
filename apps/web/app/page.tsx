import type { ReactElement } from "react";

import { T } from "@/components/i18n-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { RunTable } from "@/components/run-table";
import { StatCard } from "@/components/stat-card";
import { getDashboardSummary } from "@/lib/api";

export default async function DashboardPage(): Promise<ReactElement> {
  const summary = await getDashboardSummary();

  return (
    <main className="stack">
      <div>
        <div className="page-heading-row">
          <div>
            <h1 className="page-title">
              <T k="dashboard.title" />
            </h1>
            <p className="page-subtitle">
              <T k="dashboard.subtitle" />
            </p>
          </div>
          <LanguageSwitcher />
        </div>
      </div>

      <section className="stats-grid">
        <StatCard title={<T k="dashboard.workspaces" />} value={summary.workspaces} />
        <StatCard title={<T k="dashboard.agents" />} value={summary.agents} />
        <StatCard title={<T k="dashboard.enabledSchedules" />} value={summary.enabled_schedules} />
        <StatCard
          title={<T k="dashboard.executionMode" />}
          value={summary.execution_enabled ? <T k="common.enabled" /> : <T k="common.dryRun" />}
          hint={<T k="dashboard.executionHint" />}
        />
      </section>

      <section className="card">
        <h3>
          <T k="dashboard.recentRuns" />
        </h3>
        {summary.recent_runs.length === 0 ? (
          <p className="muted">
            <T k="dashboard.noRuns" />
          </p>
        ) : (
          <RunTable runs={summary.recent_runs} />
        )}
      </section>
    </main>
  );
}

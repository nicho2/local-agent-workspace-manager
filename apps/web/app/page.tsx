import type { ReactElement } from "react";

import { EmptyState } from "@/components/empty-state";
import { T } from "@/components/i18n-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { RunTable } from "@/components/run-table";
import { StatCard } from "@/components/stat-card";
import { getDashboardSummary, getWorkspaceAllowedRoots } from "@/lib/api";

export default async function DashboardPage(): Promise<ReactElement> {
  const [summary, workspaceAllowedRoots] = await Promise.all([
    getDashboardSummary(),
    getWorkspaceAllowedRoots(),
  ]);
  const isEmptyWorkspace = summary.workspaces === 0;

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

      {isEmptyWorkspace ? (
        <EmptyState
          actions={[
            { href: "/workspaces", label: <T k="onboarding.createWorkspace" /> },
            { href: "/settings", label: <T k="onboarding.reviewSettings" /> },
            { href: "/safety", label: <T k="onboarding.reviewSafety" /> },
          ]}
          title={<T k="onboarding.title" />}
        >
          <p>
            <T k="onboarding.dashboardEmpty" />
          </p>
          <p>
            <T k="onboarding.dryRunReminder" />
          </p>
          <div>
            <strong>
              <T k="onboarding.allowedRoots" />
            </strong>
            <ul className="inline-code-list">
              {workspaceAllowedRoots.allowed_roots.map((root) => (
                <li key={root}>
                  <code>{root}</code>
                </li>
              ))}
            </ul>
          </div>
          <p>
            <strong>
              <T k="onboarding.seedDemo" />
            </strong>
            : <code>py -3.12 scripts/seed_demo.py</code>
          </p>
        </EmptyState>
      ) : null}

      <section className="card">
        <h3>
          <T k="dashboard.recentRuns" />
        </h3>
        {summary.recent_runs.length === 0 ? (
          <EmptyState
            actions={[
              { href: "/workspaces", label: <T k="onboarding.createWorkspace" /> },
              { href: "/safety", label: <T k="onboarding.reviewSafety" /> },
            ]}
            title={<T k="dashboard.noRuns" />}
          >
            <p>
              <T k="onboarding.runsEmpty" />
            </p>
          </EmptyState>
        ) : (
          <RunTable runs={summary.recent_runs} />
        )}
      </section>
    </main>
  );
}

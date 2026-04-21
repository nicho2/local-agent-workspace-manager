import Link from "next/link";
import type { ReactElement } from "react";

import { T } from "@/components/i18n-provider";
import { StatCard } from "@/components/stat-card";
import { getSafetySummary } from "@/lib/api";

function formatDateTime(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleString() : "pending";
}

export default async function SafetyPage(): Promise<ReactElement> {
  const summary = await getSafetySummary();

  return (
    <main className="stack">
      <div className="page-heading-row">
        <div>
          <h1 className="page-title">
            <T k="safety.title" />
          </h1>
          <p className="page-subtitle">
            <T k="safety.subtitle" />
          </p>
        </div>
        <Link className="button-link" href="/settings">
          <T k="safety.reviewSettings" />
        </Link>
      </div>

      <section className="stats-grid">
        <StatCard
          title={<T k="safety.execution" />}
          value={summary.execution_enabled ? <T k="common.enabled" /> : <T k="common.dryRun" />}
          hint={<T k="safety.notSandbox" />}
        />
        <StatCard title={<T k="safety.allowedRoots" />} value={summary.allowed_roots.length} />
        <StatCard
          title={<T k="safety.permissivePolicies" />}
          value={summary.permissive_policies.length}
        />
        <StatCard title={<T k="safety.attentionRuns" />} value={summary.recent_attention_runs.length} />
      </section>

      <section className="card">
        <h3>
          <T k="safety.allowedRoots" />
        </h3>
        {summary.allowed_roots.length === 0 ? (
          <p className="muted">
            <T k="safety.none" />
          </p>
        ) : (
          <ul className="signal-list">
            {summary.allowed_roots.map((root) => (
              <li key={root}>
                <code>{root}</code>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <div className="section-heading-row">
          <h3>
            <T k="safety.permissivePolicies" />
          </h3>
          <Link className="button-link" href="/workspaces">
            <T k="safety.reviewWorkspaces" />
          </Link>
        </div>
        {summary.permissive_policies.length === 0 ? (
          <p className="muted">
            <T k="safety.none" />
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>
                  <T k="table.name" />
                </th>
                <th>
                  <T k="safety.writeNetwork" />
                </th>
                <th>
                  <T k="safety.prefixes" />
                </th>
              </tr>
            </thead>
            <tbody>
              {summary.permissive_policies.map((policy) => (
                <tr key={policy.id}>
                  <td>{policy.name}</td>
                  <td>
                    {policy.allow_write ? "write" : ""}
                    {policy.allow_write && policy.allow_network ? " + " : ""}
                    {policy.allow_network ? "network" : ""}
                  </td>
                  <td>
                    <code>{policy.allowed_command_prefixes.join(", ")}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <h3>
          <T k="safety.activeAgents" />
        </h3>
        {summary.active_agents.length === 0 ? (
          <p className="muted">
            <T k="safety.none" />
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>
                  <T k="table.agent" />
                </th>
                <th>
                  <T k="admin.runtime" />
                </th>
                <th>
                  <T k="admin.workspaceScope" />
                </th>
              </tr>
            </thead>
            <tbody>
              {summary.active_agents.map((agent) => (
                <tr key={agent.id}>
                  <td>{agent.name}</td>
                  <td>{agent.runtime}</td>
                  <td>{agent.workspace_name ?? <T k="safety.globalAgent" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <div className="section-heading-row">
          <h3>
            <T k="safety.activeSchedules" />
          </h3>
          <Link className="button-link" href="/schedules">
            <T k="safety.reviewSchedules" />
          </Link>
        </div>
        {summary.active_schedules.length === 0 ? (
          <p className="muted">
            <T k="safety.none" />
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>
                  <T k="table.name" />
                </th>
                <th>
                  <T k="table.mode" />
                </th>
                <th>
                  <T k="workspaces.title" />
                </th>
                <th>
                  <T k="table.agent" />
                </th>
                <th>
                  <T k="table.nextRun" />
                </th>
              </tr>
            </thead>
            <tbody>
              {summary.active_schedules.map((schedule) => (
                <tr key={schedule.id}>
                  <td>{schedule.name}</td>
                  <td>{schedule.mode}</td>
                  <td>{schedule.workspace_name}</td>
                  <td>{schedule.agent_name}</td>
                  <td>{formatDateTime(schedule.next_run_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <h3>
          <T k="safety.attentionRuns" />
        </h3>
        {summary.recent_attention_runs.length === 0 ? (
          <p className="muted">
            <T k="safety.none" />
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>
                  <T k="table.run" />
                </th>
                <th>
                  <T k="table.status" />
                </th>
                <th>
                  <T k="workspaces.title" />
                </th>
                <th>
                  <T k="table.agent" />
                </th>
                <th>
                  <T k="table.started" />
                </th>
              </tr>
            </thead>
            <tbody>
              {summary.recent_attention_runs.map((run) => (
                <tr key={run.id}>
                  <td>
                    <Link className="table-link" href={`/runs/${run.id}`}>
                      <T k="safety.reviewRun" />
                    </Link>
                  </td>
                  <td>
                    <span className={`badge badge-${run.status}`}>{run.status}</span>
                  </td>
                  <td>{run.workspace_name}</td>
                  <td>{run.agent_name}</td>
                  <td>{formatDateTime(run.started_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

import Link from "next/link";
import type { ReactElement } from "react";

import { ManualRunForm } from "@/components/manual-run-form";
import { RunTable } from "@/components/run-table";
import { getAgents, getPolicies, getRuns, getSchedules, getSettings, getWorkspace } from "@/lib/api";
import type { AgentProfile, Run, Schedule, SystemSetting, WorkspacePolicy } from "@/lib/types";

interface WorkspaceDetailPageProps {
  params: Promise<{
    workspaceId: string;
  }>;
}

function formatDateTime(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleString() : "not scheduled";
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to load workspace detail.";
}

function findWorkspacePolicy(
  policies: WorkspacePolicy[],
  policyId: string
): WorkspacePolicy | undefined {
  return policies.find((policy) => policy.id === policyId);
}

function getWorkspaceAgents(agents: AgentProfile[], workspaceId: string): AgentProfile[] {
  return agents.filter((agent) => agent.workspace_id === workspaceId || agent.workspace_id == null);
}

function getWorkspaceSchedules(schedules: Schedule[], workspaceId: string): Schedule[] {
  return schedules.filter((schedule) => schedule.workspace_id === workspaceId);
}

function getWorkspaceRuns(runs: Run[], workspaceId: string): Run[] {
  return runs.filter((run) => run.workspace_id === workspaceId);
}

function isExecutionEnabled(settings: SystemSetting[]): boolean {
  return (
    settings.find((setting) => setting.key === "runner.execution_enabled")?.value.toLowerCase() ===
    "true"
  );
}

export default async function WorkspaceDetailPage({
  params,
}: WorkspaceDetailPageProps): Promise<ReactElement> {
  const { workspaceId } = await params;

  try {
    const [workspace, policies, agents, schedules, runs, settings] = await Promise.all([
      getWorkspace(workspaceId),
      getPolicies(),
      getAgents(),
      getSchedules(),
      getRuns(),
      getSettings(),
    ]);

    const policy = findWorkspacePolicy(policies, workspace.policy_id);
    const workspaceAgents = getWorkspaceAgents(agents, workspace.id);
    const activeAgents = workspaceAgents.filter((agent) => agent.is_active);
    const workspaceSchedules = getWorkspaceSchedules(schedules, workspace.id);
    const workspaceRuns = getWorkspaceRuns(runs, workspace.id);
    const executionEnabled = isExecutionEnabled(settings);

    return (
      <main className="stack">
        <div className="page-heading-row">
          <div>
            <h1 className="page-title">{workspace.name}</h1>
            <p className="page-subtitle">
              {workspace.slug} / {workspace.status} / {workspace.root_path}
            </p>
          </div>
          <Link className="button-link" href="/workspaces">
            Back to workspaces
          </Link>
        </div>

        <section className="card detail-grid">
          <div>
            <div className="muted">Workspace</div>
            <strong>{workspace.id}</strong>
          </div>
          <div>
            <div className="muted">Policy</div>
            <strong>{policy?.name ?? workspace.policy_id}</strong>
          </div>
          <div>
            <div className="muted">Agents</div>
            <strong>{workspaceAgents.length}</strong>
          </div>
          <div>
            <div className="muted">Schedules</div>
            <strong>{workspaceSchedules.length}</strong>
          </div>
          <div>
            <div className="muted">Recent runs</div>
            <strong>{workspaceRuns.length}</strong>
          </div>
        </section>

        <section className="section-tabs" aria-label="Workspace sections">
          <a href="#execution">Execution</a>
          <a href="#agents">Agent</a>
          <a href="#policy">Policy</a>
          <a href="#scheduling">Scheduling</a>
          <a href="#history">History</a>
        </section>

        <section className="card" id="execution">
          <h3>Execution</h3>
          <p className="muted">Manual runs stay in dry-run mode by default.</p>
          <ManualRunForm
            agents={workspaceAgents}
            executionEnabled={executionEnabled}
            workspaceId={workspace.id}
          />
          {activeAgents.length === 0 ? (
            <p>No active agent is available for this workspace.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Ready agent</th>
                  <th>Runtime</th>
                  <th>Command</th>
                </tr>
              </thead>
              <tbody>
                {activeAgents.map((agent) => (
                  <tr key={agent.id}>
                    <td>{agent.name}</td>
                    <td>{agent.runtime}</td>
                    <td>
                      <code>{agent.command_template}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card" id="agents">
          <h3>Agent</h3>
          {workspaceAgents.length === 0 ? (
            <p className="muted">No agent is attached or global.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Scope</th>
                  <th>Status</th>
                  <th>Runtime</th>
                </tr>
              </thead>
              <tbody>
                {workspaceAgents.map((agent) => (
                  <tr key={agent.id}>
                    <td>{agent.name}</td>
                    <td>{agent.workspace_id ? "workspace" : "global"}</td>
                    <td>
                      <span className="badge">{agent.is_active ? "active" : "inactive"}</span>
                    </td>
                    <td>{agent.runtime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card" id="policy">
          <h3>Policy</h3>
          {policy ? (
            <div className="detail-grid">
              <div>
                <div className="muted">Name</div>
                <strong>{policy.name}</strong>
              </div>
              <div>
                <div className="muted">Max runtime</div>
                <strong>{policy.max_runtime_seconds}s</strong>
              </div>
              <div>
                <div className="muted">Write access</div>
                <strong>{policy.allow_write ? "allowed" : "denied"}</strong>
              </div>
              <div>
                <div className="muted">Network access</div>
                <strong>{policy.allow_network ? "allowed" : "denied"}</strong>
              </div>
              <div>
                <div className="muted">Command prefixes</div>
                <strong>{policy.allowed_command_prefixes.join(", ") || "none"}</strong>
              </div>
            </div>
          ) : (
            <p className="muted">Policy {workspace.policy_id} could not be loaded.</p>
          )}
        </section>

        <section className="card" id="scheduling">
          <h3>Scheduling</h3>
          {workspaceSchedules.length === 0 ? (
            <p className="muted">No schedule targets this workspace.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Mode</th>
                  <th>Enabled</th>
                  <th>Next run</th>
                </tr>
              </thead>
              <tbody>
                {workspaceSchedules.map((schedule) => (
                  <tr key={schedule.id}>
                    <td>{schedule.name}</td>
                    <td>{schedule.mode}</td>
                    <td>{schedule.enabled ? "yes" : "no"}</td>
                    <td>{formatDateTime(schedule.next_run_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card" id="history">
          <h3>History</h3>
          {workspaceRuns.length === 0 ? (
            <p className="muted">No run has been recorded for this workspace.</p>
          ) : (
            <RunTable runs={workspaceRuns} />
          )}
        </section>
      </main>
    );
  } catch (error) {
    return (
      <main className="stack">
        <div className="page-heading-row">
          <div>
            <h1 className="page-title">Workspace {workspaceId}</h1>
            <p className="page-subtitle">Workspace detail is not available.</p>
          </div>
          <Link className="button-link" href="/workspaces">
            Back to workspaces
          </Link>
        </div>
        <section className="card">
          <h3>Unable to load workspace</h3>
          <p className="muted">{getErrorMessage(error)}</p>
        </section>
      </main>
    );
  }
}

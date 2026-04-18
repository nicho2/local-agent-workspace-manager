import type {
  AgentProfile,
  DashboardSummary,
  Run,
  RunArtifact,
  RunLog,
  Schedule,
  SystemSetting,
  Workspace,
  WorkspacePolicy,
} from "@/lib/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

export function getDashboardSummary(): Promise<DashboardSummary> {
  return fetchJson<DashboardSummary>("/dashboard/summary");
}

export function getWorkspaces(): Promise<Workspace[]> {
  return fetchJson<Workspace[]>("/workspaces");
}

export function getWorkspace(workspaceId: string): Promise<Workspace> {
  return fetchJson<Workspace>(`/workspaces/${workspaceId}`);
}

export function getPolicies(): Promise<WorkspacePolicy[]> {
  return fetchJson<WorkspacePolicy[]>("/policies");
}

export function getAgents(): Promise<AgentProfile[]> {
  return fetchJson<AgentProfile[]>("/agents");
}

export function getSchedules(): Promise<Schedule[]> {
  return fetchJson<Schedule[]>("/schedules");
}

export function getRuns(): Promise<Run[]> {
  return fetchJson<Run[]>("/runs");
}

export function getRun(runId: string): Promise<Run> {
  return fetchJson<Run>(`/runs/${runId}`);
}

export function getRunLogs(runId: string): Promise<RunLog[]> {
  return fetchJson<RunLog[]>(`/runs/${runId}/logs`);
}

export function getRunArtifacts(runId: string): Promise<RunArtifact[]> {
  return fetchJson<RunArtifact[]>(`/runs/${runId}/artifacts`);
}

export function getSettings(): Promise<SystemSetting[]> {
  return fetchJson<SystemSetting[]>("/settings");
}

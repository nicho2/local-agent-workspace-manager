import type {
  AgentProfile,
  APIError,
  DashboardSummary,
  Run,
  RunArtifact,
  RunCreate,
  RunLog,
  Schedule,
  SystemSetting,
  Workspace,
  WorkspacePolicy,
} from "@/lib/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export class ApiRequestError extends Error {
  status: number;
  error?: APIError;

  constructor(status: number, statusText: string, error?: APIError) {
    super(error?.message ?? `API request failed: ${status} ${statusText}`);
    this.name = "ApiRequestError";
    this.status = status;
    this.error = error;
  }
}

function isApiError(value: unknown): value is APIError {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<APIError>;
  return (
    typeof candidate.code === "string" &&
    typeof candidate.message === "string" &&
    typeof candidate.details === "object" &&
    candidate.details !== null
  );
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
    ...init,
  });

  if (!response.ok) {
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      payload = undefined;
    }
    throw new ApiRequestError(
      response.status,
      response.statusText,
      isApiError(payload) ? payload : undefined
    );
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

export function createRun(payload: RunCreate): Promise<Run> {
  return fetchJson<Run>("/runs", {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}

export function getSettings(): Promise<SystemSetting[]> {
  return fetchJson<SystemSetting[]>("/settings");
}

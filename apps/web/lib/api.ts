import type {
  AgentProfile,
  AgentProfileCreate,
  AgentProfileUpdate,
  APIError,
  DashboardSummary,
  Run,
  RunArtifact,
  RunCreate,
  RunLog,
  RuntimeCapabilityPreset,
  Schedule,
  ScheduleCreate,
  ScheduleUpdate,
  SystemSetting,
  SystemSettingUpdate,
  Workspace,
  WorkspaceAllowedRoots,
  WorkspaceCreate,
  WorkspacePolicyCreate,
  WorkspacePolicyUpdate,
  WorkspaceUpdate,
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

export function getWorkspaceAllowedRoots(): Promise<WorkspaceAllowedRoots> {
  return fetchJson<WorkspaceAllowedRoots>("/workspaces/allowed-roots");
}

export function createWorkspace(payload: WorkspaceCreate): Promise<Workspace> {
  return fetchJson<Workspace>("/workspaces", {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}

export function getWorkspace(workspaceId: string): Promise<Workspace> {
  return fetchJson<Workspace>(`/workspaces/${workspaceId}`);
}

export function updateWorkspace(
  workspaceId: string,
  payload: WorkspaceUpdate
): Promise<Workspace> {
  return fetchJson<Workspace>(`/workspaces/${workspaceId}`, {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "PUT",
  });
}

export function getPolicies(): Promise<WorkspacePolicy[]> {
  return fetchJson<WorkspacePolicy[]>("/policies");
}

export function createPolicy(payload: WorkspacePolicyCreate): Promise<WorkspacePolicy> {
  return fetchJson<WorkspacePolicy>("/policies", {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}

export function updatePolicy(
  policyId: string,
  payload: WorkspacePolicyUpdate
): Promise<WorkspacePolicy> {
  return fetchJson<WorkspacePolicy>(`/policies/${policyId}`, {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "PUT",
  });
}

export function getAgents(): Promise<AgentProfile[]> {
  return fetchJson<AgentProfile[]>("/agents");
}

export function getRuntimePresets(): Promise<RuntimeCapabilityPreset[]> {
  return fetchJson<RuntimeCapabilityPreset[]>("/agents/runtime-presets");
}

export function createAgent(payload: AgentProfileCreate): Promise<AgentProfile> {
  return fetchJson<AgentProfile>("/agents", {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}

export function updateAgent(
  agentProfileId: string,
  payload: AgentProfileUpdate
): Promise<AgentProfile> {
  return fetchJson<AgentProfile>(`/agents/${agentProfileId}`, {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "PUT",
  });
}

export function getSchedules(): Promise<Schedule[]> {
  return fetchJson<Schedule[]>("/schedules");
}

export function createSchedule(payload: ScheduleCreate): Promise<Schedule> {
  return fetchJson<Schedule>("/schedules", {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}

export function updateSchedule(
  scheduleId: string,
  payload: ScheduleUpdate
): Promise<Schedule> {
  return fetchJson<Schedule>(`/schedules/${scheduleId}`, {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "PUT",
  });
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

export function updateSetting(
  key: string,
  payload: SystemSettingUpdate
): Promise<SystemSetting> {
  return fetchJson<SystemSetting>(`/settings/${encodeURIComponent(key)}`, {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "PUT",
  });
}

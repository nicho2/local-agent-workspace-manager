export type RunStatus = "queued" | "running" | "completed" | "failed" | "blocked";

export interface APIError {
  code: string;
  message: string;
  details: Record<string, unknown>;
}

export interface WorkspacePolicy {
  id: string;
  name: string;
  description?: string | null;
  max_runtime_seconds: number;
  allow_write: boolean;
  allow_network: boolean;
  allowed_command_prefixes: string[];
  created_at: string;
  updated_at: string;
}

export interface WorkspacePolicyCreate {
  name: string;
  description?: string | null;
  max_runtime_seconds: number;
  allow_write: boolean;
  allow_network: boolean;
  allowed_command_prefixes: string[];
}

export type WorkspacePolicyUpdate = Partial<WorkspacePolicyCreate>;

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  root_path: string;
  description?: string | null;
  tags: string[];
  status: "active" | "archived";
  policy_id: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceCreate {
  name: string;
  slug: string;
  root_path: string;
  description?: string | null;
  tags: string[];
  status?: "active" | "archived";
  policy_id?: string | null;
}

export interface WorkspaceUpdate {
  name?: string;
  root_path?: string;
  description?: string | null;
  tags?: string[];
  status?: "active" | "archived";
  policy_id?: string;
}

export interface WorkspaceAllowedRoots {
  allowed_roots: string[];
}

export interface AgentProfile {
  id: string;
  name: string;
  runtime: AgentRuntime;
  workspace_id?: string | null;
  command_template: string;
  system_prompt?: string | null;
  environment: Record<string, string>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgentProfileCreate {
  name: string;
  runtime: AgentRuntime;
  workspace_id?: string | null;
  command_template: string;
  system_prompt?: string | null;
  environment: Record<string, string>;
  is_active: boolean;
}

export type AgentProfileUpdate = Partial<AgentProfileCreate>;

export type AgentRuntime =
  | "copilot_cli"
  | "codex"
  | "local_command"
  | "local_script"
  | "custom";

export interface RuntimeCapabilityPreset {
  runtime: AgentRuntime;
  display_name: string;
  description: string;
  default_command_template: string;
  supports_dry_run: boolean;
  requires_write_access: boolean;
  requires_network_access: boolean;
  recommended_policy_prefixes: string[];
  environment_defaults: Record<string, string>;
}

export interface Schedule {
  id: string;
  name: string;
  workspace_id: string;
  agent_profile_id: string;
  mode: "manual" | "interval" | "cron";
  interval_minutes?: number | null;
  cron_expression?: string | null;
  enabled: boolean;
  next_run_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduleCreate {
  name: string;
  workspace_id: string;
  agent_profile_id: string;
  mode: "manual" | "interval" | "cron";
  interval_minutes?: number | null;
  cron_expression?: string | null;
  enabled: boolean;
}

export type ScheduleUpdate = Partial<ScheduleCreate>;

export interface Run {
  id: string;
  workspace_id: string;
  agent_profile_id: string;
  trigger: "manual" | "schedule";
  status: RunStatus;
  dry_run: boolean;
  requested_by: string;
  command_preview: string;
  started_at: string;
  finished_at?: string | null;
}

export interface RunPreview {
  workspace_id: string;
  workspace_name: string;
  workspace_slug: string;
  workspace_root_path: string;
  agent_profile_id: string;
  agent_name: string;
  agent_runtime: string;
  policy_id: string;
  policy_name: string;
  dry_run: boolean;
  command_preview: string;
  execution_enabled: boolean;
  allow_write: boolean;
  allow_network: boolean;
  allowed_command_prefixes: string[];
  blocking_reasons: string[];
}

export interface RunCreate {
  workspace_id: string;
  agent_profile_id: string;
  trigger?: "manual" | "schedule";
  requested_by?: string;
  dry_run?: boolean;
  command_override?: string | null;
}

export interface RunLog {
  id: string;
  run_id: string;
  level: string;
  message: string;
  timestamp: string;
}

export interface RunArtifact {
  id: string;
  run_id: string;
  name: string;
  relative_path: string;
  media_type: string;
  created_at: string;
}

export interface DashboardSummary {
  workspaces: number;
  agents: number;
  enabled_schedules: number;
  execution_enabled: boolean;
  recent_runs: Run[];
}

export interface SystemSetting {
  key: string;
  value: string;
  description: string;
  updated_at: string;
}

export interface SystemSettingUpdate {
  value: string;
}

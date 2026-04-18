export type RunStatus = "queued" | "running" | "completed" | "failed" | "blocked";

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

export interface AgentProfile {
  id: string;
  name: string;
  runtime: "copilot_cli" | "codex" | "local_script" | "custom";
  workspace_id?: string | null;
  command_template: string;
  system_prompt?: string | null;
  environment: Record<string, string>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createAgent,
  createPolicy,
  createRun,
  createRunPreview,
  createSchedule,
  createWorkspace,
  deleteAgent,
  deletePolicy,
  deleteWorkspace,
  getRuntimePresets,
  getSafetySummary,
  getWorkspaceAllowedRoots,
  getWorkspaceDeleteSummary,
  updateSchedule,
  updateSetting,
  updateWorkspace,
} from "@/lib/api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api client", () => {
  function stubJsonResponse(payload: unknown, status = 200): ReturnType<typeof vi.fn> {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify(payload), {
        headers: { "Content-Type": "application/json" },
        status,
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("creates a manual dry-run with the expected POST contract", async () => {
    const fetchMock = stubJsonResponse(
      {
        id: "run_created",
        workspace_id: "ws_docs",
        agent_profile_id: "agent_docs",
        trigger: "manual",
        status: "completed",
        dry_run: true,
        requested_by: "web-ui",
        command_preview: "gh copilot suggest -t maintenance",
        started_at: "2026-04-18T09:00:00+00:00",
        finished_at: "2026-04-18T09:00:03+00:00",
      },
      201
    );

    const run = await createRun({
      agent_profile_id: "agent_docs",
      dry_run: true,
      requested_by: "web-ui",
      trigger: "manual",
      workspace_id: "ws_docs",
    });

    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/runs", {
      body: JSON.stringify({
        agent_profile_id: "agent_docs",
        dry_run: true,
        requested_by: "web-ui",
        trigger: "manual",
        workspace_id: "ws_docs",
      }),
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    expect(run.id).toBe("run_created");
  });

  it("creates a run safety preview with the expected POST contract", async () => {
    const fetchMock = stubJsonResponse({
      workspace_id: "ws_docs",
      workspace_name: "Docs Vault",
      workspace_slug: "docs-vault",
      workspace_root_path: "E:/workspaces/docs-vault",
      agent_profile_id: "agent_docs",
      agent_name: "maintenance-agent",
      agent_runtime: "copilot_cli",
      policy_id: "policy_safe",
      policy_name: "default-safe",
      dry_run: true,
      command_preview: "copilot --agent wiki-maintenance",
      execution_enabled: false,
      allow_write: false,
      allow_network: false,
      allowed_command_prefixes: ["copilot --agent"],
      blocking_reasons: [],
    });

    const preview = await createRunPreview({
      agent_profile_id: "agent_docs",
      dry_run: true,
      requested_by: "web-ui",
      trigger: "manual",
      workspace_id: "ws_docs",
    });

    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/runs/preview", {
      body: JSON.stringify({
        agent_profile_id: "agent_docs",
        dry_run: true,
        requested_by: "web-ui",
        trigger: "manual",
        workspace_id: "ws_docs",
      }),
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    expect(preview.workspace_name).toBe("Docs Vault");
  });

  it("loads the safety summary contract", async () => {
    const fetchMock = stubJsonResponse({
      execution_enabled: true,
      allowed_roots: ["E:/temp"],
      permissive_policies: [],
      active_agents: [],
      active_schedules: [],
      recent_attention_runs: [],
    });

    const summary = await getSafetySummary();

    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/safety/summary", {
      cache: "no-store",
    });
    expect(summary.execution_enabled).toBe(true);
    expect(summary.allowed_roots).toEqual(["E:/temp"]);
  });

  it("creates and updates workspace contracts", async () => {
    const workspace = {
      id: "ws_created",
      name: "Docs Vault",
      slug: "docs-vault",
      root_path: "E:/workspaces/docs-vault",
      description: null,
      tags: ["docs"],
      status: "active",
      policy_id: "policy_safe",
      created_at: "2026-04-18T09:00:00+00:00",
      updated_at: "2026-04-18T09:00:00+00:00",
    };
    const fetchMock = stubJsonResponse(workspace, 201);

    await createWorkspace({
      name: "Docs Vault",
      slug: "docs-vault",
      root_path: "E:/workspaces/docs-vault",
      description: null,
      tags: ["docs"],
      status: "active",
      policy_id: "policy_safe",
    });
    await updateWorkspace("ws_created", {
      name: "Docs Vault Updated",
      root_path: "E:/workspaces/docs-vault",
      tags: ["docs", "ops"],
      status: "active",
      policy_id: "policy_safe",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(1, "http://localhost:8000/workspaces", {
      body: JSON.stringify({
        name: "Docs Vault",
        slug: "docs-vault",
        root_path: "E:/workspaces/docs-vault",
        description: null,
        tags: ["docs"],
        status: "active",
        policy_id: "policy_safe",
      }),
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "http://localhost:8000/workspaces/ws_created", {
      body: JSON.stringify({
        name: "Docs Vault Updated",
        root_path: "E:/workspaces/docs-vault",
        tags: ["docs", "ops"],
        status: "active",
        policy_id: "policy_safe",
      }),
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
  });

  it("creates policy, agent, and schedule contracts", async () => {
    const fetchMock = stubJsonResponse({}, 201);

    await createPolicy({
      allow_network: false,
      allow_write: false,
      allowed_command_prefixes: ["gh copilot"],
      description: "safe",
      max_runtime_seconds: 900,
      name: "safe-policy",
    });
    await createAgent({
      command_template: "gh copilot suggest -t maintenance",
      environment: {},
      is_active: true,
      name: "maintenance-agent",
      runtime: "copilot_cli",
      system_prompt: null,
      workspace_id: "ws_docs",
    });
    await createSchedule({
      agent_profile_id: "agent_docs",
      cron_expression: null,
      enabled: true,
      interval_minutes: 60,
      mode: "interval",
      name: "nightly-docs",
      workspace_id: "ws_docs",
    });
    await updateSchedule("sched_docs", {
      enabled: false,
    });

    expect(fetchMock).toHaveBeenNthCalledWith(1, "http://localhost:8000/policies", {
      body: JSON.stringify({
        allow_network: false,
        allow_write: false,
        allowed_command_prefixes: ["gh copilot"],
        description: "safe",
        max_runtime_seconds: 900,
        name: "safe-policy",
      }),
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "http://localhost:8000/agents", {
      body: JSON.stringify({
        command_template: "gh copilot suggest -t maintenance",
        environment: {},
        is_active: true,
        name: "maintenance-agent",
        runtime: "copilot_cli",
        system_prompt: null,
        workspace_id: "ws_docs",
      }),
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    expect(fetchMock).toHaveBeenNthCalledWith(3, "http://localhost:8000/schedules", {
      body: JSON.stringify({
        agent_profile_id: "agent_docs",
        cron_expression: null,
        enabled: true,
        interval_minutes: 60,
        mode: "interval",
        name: "nightly-docs",
        workspace_id: "ws_docs",
      }),
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    expect(fetchMock).toHaveBeenNthCalledWith(4, "http://localhost:8000/schedules/sched_docs", {
      body: JSON.stringify({
        enabled: false,
      }),
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
  });

  it("deletes workspace, policy, and agent contracts", async () => {
    const fetchMock = stubJsonResponse({
      resource: "workspace",
      id: "ws_docs",
      deleted: true,
      deleted_counts: { agents: 1, schedules: 1, runs: 1 },
    });

    await deleteWorkspace("ws_docs", "docs-vault");
    await deletePolicy("policy_safe");
    await deleteAgent("agent_docs");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:8000/workspaces/ws_docs?confirmation=docs-vault",
      {
        cache: "no-store",
        method: "DELETE",
      }
    );
    expect(fetchMock).toHaveBeenNthCalledWith(2, "http://localhost:8000/policies/policy_safe", {
      cache: "no-store",
      method: "DELETE",
    });
    expect(fetchMock).toHaveBeenNthCalledWith(3, "http://localhost:8000/agents/agent_docs", {
      cache: "no-store",
      method: "DELETE",
    });
  });

  it("loads the workspace delete summary contract", async () => {
    const fetchMock = stubJsonResponse({
      resource: "workspace",
      id: "ws_docs",
      deleted: false,
      deleted_counts: { agents: 1, schedules: 1, runs: 2, artifacts: 2 },
    });

    const summary = await getWorkspaceDeleteSummary("ws_docs");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/workspaces/ws_docs/delete-summary",
      {
        cache: "no-store",
      }
    );
    expect(summary.deleted_counts.runs).toBe(2);
  });

  it("fetches runtime capability presets", async () => {
    const fetchMock = stubJsonResponse([
      {
        runtime: "local_command",
        display_name: "Local command",
        description: "Generic local command profile for project scripts and checks.",
        default_command_template: "python -m pytest",
        supports_dry_run: true,
        requires_write_access: false,
        requires_network_access: false,
        recommended_policy_prefixes: ["python -m"],
        environment_defaults: {},
      },
    ]);

    const presets = await getRuntimePresets();

    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/agents/runtime-presets", {
      cache: "no-store",
    });
    expect(presets[0].runtime).toBe("local_command");
  });

  it("fetches workspace allowed roots", async () => {
    const fetchMock = stubJsonResponse({
      allowed_roots: ["E:/workspaces", "E:/temp"],
    });

    const allowedRoots = await getWorkspaceAllowedRoots();

    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/workspaces/allowed-roots", {
      cache: "no-store",
    });
    expect(allowedRoots.allowed_roots).toEqual(["E:/workspaces", "E:/temp"]);
  });

  it("updates settings with the expected PUT contract", async () => {
    const fetchMock = stubJsonResponse({
      key: "runner.execution_enabled",
      value: "true",
      description: "Global switch for real command execution.",
      updated_at: "2026-04-18T09:00:00+00:00",
    });

    const setting = await updateSetting("runner.execution_enabled", { value: "true" });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/settings/runner.execution_enabled",
      {
        body: JSON.stringify({ value: "true" }),
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      }
    );
    expect(setting.value).toBe("true");
  });
});

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import WorkspaceDetailPage from "@/app/workspaces/[workspaceId]/page";
import WorkspacesPage from "@/app/workspaces/page";

vi.mock("next/link", () => ({
  default: ({
    children,
    className,
    href,
  }: {
    children: React.ReactNode;
    className?: string;
    href: string;
  }) => React.createElement("a", { className, href }, children),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

const sampleWorkspace = {
  id: "ws_docs",
  name: "Docs Vault",
  slug: "docs-vault",
  root_path: "E:/workspaces/docs-vault",
  description: "Documentation workspace",
  tags: ["docs"],
  status: "active",
  policy_id: "policy_safe",
  created_at: "2026-04-18T09:00:00+00:00",
  updated_at: "2026-04-18T09:00:00+00:00",
};

const samplePolicy = {
  id: "policy_safe",
  name: "default-safe",
  description: "Safe dry-run policy",
  max_runtime_seconds: 900,
  allow_write: false,
  allow_network: false,
  allowed_command_prefixes: ["gh copilot", "python -m pytest"],
  created_at: "2026-04-18T09:00:00+00:00",
  updated_at: "2026-04-18T09:00:00+00:00",
};

const sampleAgent = {
  id: "agent_docs",
  name: "maintenance-agent",
  runtime: "copilot_cli",
  workspace_id: "ws_docs",
  command_template: "gh copilot suggest -t maintenance",
  system_prompt: "Review docs",
  environment: {},
  is_active: true,
  created_at: "2026-04-18T09:00:00+00:00",
  updated_at: "2026-04-18T09:00:00+00:00",
};

const sampleRuntimePresets = [
  {
    runtime: "copilot_cli",
    display_name: "GitHub Copilot CLI",
    description: "Copilot CLI profile for local repository or documentation triage.",
    default_command_template:
      'copilot --agent wiki-maintenance --autopilot --yolo --max-autopilot-continues 6 --prompt "Lance la maintenance standard du coffre"',
    supports_dry_run: true,
    requires_write_access: false,
    requires_network_access: true,
    recommended_policy_prefixes: ["copilot --agent"],
    environment_defaults: {},
  },
  {
    runtime: "codex",
    display_name: "Codex",
    description: "Codex CLI profile for local agent tasks with explicit policy review.",
    default_command_template: "codex run maintenance",
    supports_dry_run: true,
    requires_write_access: true,
    requires_network_access: false,
    recommended_policy_prefixes: ["codex run"],
    environment_defaults: {},
  },
];

const inactiveAgent = {
  ...sampleAgent,
  id: "agent_inactive",
  is_active: false,
  name: "inactive-agent",
};

const sampleSchedule = {
  id: "sched_docs",
  name: "nightly-docs",
  workspace_id: "ws_docs",
  agent_profile_id: "agent_docs",
  mode: "interval",
  interval_minutes: 60,
  cron_expression: null,
  enabled: true,
  next_run_at: "2026-04-18T10:00:00+00:00",
  created_at: "2026-04-18T09:00:00+00:00",
  updated_at: "2026-04-18T09:00:00+00:00",
};

const sampleRun = {
  id: "run_docs",
  workspace_id: "ws_docs",
  agent_profile_id: "agent_docs",
  trigger: "manual",
  status: "completed",
  dry_run: true,
  requested_by: "pytest",
  command_preview: "gh copilot suggest -t maintenance",
  started_at: "2026-04-18T09:00:00+00:00",
  finished_at: "2026-04-18T09:00:03+00:00",
};

function mockFetchSequence(payloads: unknown[]): ReturnType<typeof vi.fn> {
  const queue = [...payloads];
  const fetchMock = vi.fn(async () => {
    const payload = queue.shift();
    return new Response(JSON.stringify(payload), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("workspaces flow", () => {
  it("renders workspace names as links to detail pages", async () => {
    const fetchMock = mockFetchSequence([
      [sampleWorkspace],
      [samplePolicy],
      [sampleAgent],
      sampleRuntimePresets,
    ]);

    const html = renderToStaticMarkup(await WorkspacesPage());

    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/workspaces", {
      cache: "no-store",
    });
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/policies", {
      cache: "no-store",
    });
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/agents/runtime-presets", {
      cache: "no-store",
    });
    expect(html).toContain("Docs Vault");
    expect(html).toContain('href="/workspaces/ws_docs"');
    expect(html).toContain("Create and edit");
    expect(html).toContain("Create workspace");
    expect(html).toContain("Create policy");
    expect(html).toContain("Create agent");
    expect(html).toContain("copilot --agent wiki-maintenance");
  });

  it("renders workspace detail sections for execution, agent, policy, scheduling, and history", async () => {
    const fetchMock = mockFetchSequence([
      sampleWorkspace,
      [samplePolicy],
      [sampleAgent, inactiveAgent],
      [sampleSchedule],
      [sampleRun],
      [
        {
          key: "runner.execution_enabled",
          value: "false",
          description: "Global switch for real command execution.",
          updated_at: "2026-04-18T09:00:00+00:00",
        },
      ],
    ]);

    const html = renderToStaticMarkup(
      await WorkspaceDetailPage({ params: Promise.resolve({ workspaceId: "ws_docs" }) })
    );

    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/workspaces/ws_docs", {
      cache: "no-store",
    });
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/policies", {
      cache: "no-store",
    });
    expect(html).toContain("Docs Vault");
    expect(html).toContain("Execution");
    expect(html).toContain("Launch dry-run");
    expect(html).toContain("Dry-run");
    expect(html).toContain("disabled globally");
    expect(html).toContain("inactive-agent");
    expect(html).toContain("disabled=\"\"");
    expect(html).toContain("Agent");
    expect(html).toContain("Policy");
    expect(html).toContain("Scheduling");
    expect(html).toContain("History");
    expect(html).toContain("maintenance-agent");
    expect(html).toContain("default-safe");
    expect(html).toContain("gh copilot");
    expect(html).toContain("nightly-docs");
    expect(html).toContain('href="/runs/run_docs"');
  });
});

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import SchedulesPage from "@/app/schedules/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
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

describe("schedules flow", () => {
  it("renders schedule create/edit form with configured schedules", async () => {
    const fetchMock = mockFetchSequence([[sampleSchedule], [sampleAgent], [sampleWorkspace]]);

    const html = renderToStaticMarkup(await SchedulesPage());

    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/schedules", {
      cache: "no-store",
    });
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/workspaces", {
      cache: "no-store",
    });
    expect(html).toContain("Create and edit schedule");
    expect(html).toContain("Create schedule");
    expect(html).toContain("nightly-docs");
    expect(html).toContain("maintenance-agent");
    expect(html).toContain("Docs Vault");
  });
});

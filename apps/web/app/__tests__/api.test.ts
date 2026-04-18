import { afterEach, describe, expect, it, vi } from "vitest";

import { createRun } from "@/lib/api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api client", () => {
  it("creates a manual dry-run with the expected POST contract", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
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
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 201,
        }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

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
});

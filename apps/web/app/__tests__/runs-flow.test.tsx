import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import DashboardPage from "@/app/page";
import RunDetailPage from "@/app/runs/[runId]/page";
import RunsPage from "@/app/runs/page";
import { I18nProvider } from "@/components/i18n-provider";

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

const sampleRun = {
  id: "run_abc123",
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

describe("runs flow", () => {
  it("renders dashboard recent runs as links to run detail", async () => {
    const fetchMock = mockFetchSequence([
      {
        workspaces: 2,
        agents: 1,
        enabled_schedules: 1,
        execution_enabled: false,
        recent_runs: [sampleRun],
      },
    ]);

    const html = renderToStaticMarkup(
      <I18nProvider>{await DashboardPage()}</I18nProvider>
    );

    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/dashboard/summary", {
      cache: "no-store",
    });
    expect(html).toContain("Recent runs");
    expect(html).toContain('href="/runs/run_abc123"');
    expect(html).toContain("completed");
    expect(html).toContain("dry-run");
  });

  it("renders the runs list with status, trigger, dry-run, and detail links", async () => {
    mockFetchSequence([[sampleRun]]);

    const html = renderToStaticMarkup(<I18nProvider>{await RunsPage()}</I18nProvider>);

    expect(html).toContain("Execution history");
    expect(html).toContain('href="/runs/run_abc123"');
    expect(html).toContain("completed");
    expect(html).toContain("manual");
    expect(html).toContain("yes");
  });

  it("renders run detail with metadata, logs, and artifacts", async () => {
    const fetchMock = mockFetchSequence([
      sampleRun,
      [
        {
          id: "log_1",
          run_id: "run_abc123",
          level: "INFO",
          message: "Simulation complete",
          timestamp: "2026-04-18T09:00:01+00:00",
        },
      ],
      [
        {
          id: "artifact_1",
          run_id: "run_abc123",
          name: "summary.md",
          relative_path: "run_abc123/summary.md",
          media_type: "text/markdown",
          created_at: "2026-04-18T09:00:03+00:00",
        },
      ],
    ]);

    const html = renderToStaticMarkup(
      <I18nProvider>
        {await RunDetailPage({ params: Promise.resolve({ runId: "run_abc123" }) })}
      </I18nProvider>
    );

    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/runs/run_abc123", {
      cache: "no-store",
    });
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/runs/run_abc123/logs", {
      cache: "no-store",
    });
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/runs/run_abc123/artifacts", {
      cache: "no-store",
    });
    expect(html).toContain("Run run_abc123");
    expect(html).toContain("Audit timeline");
    expect(html).toContain("Request received");
    expect(html).toContain("Command captured");
    expect(html).toContain("Dry-run completed");
    expect(html).toContain("Artifacts recorded");
    expect(html).toContain("gh copilot suggest -t maintenance");
    expect(html).toContain("Simulation complete");
    expect(html).toContain("summary.md");
    expect(html).toContain("run_abc123/summary.md");
  });

  it("renders blocked run audit timeline with the decisive reason", async () => {
    mockFetchSequence([
      {
        ...sampleRun,
        dry_run: false,
        status: "blocked",
      },
      [
        {
          id: "log_blocked",
          run_id: "run_abc123",
          level: "ERROR",
          message: "Execution blocked: real execution is disabled globally.",
          timestamp: "2026-04-18T09:00:02+00:00",
        },
      ],
      [],
    ]);

    const html = renderToStaticMarkup(
      <I18nProvider>
        {await RunDetailPage({ params: Promise.resolve({ runId: "run_abc123" }) })}
      </I18nProvider>
    );

    expect(html).toContain("Execution blocked");
    expect(html).toContain("Execution blocked: real execution is disabled globally.");
    expect(html).toContain("Logs");
  });

  it("renders failed run audit timeline with the decisive reason", async () => {
    mockFetchSequence([
      {
        ...sampleRun,
        dry_run: false,
        status: "failed",
      },
      [
        {
          id: "log_failed",
          run_id: "run_abc123",
          level: "ERROR",
          message: "Process exited with code 1.",
          timestamp: "2026-04-18T09:00:02+00:00",
        },
      ],
      [],
    ]);

    const html = renderToStaticMarkup(
      <I18nProvider>
        {await RunDetailPage({ params: Promise.resolve({ runId: "run_abc123" }) })}
      </I18nProvider>
    );

    expect(html).toContain("Execution failed");
    expect(html).toContain("Process exited with code 1.");
    expect(html).toContain("Logs");
  });
});

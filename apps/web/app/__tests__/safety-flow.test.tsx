import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import SafetyPage from "@/app/safety/page";
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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("safety flow", () => {
  it("renders nominal safety posture", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          execution_enabled: false,
          allowed_roots: ["E:/temp"],
          permissive_policies: [],
          active_agents: [],
          active_schedules: [],
          recent_attention_runs: [],
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
        }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const html = renderToStaticMarkup(
      <I18nProvider>{await SafetyPage()}</I18nProvider>
    );

    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/safety/summary", {
      cache: "no-store",
    });
    expect(html).toContain("Safety Center");
    expect(html).toContain("guarded runner, not an OS sandbox");
    expect(html).toContain("E:/temp");
    expect(html).toContain("No attention item in this section.");
    expect(html).toContain('href="/settings"');
  });

  it("renders safety attention items with action links", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            execution_enabled: true,
            allowed_roots: ["E:/temp"],
            permissive_policies: [
              {
                id: "policy_open",
                name: "open-policy",
                allow_write: true,
                allow_network: true,
                allowed_command_prefixes: ["copilot"],
              },
            ],
            active_agents: [
              {
                id: "agent_docs",
                name: "docs-agent",
                runtime: "copilot_cli",
                workspace_id: "ws_docs",
                workspace_name: "Docs Vault",
              },
            ],
            active_schedules: [
              {
                id: "sched_docs",
                name: "nightly-docs",
                mode: "interval",
                workspace_id: "ws_docs",
                workspace_name: "Docs Vault",
                agent_profile_id: "agent_docs",
                agent_name: "docs-agent",
                next_run_at: "2026-04-21T21:00:00+00:00",
              },
            ],
            recent_attention_runs: [
              {
                id: "run_blocked",
                status: "blocked",
                trigger: "manual",
                dry_run: false,
                workspace_id: "ws_docs",
                workspace_name: "Docs Vault",
                agent_profile_id: "agent_docs",
                agent_name: "docs-agent",
                started_at: "2026-04-21T20:00:00+00:00",
              },
            ],
          }),
          {
            headers: { "Content-Type": "application/json" },
            status: 200,
          }
        );
      })
    );

    const html = renderToStaticMarkup(
      <I18nProvider>{await SafetyPage()}</I18nProvider>
    );

    expect(html).toContain("open-policy");
    expect(html).toContain("copilot");
    expect(html).toContain("docs-agent");
    expect(html).toContain("nightly-docs");
    expect(html).toContain("Docs Vault");
    expect(html).toContain("blocked");
    expect(html).toContain('href="/workspaces"');
    expect(html).toContain('href="/schedules"');
    expect(html).toContain('href="/runs/run_blocked"');
  });
});

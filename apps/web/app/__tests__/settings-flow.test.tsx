import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import SettingsPage from "@/app/settings/page";
import { I18nProvider } from "@/components/i18n-provider";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

const settings = [
  {
    key: "runner.execution_enabled",
    value: "false",
    description: "Global switch for real command execution.",
    updated_at: "2026-04-18T09:00:00+00:00",
  },
  {
    key: "storage.retention_days",
    value: "30",
    description: "Default retention period for run artifacts.",
    updated_at: "2026-04-18T09:00:00+00:00",
  },
];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("settings flow", () => {
  it("renders execution control warning and settings table", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify(settings), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const html = renderToStaticMarkup(
      <I18nProvider>{await SettingsPage()}</I18nProvider>
    );

    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/settings", {
      cache: "no-store",
    });
    expect(html).toContain("Execution control");
    expect(html).toContain("Real execution can run local commands");
    expect(html).toContain("Enable real execution globally");
    expect(html).toContain("runner.execution_enabled");
    expect(html).toContain("storage.retention_days");
  });
});

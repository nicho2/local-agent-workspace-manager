import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { I18nProvider } from "@/components/i18n-provider";
import { TopNav } from "@/components/top-nav";

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

describe("TopNav", () => {
  it("links to the main MVP sections including runs", () => {
    const html = renderToStaticMarkup(
      <I18nProvider>
        <TopNav />
      </I18nProvider>
    );

    expect(html).toContain('href="/"');
    expect(html).toContain('href="/workspaces"');
    expect(html).toContain('href="/schedules"');
    expect(html).toContain('href="/runs"');
    expect(html).toContain('href="/safety"');
    expect(html).toContain('href="/settings"');
  });
});

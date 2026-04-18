import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

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
    const html = renderToStaticMarkup(<TopNav />);

    expect(html).toContain('href="/"');
    expect(html).toContain('href="/workspaces"');
    expect(html).toContain('href="/schedules"');
    expect(html).toContain('href="/runs"');
    expect(html).toContain('href="/settings"');
  });
});

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { adminTabs, getAdjacentAdminTab } from "@/lib/admin-tabs";

describe("workspace admin tabs", () => {
  it("defines workspace, policy, and agent tabs in order", () => {
    expect(adminTabs.map((tab) => tab.id)).toEqual(["workspace", "policy", "agent"]);
    expect(adminTabs.map((tab) => tab.labelKey)).toEqual([
      "admin.workspace",
      "admin.policy",
      "admin.agent",
    ]);
  });

  it("supports keyboard-style forward and backward navigation", () => {
    expect(getAdjacentAdminTab("workspace", "next")).toBe("policy");
    expect(getAdjacentAdminTab("policy", "next")).toBe("agent");
    expect(getAdjacentAdminTab("agent", "next")).toBe("workspace");
    expect(getAdjacentAdminTab("workspace", "previous")).toBe("agent");
  });

  it("keeps inactive tab panels hidden in CSS", () => {
    const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");

    expect(css).toContain(".tab-panel[hidden]");
    expect(css).toContain("display: none;");
  });
});

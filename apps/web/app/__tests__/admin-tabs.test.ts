import { describe, expect, it } from "vitest";

import { adminTabs, getAdjacentAdminTab } from "@/lib/admin-tabs";

describe("workspace admin tabs", () => {
  it("defines workspace, policy, and agent tabs in order", () => {
    expect(adminTabs.map((tab) => tab.id)).toEqual(["workspace", "policy", "agent"]);
  });

  it("supports keyboard-style forward and backward navigation", () => {
    expect(getAdjacentAdminTab("workspace", "next")).toBe("policy");
    expect(getAdjacentAdminTab("policy", "next")).toBe("agent");
    expect(getAdjacentAdminTab("agent", "next")).toBe("workspace");
    expect(getAdjacentAdminTab("workspace", "previous")).toBe("agent");
  });
});

export type AdminTabId = "workspace" | "policy" | "agent";

export interface AdminTab {
  id: AdminTabId;
  label: string;
}

export const adminTabs: AdminTab[] = [
  { id: "workspace", label: "Workspace" },
  { id: "policy", label: "Policy" },
  { id: "agent", label: "Agent" },
];

export function getAdjacentAdminTab(
  currentTab: AdminTabId,
  direction: "next" | "previous"
): AdminTabId {
  const currentIndex = adminTabs.findIndex((tab) => tab.id === currentTab);
  const step = direction === "next" ? 1 : -1;
  const nextIndex = (currentIndex + step + adminTabs.length) % adminTabs.length;
  return adminTabs[nextIndex].id;
}

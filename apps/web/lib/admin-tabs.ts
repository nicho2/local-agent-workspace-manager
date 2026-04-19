import type { TranslationKey } from "@/lib/i18n";

export type AdminTabId = "workspace" | "policy" | "agent";

export interface AdminTab {
  id: AdminTabId;
  labelKey: TranslationKey;
}

export const adminTabs: AdminTab[] = [
  { id: "workspace", labelKey: "admin.workspace" },
  { id: "policy", labelKey: "admin.policy" },
  { id: "agent", labelKey: "admin.agent" },
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

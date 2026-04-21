"use client";

import Link from "next/link";
import type { ReactElement } from "react";

import { useI18n } from "@/components/i18n-provider";
import type { TranslationKey } from "@/lib/i18n";

const items = [
  { href: "/", labelKey: "nav.dashboard" },
  { href: "/workspaces", labelKey: "nav.workspaces" },
  { href: "/schedules", labelKey: "nav.schedules" },
  { href: "/runs", labelKey: "nav.runs" },
  { href: "/safety", labelKey: "nav.safety" },
  { href: "/settings", labelKey: "nav.settings" },
] satisfies Array<{
  href: string;
  labelKey: TranslationKey;
}>;

export function TopNav(): ReactElement {
  const { t } = useI18n();

  return (
    <nav className="top-nav">
      {items.map((item) => (
        <Link key={item.href} href={item.href}>
          {t(item.labelKey)}
        </Link>
      ))}
    </nav>
  );
}

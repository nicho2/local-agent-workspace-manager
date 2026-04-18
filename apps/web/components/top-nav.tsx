import Link from "next/link";
import type { ReactElement } from "react";

const items = [
  { href: "/", label: "Dashboard" },
  { href: "/workspaces", label: "Workspaces" },
  { href: "/schedules", label: "Schedules" },
  { href: "/runs", label: "Runs" },
  { href: "/settings", label: "Settings" },
];

export function TopNav(): ReactElement {
  return (
    <nav className="top-nav">
      {items.map((item) => (
        <Link key={item.href} href={item.href}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

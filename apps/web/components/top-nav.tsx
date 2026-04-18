import Link from "next/link";

const items = [
  { href: "/", label: "Dashboard" },
  { href: "/workspaces", label: "Workspaces" },
  { href: "/schedules", label: "Schedules" },
  { href: "/settings", label: "Settings" },
];

export function TopNav(): JSX.Element {
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

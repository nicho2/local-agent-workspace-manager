import "./globals.css";
import type { Metadata } from "next";

import { TopNav } from "@/components/top-nav";

export const metadata: Metadata = {
  title: "Local Agent Workspace Manager",
  description: "Control plane for local AI-agent workspaces",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): JSX.Element {
  return (
    <html lang="en">
      <body>
        <div className="page-shell">
          <TopNav />
          {children}
        </div>
      </body>
    </html>
  );
}

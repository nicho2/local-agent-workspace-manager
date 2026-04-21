import Link from "next/link";
import type { ReactElement } from "react";

import { GuidedWorkspaceWizard } from "@/components/guided-workspace-wizard";
import { T } from "@/components/i18n-provider";
import { getRuntimePresets, getWorkspaceAllowedRoots } from "@/lib/api";

export default async function GuidedWorkspacePage(): Promise<ReactElement> {
  const [runtimePresets, workspaceAllowedRoots] = await Promise.all([
    getRuntimePresets(),
    getWorkspaceAllowedRoots(),
  ]);

  return (
    <main className="stack">
      <div className="page-heading-row">
        <div>
          <h1 className="page-title">
            <T k="guided.title" />
          </h1>
          <p className="page-subtitle">
            <T k="guided.subtitle" />
          </p>
        </div>
        <Link className="button-link" href="/workspaces">
          <T k="guided.backToWorkspaces" />
        </Link>
      </div>

      <GuidedWorkspaceWizard
        runtimePresets={runtimePresets}
        workspaceAllowedRoots={workspaceAllowedRoots.allowed_roots}
      />
    </main>
  );
}

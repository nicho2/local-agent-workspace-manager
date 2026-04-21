import type { ReactElement } from "react";

import { T } from "@/components/i18n-provider";
import { WorkspaceAdminForms } from "@/components/workspace-admin-forms";
import { WorkspaceTable } from "@/components/workspace-table";
import {
  getAgents,
  getPolicies,
  getRuntimePresets,
  getWorkspaceAllowedRoots,
  getWorkspaces,
} from "@/lib/api";

export default async function WorkspacesPage(): Promise<ReactElement> {
  const [workspaces, policies, agents, runtimePresets, workspaceAllowedRoots] = await Promise.all([
    getWorkspaces(),
    getPolicies(),
    getAgents(),
    getRuntimePresets(),
    getWorkspaceAllowedRoots(),
  ]);

  return (
    <main className="stack">
      <div>
        <h1 className="page-title">
          <T k="workspaces.title" />
        </h1>
        <p className="page-subtitle">
          <T k="workspaces.subtitle" />
        </p>
      </div>

      <WorkspaceAdminForms
        agents={agents}
        policies={policies}
        runtimePresets={runtimePresets}
        workspaceAllowedRoots={workspaceAllowedRoots.allowed_roots}
        workspaces={workspaces}
      />
      <WorkspaceTable
        allowedRoots={workspaceAllowedRoots.allowed_roots}
        workspaces={workspaces}
      />
    </main>
  );
}

import type { ReactElement } from "react";

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
        <h1 className="page-title">Workspaces</h1>
        <p className="page-subtitle">
          Each workspace is an explicit execution boundary with an attached policy.
        </p>
      </div>

      <WorkspaceAdminForms
        agents={agents}
        policies={policies}
        runtimePresets={runtimePresets}
        workspaceAllowedRoots={workspaceAllowedRoots.allowed_roots}
        workspaces={workspaces}
      />
      <WorkspaceTable workspaces={workspaces} />
    </main>
  );
}

import type { ReactElement } from "react";

import { WorkspaceTable } from "@/components/workspace-table";
import { getWorkspaces } from "@/lib/api";

export default async function WorkspacesPage(): Promise<ReactElement> {
  const workspaces = await getWorkspaces();

  return (
    <main className="stack">
      <div>
        <h1 className="page-title">Workspaces</h1>
        <p className="page-subtitle">
          Each workspace is an explicit execution boundary with an attached policy.
        </p>
      </div>

      <WorkspaceTable workspaces={workspaces} />
    </main>
  );
}

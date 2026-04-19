import type { ReactElement } from "react";
import Link from "next/link";

import { T } from "@/components/i18n-provider";
import type { Workspace } from "@/lib/types";

interface WorkspaceTableProps {
  workspaces: Workspace[];
}

export function WorkspaceTable({ workspaces }: WorkspaceTableProps): ReactElement {
  return (
    <section className="card">
      <h3>
        <T k="workspaces.title" />
      </h3>
      <table>
        <thead>
          <tr>
            <th>
              <T k="table.name" />
            </th>
            <th>Slug</th>
            <th>
              <T k="admin.rootPath" />
            </th>
            <th>
              <T k="table.status" />
            </th>
            <th>Tags</th>
          </tr>
        </thead>
        <tbody>
          {workspaces.map((workspace) => (
            <tr key={workspace.id}>
              <td>
                <Link className="table-link" href={`/workspaces/${workspace.id}`}>
                  {workspace.name}
                </Link>
              </td>
              <td>{workspace.slug}</td>
              <td>
                <code>{workspace.root_path}</code>
              </td>
              <td>
                <span className="badge">{workspace.status}</span>
              </td>
              <td>{workspace.tags.join(", ") || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

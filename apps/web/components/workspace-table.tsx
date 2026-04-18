import type { Workspace } from "@/lib/types";

interface WorkspaceTableProps {
  workspaces: Workspace[];
}

export function WorkspaceTable({ workspaces }: WorkspaceTableProps): JSX.Element {
  return (
    <section className="card">
      <h3>Workspaces</h3>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Slug</th>
            <th>Root path</th>
            <th>Status</th>
            <th>Tags</th>
          </tr>
        </thead>
        <tbody>
          {workspaces.map((workspace) => (
            <tr key={workspace.id}>
              <td>{workspace.name}</td>
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

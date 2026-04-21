import Link from "next/link";
import type { ReactElement } from "react";

import { EmptyState } from "@/components/empty-state";
import { T } from "@/components/i18n-provider";
import type { Workspace } from "@/lib/types";

interface WorkspaceTableProps {
  allowedRoots?: string[];
  workspaces: Workspace[];
}

export function WorkspaceTable({
  allowedRoots = [],
  workspaces,
}: WorkspaceTableProps): ReactElement {
  return (
    <section className="card">
      <h3>
        <T k="workspaces.title" />
      </h3>
      {workspaces.length === 0 ? (
        <EmptyState
          actions={[
            { href: "/settings", label: <T k="onboarding.reviewSettings" /> },
            { href: "/safety", label: <T k="onboarding.reviewSafety" /> },
          ]}
          title={<T k="onboarding.title" />}
        >
          <p>
            <T k="onboarding.workspaceEmpty" />
          </p>
          <p>
            <T k="onboarding.dryRunReminder" />
          </p>
          {allowedRoots.length > 0 ? (
            <div>
              <strong>
                <T k="onboarding.allowedRoots" />
              </strong>
              <ul className="inline-code-list">
                {allowedRoots.map((root) => (
                  <li key={root}>
                    <code>{root}</code>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <p>
            <strong>
              <T k="onboarding.seedDemo" />
            </strong>
            : <code>py -3.12 scripts/seed_demo.py</code>
          </p>
        </EmptyState>
      ) : (
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
                <td>{workspace.tags.join(", ") || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

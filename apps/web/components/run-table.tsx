import Link from "next/link";
import type { ReactElement } from "react";

import { T } from "@/components/i18n-provider";
import type { Run } from "@/lib/types";

interface RunTableProps {
  runs: Run[];
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

export function RunTable({ runs }: RunTableProps): ReactElement {
  return (
    <table>
      <thead>
        <tr>
          <th>Run</th>
          <th>
            <T k="table.status" />
          </th>
          <th>
            <T k="table.trigger" />
          </th>
          <th>
            <T k="table.dryRun" />
          </th>
          <th>
            <T k="table.started" />
          </th>
        </tr>
      </thead>
      <tbody>
        {runs.map((run) => (
          <tr key={run.id}>
            <td>
              <Link className="table-link" href={`/runs/${run.id}`}>
                {run.id}
              </Link>
            </td>
            <td>
              <span className={`badge badge-${run.status}`}>{run.status}</span>
            </td>
            <td>{run.trigger}</td>
            <td>{run.dry_run ? <T k="common.yes" /> : <T k="common.no" />}</td>
            <td>{formatDateTime(run.started_at)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

import Link from "next/link";
import type { ReactElement } from "react";

import { RunAuditTimeline } from "@/components/run-audit-timeline";
import { getRun, getRunArtifacts, getRunLogs } from "@/lib/api";

interface RunDetailPageProps {
  params: Promise<{
    runId: string;
  }>;
}

function formatDateTime(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleString() : "pending";
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to load run detail.";
}

export default async function RunDetailPage({
  params,
}: RunDetailPageProps): Promise<ReactElement> {
  const { runId } = await params;

  try {
    const [run, logs, artifacts] = await Promise.all([
      getRun(runId),
      getRunLogs(runId),
      getRunArtifacts(runId),
    ]);

    return (
      <main className="stack">
        <div className="page-heading-row">
          <div>
            <h1 className="page-title">Run {run.id}</h1>
            <p className="page-subtitle">
              {run.trigger} request from {run.requested_by}
            </p>
          </div>
          <Link className="button-link" href="/runs">
            Back to runs
          </Link>
        </div>

        <section className="card detail-grid">
          <div>
            <div className="muted">Status</div>
            <span className={`badge badge-${run.status}`}>{run.status}</span>
          </div>
          <div>
            <div className="muted">Trigger</div>
            <strong>{run.trigger}</strong>
          </div>
          <div>
            <div className="muted">Dry-run</div>
            <strong>{run.dry_run ? "yes" : "no"}</strong>
          </div>
          <div>
            <div className="muted">Started</div>
            <strong>{formatDateTime(run.started_at)}</strong>
          </div>
          <div>
            <div className="muted">Finished</div>
            <strong>{formatDateTime(run.finished_at)}</strong>
          </div>
        </section>

        <section className="card">
          <h3>Command preview</h3>
          <pre className="code-block">{run.command_preview}</pre>
        </section>

        <RunAuditTimeline artifacts={artifacts} logs={logs} run={run} />

        <section className="card">
          <h3>Logs</h3>
          {logs.length === 0 ? (
            <p className="muted">No logs recorded.</p>
          ) : (
            <div className="log-list">
              {logs.map((log) => (
                <div className="log-row" key={log.id}>
                  <span>{formatDateTime(log.timestamp)}</span>
                  <span className="badge">{log.level}</span>
                  <span>{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <h3>Artifacts</h3>
          {artifacts.length === 0 ? (
            <p className="muted">No artifacts recorded.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Media type</th>
                  <th>Relative path</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {artifacts.map((artifact) => (
                  <tr key={artifact.id}>
                    <td>{artifact.name}</td>
                    <td>{artifact.media_type}</td>
                    <td>
                      <code>{artifact.relative_path}</code>
                    </td>
                    <td>{formatDateTime(artifact.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    );
  } catch (error) {
    return (
      <main className="stack">
        <div className="page-heading-row">
          <div>
            <h1 className="page-title">Run {runId}</h1>
            <p className="page-subtitle">Run detail is not available.</p>
          </div>
          <Link className="button-link" href="/runs">
            Back to runs
          </Link>
        </div>
        <section className="card">
          <h3>Unable to load run</h3>
          <p className="muted">{getErrorMessage(error)}</p>
        </section>
      </main>
    );
  }
}

"use client";

import type { ReactElement } from "react";
import { useEffect, useState } from "react";

import { getRunEventsUrl } from "@/lib/api";
import type { Run, RunLog } from "@/lib/types";

interface RunLivePanelProps {
  initialLogs: RunLog[];
  initialRun: Run;
}

function formatDateTime(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleString() : "pending";
}

function isTerminal(status: Run["status"]): boolean {
  return status === "completed" || status === "failed" || status === "blocked";
}

export function RunLivePanel({
  initialLogs,
  initialRun,
}: RunLivePanelProps): ReactElement {
  const [run, setRun] = useState(initialRun);
  const [logs, setLogs] = useState(initialLogs);
  const [streamState, setStreamState] = useState(
    isTerminal(initialRun.status) ? "closed" : "connecting"
  );

  useEffect(() => {
    if (isTerminal(initialRun.status) || typeof EventSource === "undefined") {
      return;
    }

    const source = new EventSource(getRunEventsUrl(initialRun.id));
    setStreamState("connected");

    source.addEventListener("run", (event) => {
      const nextRun = JSON.parse((event as MessageEvent).data) as Run;
      setRun(nextRun);
      if (isTerminal(nextRun.status)) {
        setStreamState("closed");
        source.close();
      }
    });

    source.addEventListener("log", (event) => {
      const nextLog = JSON.parse((event as MessageEvent).data) as RunLog;
      setLogs((currentLogs) =>
        currentLogs.some((log) => log.id === nextLog.id)
          ? currentLogs
          : [...currentLogs, nextLog]
      );
    });

    source.onerror = () => {
      setStreamState("reconnecting");
    };

    return () => {
      source.close();
    };
  }, [initialRun.id, initialRun.status]);

  return (
    <>
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
        <div>
          <div className="muted">Exit code</div>
          <strong>{run.exit_code ?? "pending"}</strong>
        </div>
      </section>

      {!isTerminal(run.status) ? (
        <section className="warning-panel">
          <strong>Live logs</strong>
          <p className="muted">Run is {run.status}; stream is {streamState}.</p>
        </section>
      ) : null}

      <section className="card">
        <h3>Logs</h3>
        {logs.length === 0 ? (
          <p className="muted">No logs recorded yet.</p>
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
    </>
  );
}

import type { ReactElement } from "react";

import { RunTable } from "@/components/run-table";
import { getRuns } from "@/lib/api";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to load runs.";
}

export default async function RunsPage(): Promise<ReactElement> {
  try {
    const runs = await getRuns();

    return (
      <main className="stack">
        <div>
          <h1 className="page-title">Runs</h1>
          <p className="page-subtitle">
            Execution history with status, trigger, logs, and artifacts.
          </p>
        </div>

        <section className="card">
          <h3>Recent runs</h3>
          {runs.length === 0 ? <p className="muted">No runs yet.</p> : <RunTable runs={runs} />}
        </section>
      </main>
    );
  } catch (error) {
    return (
      <main className="stack">
        <div>
          <h1 className="page-title">Runs</h1>
          <p className="page-subtitle">Execution history is not available.</p>
        </div>
        <section className="card">
          <h3>Unable to load runs</h3>
          <p className="muted">{getErrorMessage(error)}</p>
        </section>
      </main>
    );
  }
}

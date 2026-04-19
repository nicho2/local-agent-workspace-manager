import type { ReactElement } from "react";

import { T } from "@/components/i18n-provider";
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
          <h1 className="page-title">
            <T k="runs.title" />
          </h1>
          <p className="page-subtitle">
            <T k="runs.subtitle" />
          </p>
        </div>

        <section className="card">
          <h3>
            <T k="dashboard.recentRuns" />
          </h3>
          {runs.length === 0 ? (
            <p className="muted">
              <T k="dashboard.noRuns" />
            </p>
          ) : (
            <RunTable runs={runs} />
          )}
        </section>
      </main>
    );
  } catch (error) {
    return (
      <main className="stack">
        <div>
          <h1 className="page-title">
            <T k="runs.title" />
          </h1>
          <p className="page-subtitle">
            <T k="runs.unavailable" />
          </p>
        </div>
        <section className="card">
          <h3>
            <T k="runs.unableToLoad" />
          </h3>
          <p className="muted">{getErrorMessage(error)}</p>
        </section>
      </main>
    );
  }
}

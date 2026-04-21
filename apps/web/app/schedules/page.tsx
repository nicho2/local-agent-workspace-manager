import type { ReactElement } from "react";

import { EmptyState } from "@/components/empty-state";
import { T } from "@/components/i18n-provider";
import { ScheduleAdminForm } from "@/components/schedule-admin-form";
import { getAgents, getSchedules, getWorkspaces } from "@/lib/api";

export default async function SchedulesPage(): Promise<ReactElement> {
  const [schedules, agents, workspaces] = await Promise.all([
    getSchedules(),
    getAgents(),
    getWorkspaces(),
  ]);
  const agentById = new Map(agents.map((agent) => [agent.id, agent.name]));

  return (
    <main className="stack">
      <div>
        <h1 className="page-title">
          <T k="schedules.title" />
        </h1>
        <p className="page-subtitle">
          <T k="schedules.subtitle" />
        </p>
      </div>

      <ScheduleAdminForm agents={agents} schedules={schedules} workspaces={workspaces} />
      <section className="card">
        <h3>
          <T k="schedules.configured" />
        </h3>
        {schedules.length === 0 ? (
          <EmptyState
            actions={[
              { href: "/workspaces", label: <T k="onboarding.createWorkspace" /> },
              { href: "/safety", label: <T k="onboarding.reviewSafety" /> },
            ]}
            title={<T k="schedules.none" />}
          >
            <p>
              <T k="onboarding.schedulesEmpty" />
            </p>
            <p>
              <T k="onboarding.dryRunReminder" />
            </p>
          </EmptyState>
        ) : (
          <table>
            <thead>
              <tr>
                <th>
                  <T k="table.name" />
                </th>
                <th>
                  <T k="table.mode" />
                </th>
                <th>
                  <T k="table.agent" />
                </th>
                <th>
                  <T k="table.enabled" />
                </th>
                <th>
                  <T k="table.nextRun" />
                </th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((schedule) => (
                <tr key={schedule.id}>
                  <td>{schedule.name}</td>
                  <td>{schedule.mode}</td>
                  <td>{agentById.get(schedule.agent_profile_id) ?? schedule.agent_profile_id}</td>
                  <td>{schedule.enabled ? <T k="common.yes" /> : <T k="common.no" />}</td>
                  <td>{schedule.next_run_at ? new Date(schedule.next_run_at).toLocaleString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

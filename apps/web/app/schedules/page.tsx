import type { ReactElement } from "react";

import { getAgents, getSchedules } from "@/lib/api";

export default async function SchedulesPage(): Promise<ReactElement> {
  const [schedules, agents] = await Promise.all([getSchedules(), getAgents()]);
  const agentById = new Map(agents.map((agent) => [agent.id, agent.name]));

  return (
    <main className="stack">
      <div>
        <h1 className="page-title">Schedules</h1>
        <p className="page-subtitle">
          Interval and cron-like automation will expand here.
        </p>
      </div>

      <section className="card">
        <h3>Configured schedules</h3>
        {schedules.length === 0 ? (
          <p className="muted">No schedules yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Mode</th>
                <th>Agent</th>
                <th>Enabled</th>
                <th>Next run</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((schedule) => (
                <tr key={schedule.id}>
                  <td>{schedule.name}</td>
                  <td>{schedule.mode}</td>
                  <td>{agentById.get(schedule.agent_profile_id) ?? schedule.agent_profile_id}</td>
                  <td>{schedule.enabled ? "yes" : "no"}</td>
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

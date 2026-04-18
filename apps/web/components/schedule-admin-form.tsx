"use client";

import { useRouter } from "next/navigation";
import type { FormEvent, ReactElement } from "react";
import { useMemo, useState } from "react";

import { ApiRequestError, createSchedule, updateSchedule } from "@/lib/api";
import type { AgentProfile, Schedule, Workspace } from "@/lib/types";

interface ScheduleAdminFormProps {
  agents: AgentProfile[];
  schedules: Schedule[];
  workspaces: Workspace[];
}

function formatError(error: unknown): string {
  if (error instanceof ApiRequestError && error.error) {
    return error.error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Request failed.";
}

function optionalNumber(value: FormDataEntryValue | null): number | null {
  const text = String(value ?? "").trim();
  return text.length > 0 ? Number(text) : null;
}

function optionalText(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

export function ScheduleAdminForm({
  agents,
  schedules,
  workspaces,
}: ScheduleAdminFormProps): ReactElement {
  const router = useRouter();
  const [scheduleId, setScheduleId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectedSchedule = useMemo(
    () => schedules.find((schedule) => schedule.id === scheduleId),
    [scheduleId, schedules]
  );

  async function submitSchedule(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const mode = String(formData.get("mode") ?? "interval") as Schedule["mode"];
    const payload = {
      agent_profile_id: String(formData.get("agent_profile_id") ?? ""),
      cron_expression: optionalText(formData.get("cron_expression")),
      enabled: formData.get("enabled") === "on",
      interval_minutes: optionalNumber(formData.get("interval_minutes")),
      mode,
      name: String(formData.get("name") ?? ""),
      workspace_id: String(formData.get("workspace_id") ?? ""),
    };

    try {
      if (selectedSchedule) {
        await updateSchedule(selectedSchedule.id, payload);
        setMessage("Schedule updated.");
      } else {
        await createSchedule(payload);
        setMessage("Schedule created.");
      }
      router.refresh();
    } catch (requestError) {
      setError(formatError(requestError));
    }
  }

  return (
    <section className="card">
      <h3>Create and edit schedule</h3>
      <p className="muted">Interval schedules compute the next run; cron remains limited in MVP.</p>
      {message ? <p className="success-text">{message}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      <form className="form-grid" key={scheduleId || "new-schedule"} onSubmit={submitSchedule}>
        <label className="field-label" htmlFor="schedule-select">
          Edit existing
        </label>
        <select
          id="schedule-select"
          onChange={(event) => setScheduleId(event.target.value)}
          value={scheduleId}
        >
          <option value="">New schedule</option>
          {schedules.map((schedule) => (
            <option key={schedule.id} value={schedule.id}>
              {schedule.name}
            </option>
          ))}
        </select>

        <label className="field-label" htmlFor="schedule-name">
          Name
        </label>
        <input defaultValue={selectedSchedule?.name ?? ""} id="schedule-name" name="name" />

        <label className="field-label" htmlFor="schedule-workspace">
          Workspace
        </label>
        <select
          defaultValue={selectedSchedule?.workspace_id ?? workspaces[0]?.id ?? ""}
          id="schedule-workspace"
          name="workspace_id"
        >
          {workspaces.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.name}
            </option>
          ))}
        </select>

        <label className="field-label" htmlFor="schedule-agent">
          Agent
        </label>
        <select
          defaultValue={selectedSchedule?.agent_profile_id ?? agents[0]?.id ?? ""}
          id="schedule-agent"
          name="agent_profile_id"
        >
          {agents.map((agent) => (
            <option disabled={!agent.is_active} key={agent.id} value={agent.id}>
              {agent.name} {agent.is_active ? "" : "(inactive)"}
            </option>
          ))}
        </select>

        <label className="field-label" htmlFor="schedule-mode">
          Mode
        </label>
        <select defaultValue={selectedSchedule?.mode ?? "interval"} id="schedule-mode" name="mode">
          <option value="interval">interval</option>
          <option value="cron">cron</option>
        </select>

        <label className="field-label" htmlFor="schedule-interval">
          Interval minutes
        </label>
        <input
          defaultValue={selectedSchedule?.interval_minutes ?? 60}
          id="schedule-interval"
          min={5}
          name="interval_minutes"
          type="number"
        />

        <label className="field-label" htmlFor="schedule-cron">
          Cron expression
        </label>
        <input
          defaultValue={selectedSchedule?.cron_expression ?? ""}
          id="schedule-cron"
          name="cron_expression"
          placeholder="0 8 * * *"
        />

        <label className="checkbox-row">
          <input defaultChecked={selectedSchedule?.enabled ?? true} name="enabled" type="checkbox" />
          Enabled
        </label>

        <button className="primary-button" type="submit">
          {selectedSchedule ? "Update schedule" : "Create schedule"}
        </button>
      </form>
    </section>
  );
}

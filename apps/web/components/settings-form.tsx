"use client";

import { useRouter } from "next/navigation";
import type { FormEvent, ReactElement } from "react";
import { useState } from "react";

import { ApiRequestError, updateSetting } from "@/lib/api";
import type { SystemSetting } from "@/lib/types";

interface SettingsFormProps {
  settings: SystemSetting[];
}

function formatError(error: unknown): string {
  if (error instanceof ApiRequestError && error.error) {
    return error.error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Setting update failed.";
}

export function SettingsForm({ settings }: SettingsFormProps): ReactElement {
  const router = useRouter();
  const runnerSetting = settings.find((setting) => setting.key === "runner.execution_enabled");
  const [executionEnabled, setExecutionEnabled] = useState(runnerSetting?.value === "true");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submitExecutionSetting(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await updateSetting("runner.execution_enabled", {
        value: executionEnabled ? "true" : "false",
      });
      setMessage("Execution setting updated.");
      router.refresh();
    } catch (requestError) {
      setError(formatError(requestError));
    }
  }

  return (
    <section className="card">
      <h3>Execution control</h3>
      <p className="warning-panel">
        Real execution can run local commands inside allowed workspaces. Keep it disabled unless
        policies and command prefixes have been reviewed.
      </p>
      {message ? <p className="success-text">{message}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      <form className="form-grid" onSubmit={submitExecutionSetting}>
        <label className="checkbox-row">
          <input
            checked={executionEnabled}
            onChange={(event) => setExecutionEnabled(event.target.checked)}
            type="checkbox"
          />
          Enable real execution globally
        </label>
        <p className="muted">
          Current value: {runnerSetting?.value ?? "missing"}; updated{" "}
          {runnerSetting ? new Date(runnerSetting.updated_at).toLocaleString() : "never"}.
        </p>
        <button className="primary-button" type="submit">
          Save execution setting
        </button>
      </form>
    </section>
  );
}

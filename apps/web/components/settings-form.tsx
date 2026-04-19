"use client";

import { useRouter } from "next/navigation";
import type { FormEvent, ReactElement } from "react";
import { useState } from "react";

import { useI18n } from "@/components/i18n-provider";
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
  const { t } = useI18n();
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
      setMessage(t("settings.updatedMessage"));
      router.refresh();
    } catch (requestError) {
      setError(formatError(requestError));
    }
  }

  return (
    <section className="card">
      <h3>{t("settings.executionControl")}</h3>
      <p className="warning-panel">
        {t("settings.warning")}
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
          {t("settings.enableExecution")}
        </label>
        <p className="muted">
          {t("settings.currentValue")}: {runnerSetting?.value ?? t("settings.missing")};{" "}
          {t("settings.updated")}{" "}
          {runnerSetting ? new Date(runnerSetting.updated_at).toLocaleString() : t("settings.never")}.
        </p>
        <button className="primary-button" type="submit">
          {t("settings.save")}
        </button>
      </form>
    </section>
  );
}

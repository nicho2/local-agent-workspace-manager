"use client";

import { useRouter } from "next/navigation";
import type { FormEvent, ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { ApiRequestError, createRun, createRunPreview } from "@/lib/api";
import type { AgentProfile, RunPreview } from "@/lib/types";

interface ManualRunFormProps {
  workspaceId: string;
  agents: AgentProfile[];
  executionEnabled: boolean;
}

function formatError(error: unknown, fallback: string): string {
  if (error instanceof ApiRequestError && error.error) {
    const details = Object.entries(error.error.details)
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join(", ");
    return details ? `${error.error.message} (${details})` : error.error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

export function ManualRunForm({
  workspaceId,
  agents,
  executionEnabled,
}: ManualRunFormProps): ReactElement {
  const router = useRouter();
  const { t } = useI18n();
  const activeAgents = useMemo(() => agents.filter((agent) => agent.is_active), [agents]);
  const [agentProfileId, setAgentProfileId] = useState(activeAgents[0]?.id ?? "");
  const [dryRun, setDryRun] = useState(true);
  const [confirmRealExecution, setConfirmRealExecution] = useState(false);
  const [preview, setPreview] = useState<RunPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!agentProfileId) {
      setPreview(null);
      return;
    }

    let ignorePreview = false;
    setIsPreviewLoading(true);
    setPreviewError(null);

    createRunPreview({
      agent_profile_id: agentProfileId,
      dry_run: dryRun,
      requested_by: "web-ui",
      trigger: "manual",
      workspace_id: workspaceId,
    })
      .then((nextPreview) => {
        if (!ignorePreview) {
          setPreview(nextPreview);
        }
      })
      .catch((previewRequestError: unknown) => {
        if (!ignorePreview) {
          setPreview(null);
          setPreviewError(formatError(previewRequestError, t("manualRun.createFailed")));
        }
      })
      .finally(() => {
        if (!ignorePreview) {
          setIsPreviewLoading(false);
        }
      });

    return () => {
      ignorePreview = true;
    };
  }, [agentProfileId, dryRun, t, workspaceId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!agentProfileId) {
      setErrorMessage(t("manualRun.chooseActiveAgent"));
      return;
    }
    if (!dryRun && !confirmRealExecution) {
      setErrorMessage(t("manualRun.confirmRealExecution"));
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const run = await createRun({
        agent_profile_id: agentProfileId,
        dry_run: dryRun,
        requested_by: "web-ui",
        trigger: "manual",
        workspace_id: workspaceId,
      });
      router.push(`/runs/${run.id}`);
    } catch (error) {
      setErrorMessage(formatError(error, t("manualRun.createFailed")));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <label className="field-label" htmlFor="manual-run-agent">
        {t("runPreview.agent")}
      </label>
      <select
        id="manual-run-agent"
        name="agent_profile_id"
        onChange={(event) => {
          setAgentProfileId(event.target.value);
          setConfirmRealExecution(false);
        }}
        value={agentProfileId}
      >
        {agents.length === 0 ? <option value="">{t("manualRun.noAgent")}</option> : null}
        {agents.map((agent) => (
          <option disabled={!agent.is_active} key={agent.id} value={agent.id}>
            {agent.name} {agent.is_active ? "" : `(${t("manualRun.inactive")})`}
          </option>
        ))}
      </select>

      <label className="checkbox-row">
        <input
          checked={dryRun}
          name="dry_run"
          onChange={(event) => {
            setDryRun(event.target.checked);
            setConfirmRealExecution(false);
          }}
          type="checkbox"
        />
        {t("common.dryRun")}
      </label>

      <section className="warning-panel">
        <h4>{t("runPreview.title")}</h4>
        {isPreviewLoading ? <p>{t("runPreview.loading")}</p> : null}
        {previewError ? <p className="error-text">{previewError}</p> : null}
        {preview ? (
          <div className="preview-grid">
            <div>
              <div className="muted">{t("runPreview.workspace")}</div>
              <strong>{preview.workspace_name}</strong>
              <div>{preview.workspace_slug}</div>
              <code>{preview.workspace_root_path}</code>
            </div>
            <div>
              <div className="muted">{t("runPreview.agent")}</div>
              <strong>{preview.agent_name}</strong>
              <div>{preview.agent_runtime}</div>
            </div>
            <div>
              <div className="muted">{t("runPreview.mode")}</div>
              <strong>
                {preview.dry_run ? t("common.dryRun") : t("runPreview.realExecutionRequested")}
              </strong>
            </div>
            <div>
              <div className="muted">{t("runPreview.policy")}</div>
              <strong>{preview.policy_name}</strong>
              <div>
                {t("runPreview.write")}:{" "}
                {preview.allow_write ? t("common.allowed") : t("common.denied")}
              </div>
              <div>
                {t("runPreview.network")}:{" "}
                {preview.allow_network ? t("common.allowed") : t("common.denied")}
              </div>
            </div>
            <div>
              <div className="muted">{t("runPreview.allowedPrefixes")}</div>
              <code>{preview.allowed_command_prefixes.join(", ") || t("common.none")}</code>
            </div>
            <div>
              <div className="muted">{t("runPreview.exactCommand")}</div>
              <code>{preview.command_preview}</code>
            </div>
            <p className="preview-wide">
              {t("runPreview.agent")} <strong>{preview.agent_name}</strong>{" "}
              {t("runPreview.launchesInWorkspace")}{" "}
              <strong>{preview.workspace_name}</strong>.
            </p>
            {preview.blocking_reasons.length > 0 ? (
              <div className="preview-wide">
                <div className="muted">{t("runPreview.blockingReasons")}</div>
                <ul>
                  {preview.blocking_reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      {!dryRun ? (
        <label className="checkbox-row warning-panel">
          <input
            checked={confirmRealExecution}
            onChange={(event) => setConfirmRealExecution(event.target.checked)}
            type="checkbox"
          />
          {t("runPreview.realExecutionAcknowledgement")}
        </label>
      ) : null}

      <p className="muted">
        {t("manualRun.realExecution")}{" "}
        {executionEnabled ? t("manualRun.enabledGlobally") : t("manualRun.disabledGlobally")};{" "}
        {t("manualRun.dryRunDefault")}
      </p>

      {errorMessage ? <p className="error-text">{errorMessage}</p> : null}

      <button
        className="primary-button"
        disabled={isSubmitting || activeAgents.length === 0 || (!dryRun && !confirmRealExecution)}
        type="submit"
      >
        {isSubmitting
          ? t("manualRun.launching")
          : dryRun
            ? t("manualRun.launchDryRun")
            : t("manualRun.requestRealExecution")}
      </button>
    </form>
  );
}

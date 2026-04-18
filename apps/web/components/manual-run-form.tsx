"use client";

import { useRouter } from "next/navigation";
import type { FormEvent, ReactElement } from "react";
import { useMemo, useState } from "react";

import { ApiRequestError, createRun } from "@/lib/api";
import type { AgentProfile } from "@/lib/types";

interface ManualRunFormProps {
  workspaceId: string;
  agents: AgentProfile[];
  executionEnabled: boolean;
}

function formatError(error: unknown): string {
  if (error instanceof ApiRequestError && error.error) {
    const details = Object.entries(error.error.details)
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join(", ");
    return details ? `${error.error.message} (${details})` : error.error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unable to create run.";
}

export function ManualRunForm({
  workspaceId,
  agents,
  executionEnabled,
}: ManualRunFormProps): ReactElement {
  const router = useRouter();
  const activeAgents = useMemo(() => agents.filter((agent) => agent.is_active), [agents]);
  const [agentProfileId, setAgentProfileId] = useState(activeAgents[0]?.id ?? "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!agentProfileId) {
      setErrorMessage("Choose an active agent before launching a dry-run.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const run = await createRun({
        agent_profile_id: agentProfileId,
        dry_run: true,
        requested_by: "web-ui",
        trigger: "manual",
        workspace_id: workspaceId,
      });
      router.push(`/runs/${run.id}`);
    } catch (error) {
      setErrorMessage(formatError(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <label className="field-label" htmlFor="manual-run-agent">
        Agent
      </label>
      <select
        id="manual-run-agent"
        name="agent_profile_id"
        onChange={(event) => setAgentProfileId(event.target.value)}
        value={agentProfileId}
      >
        {agents.length === 0 ? <option value="">No agent available</option> : null}
        {agents.map((agent) => (
          <option disabled={!agent.is_active} key={agent.id} value={agent.id}>
            {agent.name} {agent.is_active ? "" : "(inactive)"}
          </option>
        ))}
      </select>

      <label className="checkbox-row">
        <input checked disabled name="dry_run" type="checkbox" />
        Dry-run
      </label>

      <p className="muted">
        Real execution is {executionEnabled ? "enabled globally" : "disabled globally"}; this
        action creates a dry-run only.
      </p>

      {errorMessage ? <p className="error-text">{errorMessage}</p> : null}

      <button className="primary-button" disabled={isSubmitting || activeAgents.length === 0} type="submit">
        {isSubmitting ? "Launching..." : "Launch dry-run"}
      </button>
    </form>
  );
}

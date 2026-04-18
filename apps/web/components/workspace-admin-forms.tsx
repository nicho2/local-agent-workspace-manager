"use client";

import { useRouter } from "next/navigation";
import type { FormEvent, ReactElement } from "react";
import { useMemo, useState } from "react";

import {
  ApiRequestError,
  createAgent,
  createPolicy,
  createWorkspace,
  updateAgent,
  updatePolicy,
  updateWorkspace,
} from "@/lib/api";
import type { AgentProfile, Workspace, WorkspacePolicy } from "@/lib/types";

interface WorkspaceAdminFormsProps {
  agents: AgentProfile[];
  policies: WorkspacePolicy[];
  workspaces: Workspace[];
}

function parseList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function optionalText(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
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

export function WorkspaceAdminForms({
  agents,
  policies,
  workspaces,
}: WorkspaceAdminFormsProps): ReactElement {
  const router = useRouter();
  const [workspaceId, setWorkspaceId] = useState("");
  const [policyId, setPolicyId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === workspaceId),
    [workspaceId, workspaces]
  );
  const selectedPolicy = useMemo(
    () => policies.find((policy) => policy.id === policyId),
    [policyId, policies]
  );
  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === agentId),
    [agentId, agents]
  );

  async function runAction(action: () => Promise<unknown>, successMessage: string): Promise<void> {
    setError(null);
    setMessage(null);
    try {
      await action();
      setMessage(successMessage);
      router.refresh();
    } catch (requestError) {
      setError(formatError(requestError));
    }
  }

  async function submitWorkspace(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const tags = parseList(String(formData.get("tags") ?? ""));
    const payload = {
      description: optionalText(formData.get("description")),
      name: String(formData.get("name") ?? ""),
      policy_id: String(formData.get("policy_id") ?? ""),
      root_path: String(formData.get("root_path") ?? ""),
      status: String(formData.get("status") ?? "active") as "active" | "archived",
      tags,
    };

    if (selectedWorkspace) {
      await runAction(
        () => updateWorkspace(selectedWorkspace.id, payload),
        "Workspace updated."
      );
      return;
    }

    await runAction(
      () =>
        createWorkspace({
          ...payload,
          slug: String(formData.get("slug") ?? ""),
        }),
      "Workspace created."
    );
  }

  async function submitPolicy(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      allow_network: formData.get("allow_network") === "on",
      allow_write: formData.get("allow_write") === "on",
      allowed_command_prefixes: parseList(String(formData.get("allowed_command_prefixes") ?? "")),
      description: optionalText(formData.get("description")),
      max_runtime_seconds: Number(formData.get("max_runtime_seconds") ?? 900),
      name: String(formData.get("name") ?? ""),
    };

    await runAction(
      () => (selectedPolicy ? updatePolicy(selectedPolicy.id, payload) : createPolicy(payload)),
      selectedPolicy ? "Policy updated." : "Policy created."
    );
  }

  async function submitAgent(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const rawWorkspaceId = String(formData.get("workspace_id") ?? "");
    const payload = {
      command_template: String(formData.get("command_template") ?? ""),
      environment: {},
      is_active: formData.get("is_active") === "on",
      name: String(formData.get("name") ?? ""),
      runtime: String(formData.get("runtime") ?? "copilot_cli") as AgentProfile["runtime"],
      system_prompt: optionalText(formData.get("system_prompt")),
      workspace_id: rawWorkspaceId.length > 0 ? rawWorkspaceId : null,
    };

    await runAction(
      () => (selectedAgent ? updateAgent(selectedAgent.id, payload) : createAgent(payload)),
      selectedAgent ? "Agent updated." : "Agent created."
    );
  }

  return (
    <section className="card">
      <h3>Create and edit</h3>
      <p className="muted">Security defaults stay visible: dry-run first, policies explicit.</p>
      {message ? <p className="success-text">{message}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      <div className="form-columns">
        <form className="form-grid" key={`workspace-${workspaceId}`} onSubmit={submitWorkspace}>
          <h4>Workspace</h4>
          <label className="field-label" htmlFor="workspace-select">
            Edit existing
          </label>
          <select
            id="workspace-select"
            onChange={(event) => setWorkspaceId(event.target.value)}
            value={workspaceId}
          >
            <option value="">New workspace</option>
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
          <label className="field-label" htmlFor="workspace-name">
            Name
          </label>
          <input defaultValue={selectedWorkspace?.name ?? ""} id="workspace-name" name="name" />
          {!selectedWorkspace ? (
            <>
              <label className="field-label" htmlFor="workspace-slug">
                Slug
              </label>
              <input id="workspace-slug" name="slug" placeholder="docs-vault" />
            </>
          ) : null}
          <label className="field-label" htmlFor="workspace-root-path">
            Root path
          </label>
          <input
            defaultValue={selectedWorkspace?.root_path ?? ""}
            id="workspace-root-path"
            name="root_path"
          />
          <label className="field-label" htmlFor="workspace-policy">
            Policy
          </label>
          <select
            defaultValue={selectedWorkspace?.policy_id ?? policies[0]?.id ?? ""}
            id="workspace-policy"
            name="policy_id"
          >
            {policies.map((policy) => (
              <option key={policy.id} value={policy.id}>
                {policy.name}
              </option>
            ))}
          </select>
          <label className="field-label" htmlFor="workspace-status">
            Status
          </label>
          <select defaultValue={selectedWorkspace?.status ?? "active"} id="workspace-status" name="status">
            <option value="active">active</option>
            <option value="archived">archived</option>
          </select>
          <label className="field-label" htmlFor="workspace-tags">
            Tags
          </label>
          <input
            defaultValue={selectedWorkspace?.tags.join(", ") ?? ""}
            id="workspace-tags"
            name="tags"
            placeholder="docs, ops"
          />
          <label className="field-label" htmlFor="workspace-description">
            Description
          </label>
          <textarea
            defaultValue={selectedWorkspace?.description ?? ""}
            id="workspace-description"
            name="description"
          />
          <button className="primary-button" type="submit">
            {selectedWorkspace ? "Update workspace" : "Create workspace"}
          </button>
        </form>

        <form className="form-grid" key={`policy-${policyId}`} onSubmit={submitPolicy}>
          <h4>Policy</h4>
          <label className="field-label" htmlFor="policy-select">
            Edit existing
          </label>
          <select
            id="policy-select"
            onChange={(event) => setPolicyId(event.target.value)}
            value={policyId}
          >
            <option value="">New policy</option>
            {policies.map((policy) => (
              <option key={policy.id} value={policy.id}>
                {policy.name}
              </option>
            ))}
          </select>
          <label className="field-label" htmlFor="policy-name">
            Name
          </label>
          <input defaultValue={selectedPolicy?.name ?? ""} id="policy-name" name="name" />
          <label className="field-label" htmlFor="policy-runtime">
            Max runtime seconds
          </label>
          <input
            defaultValue={selectedPolicy?.max_runtime_seconds ?? 900}
            id="policy-runtime"
            min={30}
            name="max_runtime_seconds"
            type="number"
          />
          <label className="checkbox-row">
            <input defaultChecked={selectedPolicy?.allow_write ?? false} name="allow_write" type="checkbox" />
            Allow write
          </label>
          <label className="checkbox-row">
            <input
              defaultChecked={selectedPolicy?.allow_network ?? false}
              name="allow_network"
              type="checkbox"
            />
            Allow network
          </label>
          <label className="field-label" htmlFor="policy-prefixes">
            Allowed command prefixes
          </label>
          <input
            defaultValue={selectedPolicy?.allowed_command_prefixes.join(", ") ?? ""}
            id="policy-prefixes"
            name="allowed_command_prefixes"
            placeholder="gh copilot, python -m pytest"
          />
          <label className="field-label" htmlFor="policy-description">
            Description
          </label>
          <textarea
            defaultValue={selectedPolicy?.description ?? ""}
            id="policy-description"
            name="description"
          />
          <button className="primary-button" type="submit">
            {selectedPolicy ? "Update policy" : "Create policy"}
          </button>
        </form>

        <form className="form-grid" key={`agent-${agentId}`} onSubmit={submitAgent}>
          <h4>Agent</h4>
          <label className="field-label" htmlFor="agent-select">
            Edit existing
          </label>
          <select id="agent-select" onChange={(event) => setAgentId(event.target.value)} value={agentId}>
            <option value="">New agent</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
          <label className="field-label" htmlFor="agent-name">
            Name
          </label>
          <input defaultValue={selectedAgent?.name ?? ""} id="agent-name" name="name" />
          <label className="field-label" htmlFor="agent-runtime">
            Runtime
          </label>
          <select defaultValue={selectedAgent?.runtime ?? "copilot_cli"} id="agent-runtime" name="runtime">
            <option value="copilot_cli">copilot_cli</option>
            <option value="codex">codex</option>
            <option value="local_script">local_script</option>
            <option value="custom">custom</option>
          </select>
          <label className="field-label" htmlFor="agent-workspace">
            Workspace scope
          </label>
          <select
            defaultValue={selectedAgent?.workspace_id ?? ""}
            id="agent-workspace"
            name="workspace_id"
          >
            <option value="">Global agent</option>
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
          <label className="field-label" htmlFor="agent-command">
            Command template
          </label>
          <input
            defaultValue={selectedAgent?.command_template ?? ""}
            id="agent-command"
            name="command_template"
          />
          <label className="field-label" htmlFor="agent-system-prompt">
            System prompt
          </label>
          <textarea
            defaultValue={selectedAgent?.system_prompt ?? ""}
            id="agent-system-prompt"
            name="system_prompt"
          />
          <label className="checkbox-row">
            <input defaultChecked={selectedAgent?.is_active ?? true} name="is_active" type="checkbox" />
            Active
          </label>
          <button className="primary-button" type="submit">
            {selectedAgent ? "Update agent" : "Create agent"}
          </button>
        </form>
      </div>
    </section>
  );
}

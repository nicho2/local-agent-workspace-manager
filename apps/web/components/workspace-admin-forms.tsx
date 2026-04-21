"use client";

import { useRouter } from "next/navigation";
import type { FormEvent, KeyboardEvent, ReactElement } from "react";
import { useMemo, useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import {
  ApiRequestError,
  createAgent,
  createPolicy,
  createWorkspace,
  deleteAgent,
  deletePolicy,
  deleteWorkspace,
  getWorkspaceDeleteSummary,
  updateAgent,
  updatePolicy,
  updateWorkspace,
} from "@/lib/api";
import { adminTabs, getAdjacentAdminTab, type AdminTabId } from "@/lib/admin-tabs";
import { chooseWorkspaceDirectory } from "@/lib/directory-picker";
import { nextCommandTemplate } from "@/lib/runtime-presets";
import type {
  AgentProfile,
  AgentRuntime,
  DeleteSummary,
  RuntimeCapabilityPreset,
  Workspace,
  WorkspacePolicy,
} from "@/lib/types";

interface WorkspaceAdminFormsProps {
  agents: AgentProfile[];
  policies: WorkspacePolicy[];
  runtimePresets: RuntimeCapabilityPreset[];
  workspaceAllowedRoots: string[];
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
    if (error.error.code === "workspace_root_outside_allowed_roots") {
      const allowedRoots = error.error.details.allowed_roots;
      if (
        Array.isArray(allowedRoots) &&
        allowedRoots.every((root): root is string => typeof root === "string")
      ) {
        return `${error.error.message}. Choose a directory under: ${allowedRoots.join(", ")}.`;
      }
    }
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
  runtimePresets,
  workspaceAllowedRoots,
  workspaces,
}: WorkspaceAdminFormsProps): ReactElement {
  const router = useRouter();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<AdminTabId>("workspace");
  const [workspaceId, setWorkspaceId] = useState("");
  const [workspaceRootPath, setWorkspaceRootPath] = useState("");
  const [workspaceAllowedRoot, setWorkspaceAllowedRoot] = useState(
    workspaceAllowedRoots[0] ?? ""
  );
  const [selectedDirectoryName, setSelectedDirectoryName] = useState<string | null>(null);
  const [directoryPickerMessage, setDirectoryPickerMessage] = useState<string | null>(null);
  const [policyId, setPolicyId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [workspaceDeleteConfirmation, setWorkspaceDeleteConfirmation] = useState("");
  const [workspaceDeleteSummary, setWorkspaceDeleteSummary] = useState<DeleteSummary | null>(null);
  const [agentRuntime, setAgentRuntime] = useState<AgentRuntime>(
    runtimePresets[0]?.runtime ?? "copilot_cli"
  );
  const [agentCommand, setAgentCommand] = useState(
    runtimePresets[0]?.default_command_template ?? ""
  );
  const [agentCommandTouched, setAgentCommandTouched] = useState(false);
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

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>): void {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      setActiveTab((currentTab) => getAdjacentAdminTab(currentTab, "next"));
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      setActiveTab((currentTab) => getAdjacentAdminTab(currentTab, "previous"));
    }
    if (event.key === "Home") {
      event.preventDefault();
      setActiveTab("workspace");
    }
    if (event.key === "End") {
      event.preventDefault();
      setActiveTab("agent");
    }
  }

  function selectAgent(nextAgentId: string): void {
    setAgentId(nextAgentId);
    const nextAgent = agents.find((agent) => agent.id === nextAgentId);

    if (nextAgent) {
      setAgentRuntime(nextAgent.runtime);
      setAgentCommand(nextAgent.command_template);
      setAgentCommandTouched(true);
      return;
    }

    const defaultRuntime = runtimePresets[0]?.runtime ?? "copilot_cli";
    setAgentRuntime(defaultRuntime);
    setAgentCommand(
      nextCommandTemplate(runtimePresets, defaultRuntime, "", false)
    );
    setAgentCommandTouched(false);
  }

  function selectWorkspace(nextWorkspaceId: string): void {
    setWorkspaceId(nextWorkspaceId);
    const nextWorkspace = workspaces.find((workspace) => workspace.id === nextWorkspaceId);
    setWorkspaceRootPath(nextWorkspace?.root_path ?? "");
    setSelectedDirectoryName(null);
    setDirectoryPickerMessage(null);
    setWorkspaceDeleteConfirmation("");
    setWorkspaceDeleteSummary(null);
    if (nextWorkspace) {
      void loadWorkspaceDeleteSummary(nextWorkspace.id);
    }
  }

  async function loadWorkspaceDeleteSummary(nextWorkspaceId: string): Promise<void> {
    try {
      setWorkspaceDeleteSummary(await getWorkspaceDeleteSummary(nextWorkspaceId));
    } catch {
      setWorkspaceDeleteSummary(null);
    }
  }

  function composeWorkspacePath(allowedRoot: string, directoryName: string): string {
    const separator = allowedRoot.includes("\\") ? "\\" : "/";
    return `${allowedRoot.replace(/[\\/]+$/, "")}${separator}${directoryName}`;
  }

  function useSelectedDirectoryWithAllowedRoot(
    allowedRoot: string,
    directoryName: string
  ): void {
    setWorkspaceAllowedRoot(allowedRoot);
    setWorkspaceRootPath(composeWorkspacePath(allowedRoot, directoryName));
  }

  async function chooseRootPath(): Promise<void> {
    setError(null);
    try {
      const selection = await chooseWorkspaceDirectory(window);
      setDirectoryPickerMessage(selection.message);
      if (selection.path) {
        setWorkspaceRootPath(selection.path);
        setSelectedDirectoryName(null);
        return;
      }

      if (selection.directoryName) {
        setSelectedDirectoryName(selection.directoryName);
        if (workspaceAllowedRoots.length === 1) {
          useSelectedDirectoryWithAllowedRoot(
            workspaceAllowedRoots[0],
            selection.directoryName
          );
        }
      }
    } catch (selectionError) {
      if (selectionError instanceof DOMException && selectionError.name === "AbortError") {
        setDirectoryPickerMessage("Directory selection cancelled.");
        return;
      }
      setError(formatError(selectionError));
    }
  }

  function selectAgentRuntime(runtime: AgentRuntime): void {
    setAgentRuntime(runtime);
    setAgentCommand((currentCommand) =>
      nextCommandTemplate(runtimePresets, runtime, currentCommand, agentCommandTouched)
    );
  }

  const runtimeOptions = runtimePresets.some((preset) => preset.runtime === agentRuntime)
    ? runtimePresets
    : [
        ...runtimePresets,
        {
          runtime: agentRuntime,
          display_name: agentRuntime,
          description: "Existing agent runtime without a preset.",
          default_command_template: agentCommand,
          supports_dry_run: true,
          requires_write_access: false,
          requires_network_access: false,
          recommended_policy_prefixes: [],
          environment_defaults: {},
        },
      ];

  async function runAction(action: () => Promise<unknown>, successMessage: string): Promise<boolean> {
    setError(null);
    setMessage(null);
    try {
      await action();
      setMessage(successMessage);
      router.refresh();
      return true;
    } catch (requestError) {
      setError(formatError(requestError));
      return false;
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

  async function deleteSelectedWorkspace(): Promise<void> {
    if (!selectedWorkspace) {
      return;
    }
    if (workspaceDeleteConfirmation !== selectedWorkspace.slug) {
      setError(t("admin.deleteWorkspaceMismatch"));
      return;
    }
    if (!window.confirm(t("admin.deleteWorkspaceConfirm"))) {
      return;
    }
    const deleted = await runAction(
      () => deleteWorkspace(selectedWorkspace.id, workspaceDeleteConfirmation),
      t("admin.workspaceDeleted")
    );
    if (deleted) {
      setWorkspaceId("");
      setWorkspaceRootPath("");
      setWorkspaceDeleteConfirmation("");
    }
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

  async function deleteSelectedPolicy(): Promise<void> {
    if (!selectedPolicy) {
      return;
    }
    if (!window.confirm(t("admin.deletePolicyConfirm"))) {
      return;
    }
    const deleted = await runAction(
      () => deletePolicy(selectedPolicy.id),
      t("admin.policyDeleted")
    );
    if (deleted) {
      setPolicyId("");
    }
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

  async function deleteSelectedAgent(): Promise<void> {
    if (!selectedAgent) {
      return;
    }
    if (!window.confirm(t("admin.deleteAgentConfirm"))) {
      return;
    }
    const deleted = await runAction(
      () => deleteAgent(selectedAgent.id),
      t("admin.agentDeleted")
    );
    if (deleted) {
      setAgentId("");
    }
  }

  return (
    <details className="card collapsible-card">
      <summary className="collapsible-summary">
        <span className="collapsible-summary-copy">
          <span className="collapsible-title">{t("admin.title")}</span>
          <span className="muted">{t("admin.subtitle")}</span>
        </span>
        <span className="collapsible-action">{t("admin.openForms")}</span>
      </summary>
      <div className="collapsible-body">
        {message ? <p className="success-text">{message}</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        <div aria-label="Create and edit workspace resources" className="admin-tabs" role="tablist">
          {adminTabs.map((tab) => (
            <button
              aria-controls={`${tab.id}-admin-panel`}
              aria-selected={activeTab === tab.id}
              className={activeTab === tab.id ? "tab-button tab-button-active" : "tab-button"}
              id={`${tab.id}-admin-tab`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={handleTabKeyDown}
              role="tab"
              tabIndex={activeTab === tab.id ? 0 : -1}
              type="button"
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>

        <div
          aria-labelledby="workspace-admin-tab"
          className="tab-panel"
          hidden={activeTab !== "workspace"}
          id="workspace-admin-panel"
          role="tabpanel"
        >
        <form className="form-grid" key={`workspace-${workspaceId}`} onSubmit={submitWorkspace}>
          <h4>{t("admin.workspace")}</h4>
          <label className="field-label" htmlFor="workspace-select">
            {t("admin.editExisting")}
          </label>
          <select
            id="workspace-select"
            onChange={(event) => selectWorkspace(event.target.value)}
            value={workspaceId}
          >
            <option value="">{t("admin.newWorkspace")}</option>
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
          <label className="field-label" htmlFor="workspace-name">
            {t("admin.name")}
          </label>
          <input defaultValue={selectedWorkspace?.name ?? ""} id="workspace-name" name="name" />
          {!selectedWorkspace ? (
            <>
              <label className="field-label" htmlFor="workspace-slug">
                {t("admin.slug")}
              </label>
              <input id="workspace-slug" name="slug" placeholder="docs-vault" />
            </>
          ) : null}
          <label className="field-label" htmlFor="workspace-root-path">
            {t("admin.rootPath")}
          </label>
          <div className="inline-control">
            <button className="secondary-button" onClick={chooseRootPath} type="button">
              {t("admin.chooseDirectory")}
            </button>
            <span className="muted">{t("admin.manualFallback")}</span>
          </div>
          {directoryPickerMessage ? <p className="muted">{directoryPickerMessage}</p> : null}
          {selectedDirectoryName && workspaceAllowedRoots.length > 1 ? (
            <div className="form-grid compact-form-grid">
              <label className="field-label" htmlFor="workspace-allowed-root">
                {t("admin.allowedRoot")}
              </label>
              <select
                id="workspace-allowed-root"
                onChange={(event) =>
                  useSelectedDirectoryWithAllowedRoot(
                    event.target.value,
                    selectedDirectoryName
                  )
                }
                value={workspaceAllowedRoot}
              >
                {workspaceAllowedRoots.map((allowedRoot) => (
                  <option key={allowedRoot} value={allowedRoot}>
                    {allowedRoot}
                  </option>
                ))}
              </select>
              <button
                className="secondary-button"
                onClick={() =>
                  useSelectedDirectoryWithAllowedRoot(
                    workspaceAllowedRoot,
                    selectedDirectoryName
                  )
                }
                type="button"
              >
                {t("admin.useSelectedFolder")}
              </button>
            </div>
          ) : null}
          <input
            id="workspace-root-path"
            name="root_path"
            onChange={(event) => setWorkspaceRootPath(event.target.value)}
            placeholder="E:/workspaces/docs-vault"
            value={workspaceRootPath}
          />
          <label className="field-label" htmlFor="workspace-policy">
            {t("admin.policy")}
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
            {t("admin.status")}
          </label>
          <select defaultValue={selectedWorkspace?.status ?? "active"} id="workspace-status" name="status">
            <option value="active">active</option>
            <option value="archived">archived</option>
          </select>
          <label className="field-label" htmlFor="workspace-tags">
            {t("admin.tags")}
          </label>
          <input
            defaultValue={selectedWorkspace?.tags.join(", ") ?? ""}
            id="workspace-tags"
            name="tags"
            placeholder="docs, ops"
          />
          <label className="field-label" htmlFor="workspace-description">
            {t("table.description")}
          </label>
          <textarea
            defaultValue={selectedWorkspace?.description ?? ""}
            id="workspace-description"
            name="description"
          />
          <button className="primary-button" type="submit">
            {selectedWorkspace ? t("admin.updateWorkspace") : t("admin.createWorkspace")}
          </button>
          {selectedWorkspace ? (
            <div className="danger-zone">
              <strong>{t("admin.deleteWorkspaceTitle")}</strong>
              <p className="muted">{t("admin.deleteWorkspaceHelp")}</p>
              {workspaceDeleteSummary ? (
                <ul className="compact-list">
                  {Object.entries(workspaceDeleteSummary.deleted_counts).map(([name, count]) => (
                    <li key={name}>
                      {name}: {count}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">{t("admin.deleteSummaryLoading")}</p>
              )}
              <label className="field-label" htmlFor="workspace-delete-confirmation">
                {t("admin.deleteWorkspaceLabel")} {selectedWorkspace.slug}
              </label>
              <input
                id="workspace-delete-confirmation"
                onChange={(event) => setWorkspaceDeleteConfirmation(event.target.value)}
                value={workspaceDeleteConfirmation}
              />
              <button
                className="danger-button"
                onClick={deleteSelectedWorkspace}
                type="button"
              >
                {t("admin.deleteWorkspace")}
              </button>
            </div>
          ) : null}
        </form>
      </div>

        <div
          aria-labelledby="policy-admin-tab"
          className="tab-panel"
          hidden={activeTab !== "policy"}
          id="policy-admin-panel"
          role="tabpanel"
        >
        <form className="form-grid" key={`policy-${policyId}`} onSubmit={submitPolicy}>
          <h4>{t("admin.policy")}</h4>
          <label className="field-label" htmlFor="policy-select">
            {t("admin.editExisting")}
          </label>
          <select
            id="policy-select"
            onChange={(event) => setPolicyId(event.target.value)}
            value={policyId}
          >
            <option value="">{t("admin.newPolicy")}</option>
            {policies.map((policy) => (
              <option key={policy.id} value={policy.id}>
                {policy.name}
              </option>
            ))}
          </select>
          <label className="field-label" htmlFor="policy-name">
            {t("admin.name")}
          </label>
          <input defaultValue={selectedPolicy?.name ?? ""} id="policy-name" name="name" />
          <label className="field-label" htmlFor="policy-runtime">
            {t("admin.maxRuntimeSeconds")}
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
            {t("admin.allowWrite")}
          </label>
          <label className="checkbox-row">
            <input
              defaultChecked={selectedPolicy?.allow_network ?? false}
              name="allow_network"
              type="checkbox"
            />
            {t("admin.allowNetwork")}
          </label>
          <label className="field-label" htmlFor="policy-prefixes">
            {t("admin.allowedCommandPrefixes")}
          </label>
          <input
            defaultValue={selectedPolicy?.allowed_command_prefixes.join(", ") ?? ""}
            id="policy-prefixes"
            name="allowed_command_prefixes"
            placeholder="gh copilot, python -m pytest"
          />
          <label className="field-label" htmlFor="policy-description">
            {t("table.description")}
          </label>
          <textarea
            defaultValue={selectedPolicy?.description ?? ""}
            id="policy-description"
            name="description"
          />
          <button className="primary-button" type="submit">
            {selectedPolicy ? t("admin.updatePolicy") : t("admin.createPolicy")}
          </button>
          {selectedPolicy ? (
            <div className="danger-zone">
              <strong>{t("admin.deletePolicyTitle")}</strong>
              <p className="muted">{t("admin.deletePolicyHelp")}</p>
              <button className="danger-button" onClick={deleteSelectedPolicy} type="button">
                {t("admin.deletePolicy")}
              </button>
            </div>
          ) : null}
        </form>
      </div>

        <div
          aria-labelledby="agent-admin-tab"
          className="tab-panel"
          hidden={activeTab !== "agent"}
          id="agent-admin-panel"
          role="tabpanel"
        >
        <form className="form-grid" key={`agent-${agentId}`} onSubmit={submitAgent}>
          <h4>{t("admin.agent")}</h4>
          <label className="field-label" htmlFor="agent-select">
            {t("admin.editExisting")}
          </label>
          <select id="agent-select" onChange={(event) => selectAgent(event.target.value)} value={agentId}>
            <option value="">{t("admin.newAgent")}</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
          <label className="field-label" htmlFor="agent-name">
            {t("admin.name")}
          </label>
          <input defaultValue={selectedAgent?.name ?? ""} id="agent-name" name="name" />
          <label className="field-label" htmlFor="agent-runtime">
            {t("admin.runtime")}
          </label>
          <select
            id="agent-runtime"
            name="runtime"
            onChange={(event) => selectAgentRuntime(event.target.value as AgentRuntime)}
            value={agentRuntime}
          >
            {runtimeOptions.map((preset) => (
              <option key={preset.runtime} value={preset.runtime}>
                {preset.runtime}
              </option>
            ))}
          </select>
          <label className="field-label" htmlFor="agent-workspace">
            {t("admin.workspaceScope")}
          </label>
          <select
            defaultValue={selectedAgent?.workspace_id ?? ""}
            id="agent-workspace"
            name="workspace_id"
          >
            <option value="">{t("admin.globalAgent")}</option>
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
          <label className="field-label" htmlFor="agent-command">
            {t("admin.commandTemplate")}
          </label>
          <input
            id="agent-command"
            name="command_template"
            onChange={(event) => {
              setAgentCommand(event.target.value);
              setAgentCommandTouched(true);
            }}
            value={agentCommand}
          />
          <label className="field-label" htmlFor="agent-system-prompt">
            {t("admin.systemPrompt")}
          </label>
          <textarea
            defaultValue={selectedAgent?.system_prompt ?? ""}
            id="agent-system-prompt"
            name="system_prompt"
          />
          <label className="checkbox-row">
            <input defaultChecked={selectedAgent?.is_active ?? true} name="is_active" type="checkbox" />
            {t("admin.active")}
          </label>
          <button className="primary-button" type="submit">
            {selectedAgent ? t("admin.updateAgent") : t("admin.createAgent")}
          </button>
          {selectedAgent ? (
            <div className="danger-zone">
              <strong>{t("admin.deleteAgentTitle")}</strong>
              <p className="muted">{t("admin.deleteAgentHelp")}</p>
              <button className="danger-button" onClick={deleteSelectedAgent} type="button">
                {t("admin.deleteAgent")}
              </button>
            </div>
          ) : null}
        </form>
        </div>
      </div>
    </details>
  );
}

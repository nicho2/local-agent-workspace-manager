"use client";

import { useRouter } from "next/navigation";
import type { ChangeEvent, ReactElement } from "react";
import { useMemo, useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { createAgent, createPolicy, createWorkspace } from "@/lib/api";
import {
  buildGuidedWorkspaceSetup,
  commandForUseCase,
  composePath,
  guidedWorkspaceUseCasePresets,
  parseCommaSeparatedList,
} from "@/lib/guided-workspace";
import type { AgentRuntime, RuntimeCapabilityPreset } from "@/lib/types";

interface GuidedWorkspaceWizardProps {
  runtimePresets: RuntimeCapabilityPreset[];
  workspaceAllowedRoots: string[];
}

export function GuidedWorkspaceWizard({
  runtimePresets,
  workspaceAllowedRoots,
}: GuidedWorkspaceWizardProps): ReactElement {
  const router = useRouter();
  const { t } = useI18n();
  const defaultPreset = guidedWorkspaceUseCasePresets[0];
  const defaultRuntimePreset = runtimePresets[0];
  const [selectedUseCase, setSelectedUseCase] = useState(defaultPreset.useCase);
  const [allowedRoot, setAllowedRoot] = useState(workspaceAllowedRoots[0] ?? "");
  const [workspaceName, setWorkspaceName] = useState(defaultPreset.name);
  const [slug, setSlug] = useState(defaultPreset.slug);
  const [description, setDescription] = useState(defaultPreset.description);
  const [tags, setTags] = useState(defaultPreset.tags.join(", "));
  const [policyName, setPolicyName] = useState(defaultPreset.policyName);
  const [allowWrite, setAllowWrite] = useState(defaultPreset.allowWrite);
  const [allowNetwork, setAllowNetwork] = useState(defaultPreset.allowNetwork);
  const [runtime, setRuntime] = useState<AgentRuntime>(
    defaultRuntimePreset?.runtime ?? "copilot_cli"
  );
  const [agentName, setAgentName] = useState(defaultPreset.agentName);
  const [systemPrompt, setSystemPrompt] = useState(defaultPreset.systemPrompt);
  const [commandTemplate, setCommandTemplate] = useState(
    commandForUseCase(defaultPreset, defaultRuntimePreset)
  );
  const [policyPrefixes, setPolicyPrefixes] = useState(
    (defaultRuntimePreset?.recommended_policy_prefixes ?? ["copilot"]).join(", ")
  );
  const [rootPathTouched, setRootPathTouched] = useState(false);
  const [rootPath, setRootPath] = useState(
    allowedRoot ? composePath(allowedRoot, defaultPreset.slug) : ""
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedRuntimePreset = useMemo(
    () => runtimePresets.find((preset) => preset.runtime === runtime),
    [runtime, runtimePresets]
  );

  function updateRootPath(nextAllowedRoot: string, nextSlug: string, touched: boolean): void {
    if (!touched && nextAllowedRoot) {
      setRootPath(composePath(nextAllowedRoot, nextSlug));
    }
  }

  function applyUseCase(event: ChangeEvent<HTMLSelectElement>): void {
    const nextUseCase = event.target.value;
    const preset =
      guidedWorkspaceUseCasePresets.find((candidate) => candidate.useCase === nextUseCase) ??
      defaultPreset;
    const runtimePreset =
      runtimePresets.find((candidate) => candidate.runtime === runtime) ?? defaultRuntimePreset;
    setSelectedUseCase(preset.useCase);
    setWorkspaceName(preset.name);
    setSlug(preset.slug);
    setDescription(preset.description);
    setTags(preset.tags.join(", "));
    setPolicyName(preset.policyName);
    setAllowWrite(preset.allowWrite);
    setAllowNetwork(preset.allowNetwork);
    setAgentName(preset.agentName);
    setSystemPrompt(preset.systemPrompt);
    setCommandTemplate(commandForUseCase(preset, runtimePreset));
    updateRootPath(allowedRoot, preset.slug, rootPathTouched);
  }

  function updateSlug(nextSlug: string): void {
    setSlug(nextSlug);
    updateRootPath(allowedRoot, nextSlug, rootPathTouched);
  }

  function updateAllowedRoot(nextAllowedRoot: string): void {
    setAllowedRoot(nextAllowedRoot);
    updateRootPath(nextAllowedRoot, slug, rootPathTouched);
  }

  function updateRuntime(nextRuntime: AgentRuntime): void {
    const preset = runtimePresets.find((candidate) => candidate.runtime === nextRuntime);
    const useCase =
      guidedWorkspaceUseCasePresets.find((candidate) => candidate.useCase === selectedUseCase) ??
      defaultPreset;
    setRuntime(nextRuntime);
    setCommandTemplate(commandForUseCase(useCase, preset));
    setPolicyPrefixes((preset?.recommended_policy_prefixes ?? [nextRuntime]).join(", "));
  }

  async function submitSetup(): Promise<void> {
    setError(null);
    setMessage(null);
    setIsSubmitting(true);
    try {
      const setup = buildGuidedWorkspaceSetup({
        agentName,
        allowNetwork,
        allowWrite,
        commandTemplate,
        description,
        policyName,
        policyPrefixes: parseCommaSeparatedList(policyPrefixes),
        rootPath,
        runtime,
        slug,
        systemPrompt,
        tags: parseCommaSeparatedList(tags),
        workspaceName,
      });
      const policy = await createPolicy(setup.policy);
      const workspace = await createWorkspace({
        ...setup.workspace,
        policy_id: policy.id,
      });
      await createAgent({
        ...setup.agent,
        workspace_id: workspace.id,
      });
      setMessage(t("guided.success"));
      router.refresh();
    } catch (setupError) {
      setError(setupError instanceof Error ? setupError.message : t("guided.failed"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="card">
      <h3>{t("guided.title")}</h3>
      <p className="muted">{t("guided.subtitle")}</p>
      {message ? <p className="success-text">{message}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
      <div className="wizard-grid">
        <div className="form-grid compact-form-grid">
          <h4>{t("guided.usage")}</h4>
          <label className="field-label" htmlFor="guided-use-case">
            {t("guided.useCase")}
          </label>
          <select id="guided-use-case" onChange={applyUseCase} value={selectedUseCase}>
            {guidedWorkspaceUseCasePresets.map((preset) => (
              <option key={preset.useCase} value={preset.useCase}>
                {preset.name}
              </option>
            ))}
          </select>
          <label className="field-label" htmlFor="guided-root">
            {t("guided.allowedRoot")}
          </label>
          <select
            id="guided-root"
            onChange={(event) => updateAllowedRoot(event.target.value)}
            value={allowedRoot}
          >
            {workspaceAllowedRoots.map((root) => (
              <option key={root} value={root}>
                {root}
              </option>
            ))}
          </select>
          <label className="field-label" htmlFor="guided-root-path">
            {t("admin.rootPath")}
          </label>
          <input
            id="guided-root-path"
            onChange={(event) => {
              setRootPathTouched(true);
              setRootPath(event.target.value);
            }}
            value={rootPath}
          />
        </div>
        <div className="form-grid compact-form-grid">
          <h4>{t("admin.workspace")}</h4>
          <label className="field-label" htmlFor="guided-workspace-name">
            {t("admin.name")}
          </label>
          <input
            id="guided-workspace-name"
            onChange={(event) => setWorkspaceName(event.target.value)}
            value={workspaceName}
          />
          <label className="field-label" htmlFor="guided-slug">
            {t("admin.slug")}
          </label>
          <input id="guided-slug" onChange={(event) => updateSlug(event.target.value)} value={slug} />
          <label className="field-label" htmlFor="guided-tags">
            {t("admin.tags")}
          </label>
          <input id="guided-tags" onChange={(event) => setTags(event.target.value)} value={tags} />
        </div>
        <div className="form-grid compact-form-grid">
          <h4>{t("admin.policy")}</h4>
          <label className="field-label" htmlFor="guided-policy-name">
            {t("admin.name")}
          </label>
          <input
            id="guided-policy-name"
            onChange={(event) => setPolicyName(event.target.value)}
            value={policyName}
          />
          <label className="checkbox-row">
            <input
              checked={allowWrite}
              onChange={(event) => setAllowWrite(event.target.checked)}
              type="checkbox"
            />
            {t("admin.allowWrite")}
          </label>
          <label className="checkbox-row">
            <input
              checked={allowNetwork}
              onChange={(event) => setAllowNetwork(event.target.checked)}
              type="checkbox"
            />
            {t("admin.allowNetwork")}
          </label>
          <label className="field-label" htmlFor="guided-prefixes">
            {t("admin.allowedCommandPrefixes")}
          </label>
          <input
            id="guided-prefixes"
            onChange={(event) => setPolicyPrefixes(event.target.value)}
            value={policyPrefixes}
          />
        </div>
        <div className="form-grid compact-form-grid">
          <h4>{t("admin.agent")}</h4>
          <label className="field-label" htmlFor="guided-agent-name">
            {t("admin.name")}
          </label>
          <input
            id="guided-agent-name"
            onChange={(event) => setAgentName(event.target.value)}
            value={agentName}
          />
          <label className="field-label" htmlFor="guided-runtime">
            {t("admin.runtime")}
          </label>
          <select
            id="guided-runtime"
            onChange={(event) => updateRuntime(event.target.value as AgentRuntime)}
            value={runtime}
          >
            {runtimePresets.map((preset) => (
              <option key={preset.runtime} value={preset.runtime}>
                {preset.runtime}
              </option>
            ))}
          </select>
          <label className="field-label" htmlFor="guided-command">
            {t("admin.commandTemplate")}
          </label>
          <input
            id="guided-command"
            onChange={(event) => setCommandTemplate(event.target.value)}
            value={commandTemplate}
          />
          <label className="field-label" htmlFor="guided-system-prompt">
            {t("admin.systemPrompt")}
          </label>
          <textarea
            id="guided-system-prompt"
            onChange={(event) => setSystemPrompt(event.target.value)}
            value={systemPrompt}
          />
        </div>
      </div>
      <div className="warning-panel">
        <h4>{t("guided.safetyReview")}</h4>
        <p>{t("guided.dryRunOnly")}</p>
        <p>
          {t("runPreview.launchesInWorkspace")} <strong>{workspaceName}</strong>:{" "}
          <code>{rootPath}</code>
        </p>
        <p>
          {t("runPreview.exactCommand")}: <code>{commandTemplate}</code>
        </p>
        <p>
          {t("safety.prefixes")}: <code>{policyPrefixes}</code>
        </p>
      </div>
      <button className="primary-button" disabled={isSubmitting} onClick={submitSetup} type="button">
        {isSubmitting ? t("guided.creating") : t("guided.create")}
      </button>
    </section>
  );
}

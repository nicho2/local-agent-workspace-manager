import { describe, expect, it } from "vitest";

import {
  buildGuidedWorkspaceSetup,
  commandForUseCase,
  composePath,
  guidedWorkspaceUseCasePresets,
} from "@/lib/guided-workspace";

const copilotRuntimePreset = {
  runtime: "copilot_cli" as const,
  display_name: "GitHub Copilot CLI",
  description: "Copilot CLI profile.",
  default_command_template:
    'copilot --agent wiki-maintenance --autopilot --yolo --prompt "Default prompt"',
  supports_dry_run: true,
  requires_write_access: false,
  requires_network_access: true,
  recommended_policy_prefixes: ["copilot"],
  environment_defaults: {},
};

describe("guided workspace setup", () => {
  it("builds a complete policy, workspace, and agent setup", () => {
    const preset = guidedWorkspaceUseCasePresets[0];
    const setup = buildGuidedWorkspaceSetup({
      agentName: preset.agentName,
      allowNetwork: preset.allowNetwork,
      allowWrite: preset.allowWrite,
      commandTemplate: commandForUseCase(preset, copilotRuntimePreset),
      description: preset.description,
      policyName: preset.policyName,
      policyPrefixes: ["copilot"],
      rootPath: composePath("E:/temp", preset.slug),
      runtime: "copilot_cli",
      slug: preset.slug,
      systemPrompt: preset.systemPrompt,
      tags: preset.tags,
      workspaceName: preset.name,
    });

    expect(setup.policy).toMatchObject({
      allow_network: true,
      allow_write: true,
      allowed_command_prefixes: ["copilot"],
      name: "documentation-maintenance-policy",
    });
    expect(setup.workspace).toMatchObject({
      name: "Documentation Maintenance",
      root_path: "E:/temp/documentation-maintenance",
      slug: "documentation-maintenance",
      status: "active",
    });
    expect(setup.agent).toMatchObject({
      is_active: true,
      name: "documentation-maintenance",
      runtime: "copilot_cli",
    });
    expect(setup.agent.command_template).toContain("Lance la maintenance standard du coffre");
  });

  it("rejects incomplete guided setup data", () => {
    expect(() =>
      buildGuidedWorkspaceSetup({
        agentName: "",
        allowNetwork: false,
        allowWrite: false,
        commandTemplate: "",
        description: "",
        policyName: "policy",
        policyPrefixes: [],
        rootPath: "",
        runtime: "copilot_cli",
        slug: "",
        systemPrompt: "",
        tags: [],
        workspaceName: "",
      })
    ).toThrow("Guided setup requires workspace, policy, agent, root path, and command.");
  });
});

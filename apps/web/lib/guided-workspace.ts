import type { AgentRuntime, RuntimeCapabilityPreset } from "@/lib/types";

export type GuidedWorkspaceUseCase =
  | "documentation_maintenance"
  | "repo_triage"
  | "obsidian_cleanup"
  | "backlog_review";

export interface GuidedWorkspaceUseCasePreset {
  agentName: string;
  allowNetwork: boolean;
  allowWrite: boolean;
  commandPrompt: string;
  description: string;
  name: string;
  policyName: string;
  slug: string;
  systemPrompt: string;
  tags: string[];
  useCase: GuidedWorkspaceUseCase;
}

export interface GuidedWorkspaceDraft {
  agentName: string;
  allowNetwork: boolean;
  allowWrite: boolean;
  commandTemplate: string;
  description: string;
  policyName: string;
  policyPrefixes: string[];
  rootPath: string;
  runtime: AgentRuntime;
  slug: string;
  systemPrompt: string;
  tags: string[];
  workspaceName: string;
}

export interface GuidedWorkspaceSetup {
  agent: {
    command_template: string;
    environment: Record<string, string>;
    is_active: boolean;
    name: string;
    runtime: AgentRuntime;
    system_prompt: string;
  };
  policy: {
    allow_network: boolean;
    allow_write: boolean;
    allowed_command_prefixes: string[];
    description: string;
    max_runtime_seconds: number;
    name: string;
  };
  workspace: {
    description: string;
    name: string;
    root_path: string;
    slug: string;
    status: "active";
    tags: string[];
  };
}

export const guidedWorkspaceUseCasePresets: GuidedWorkspaceUseCasePreset[] = [
  {
    agentName: "documentation-maintenance",
    allowNetwork: true,
    allowWrite: true,
    commandPrompt: "Lance la maintenance standard du coffre",
    description: "Documentation maintenance workspace.",
    name: "Documentation Maintenance",
    policyName: "documentation-maintenance-policy",
    slug: "documentation-maintenance",
    systemPrompt: "Maintain documentation inside the selected workspace only.",
    tags: ["docs", "maintenance"],
    useCase: "documentation_maintenance",
  },
  {
    agentName: "repo-triage",
    allowNetwork: false,
    allowWrite: false,
    commandPrompt: "Review repository status and summarize triage actions.",
    description: "Repository triage workspace.",
    name: "Repository Triage",
    policyName: "repo-triage-policy",
    slug: "repository-triage",
    systemPrompt: "Review the repository without making changes unless policy is updated.",
    tags: ["repo", "triage"],
    useCase: "repo_triage",
  },
  {
    agentName: "obsidian-cleanup",
    allowNetwork: false,
    allowWrite: true,
    commandPrompt: "Nettoie le coffre Obsidian dans le workspace selectionne.",
    description: "Obsidian cleanup workspace.",
    name: "Obsidian Cleanup",
    policyName: "obsidian-cleanup-policy",
    slug: "obsidian-cleanup",
    systemPrompt: "Clean up the Obsidian vault inside the selected workspace only.",
    tags: ["obsidian", "cleanup"],
    useCase: "obsidian_cleanup",
  },
  {
    agentName: "backlog-review",
    allowNetwork: false,
    allowWrite: false,
    commandPrompt: "Review backlog items and propose the next safe slice.",
    description: "Backlog review workspace.",
    name: "Backlog Review",
    policyName: "backlog-review-policy",
    slug: "backlog-review",
    systemPrompt: "Review backlog content and keep recommendations auditable.",
    tags: ["backlog", "review"],
    useCase: "backlog_review",
  },
];

export function parseCommaSeparatedList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function composePath(allowedRoot: string, slug: string): string {
  const separator = allowedRoot.includes("\\") ? "\\" : "/";
  return `${allowedRoot.replace(/[\\/]+$/, "")}${separator}${slug}`;
}

export function commandForUseCase(
  preset: GuidedWorkspaceUseCasePreset,
  runtimePreset?: RuntimeCapabilityPreset
): string {
  if (!runtimePreset) {
    return `copilot --agent ${preset.agentName} --prompt "${preset.commandPrompt}"`;
  }
  return runtimePreset.default_command_template.replace(
    /--prompt\s+"[^"]*"/,
    `--prompt "${preset.commandPrompt}"`
  );
}

export function buildGuidedWorkspaceSetup(draft: GuidedWorkspaceDraft): GuidedWorkspaceSetup {
  const requiredFields = [
    draft.workspaceName,
    draft.slug,
    draft.rootPath,
    draft.policyName,
    draft.agentName,
    draft.commandTemplate,
  ];
  if (requiredFields.some((value) => value.trim().length === 0)) {
    throw new Error("Guided setup requires workspace, policy, agent, root path, and command.");
  }
  if (draft.policyPrefixes.length === 0) {
    throw new Error("Guided setup requires at least one allowed command prefix.");
  }

  return {
    agent: {
      command_template: draft.commandTemplate,
      environment: {},
      is_active: true,
      name: draft.agentName,
      runtime: draft.runtime,
      system_prompt: draft.systemPrompt,
    },
    policy: {
      allow_network: draft.allowNetwork,
      allow_write: draft.allowWrite,
      allowed_command_prefixes: draft.policyPrefixes,
      description: `${draft.workspaceName} guided setup policy.`,
      max_runtime_seconds: 900,
      name: draft.policyName,
    },
    workspace: {
      description: draft.description,
      name: draft.workspaceName,
      root_path: draft.rootPath,
      slug: draft.slug,
      status: "active",
      tags: draft.tags,
    },
  };
}

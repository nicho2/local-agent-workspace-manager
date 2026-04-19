import { describe, expect, it } from "vitest";

import { nextCommandTemplate } from "@/lib/runtime-presets";
import type { RuntimeCapabilityPreset } from "@/lib/types";

const presets: RuntimeCapabilityPreset[] = [
  {
    runtime: "copilot_cli",
    display_name: "GitHub Copilot CLI",
    description: "Copilot CLI profile for local repository or documentation triage.",
    default_command_template:
      'copilot --agent wiki-maintenance --autopilot --yolo --max-autopilot-continues 6 --prompt "Lance la maintenance standard du coffre"',
    supports_dry_run: true,
    requires_write_access: false,
    requires_network_access: true,
    recommended_policy_prefixes: ["copilot --agent"],
    environment_defaults: {},
  },
  {
    runtime: "codex",
    display_name: "Codex",
    description: "Codex CLI profile for local agent tasks with explicit policy review.",
    default_command_template: "codex run maintenance",
    supports_dry_run: true,
    requires_write_access: true,
    requires_network_access: false,
    recommended_policy_prefixes: ["codex run"],
    environment_defaults: {},
  },
];

describe("runtime preset command defaults", () => {
  it("uses the selected runtime default when the command has not been edited", () => {
    expect(nextCommandTemplate(presets, "copilot_cli", "", false)).toBe(
      'copilot --agent wiki-maintenance --autopilot --yolo --max-autopilot-continues 6 --prompt "Lance la maintenance standard du coffre"'
    );
  });

  it("preserves a manually edited command when the runtime changes", () => {
    expect(nextCommandTemplate(presets, "codex", "custom command", true)).toBe(
      "custom command"
    );
  });
});

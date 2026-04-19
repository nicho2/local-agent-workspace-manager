import type { AgentRuntime, RuntimeCapabilityPreset } from "@/lib/types";

export function findRuntimePreset(
  presets: RuntimeCapabilityPreset[],
  runtime: AgentRuntime
): RuntimeCapabilityPreset | undefined {
  return presets.find((preset) => preset.runtime === runtime);
}

export function nextCommandTemplate(
  presets: RuntimeCapabilityPreset[],
  runtime: AgentRuntime,
  currentCommand: string,
  commandTouched: boolean
): string {
  if (commandTouched && currentCommand.trim().length > 0) {
    return currentCommand;
  }

  return findRuntimePreset(presets, runtime)?.default_command_template ?? currentCommand;
}

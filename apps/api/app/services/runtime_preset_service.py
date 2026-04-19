from app.schemas.agent import AgentRuntime, RuntimeCapabilityPreset


RUNTIME_CAPABILITY_PRESETS: tuple[RuntimeCapabilityPreset, ...] = (
    RuntimeCapabilityPreset(
        runtime=AgentRuntime.copilot_cli,
        display_name="GitHub Copilot CLI",
        description="Copilot CLI profile for local repository or documentation triage.",
        default_command_template=(
            'copilot --agent wiki-maintenance --autopilot --yolo '
            '--max-autopilot-continues 6 --prompt "Lance la maintenance standard du coffre"'
        ),
        supports_dry_run=True,
        requires_write_access=False,
        requires_network_access=True,
        recommended_policy_prefixes=["copilot --agent"],
        environment_defaults={},
    ),
    RuntimeCapabilityPreset(
        runtime=AgentRuntime.codex,
        display_name="Codex",
        description="Codex CLI profile for local agent tasks with explicit policy review.",
        default_command_template="codex run maintenance",
        supports_dry_run=True,
        requires_write_access=True,
        requires_network_access=False,
        recommended_policy_prefixes=["codex run"],
        environment_defaults={},
    ),
    RuntimeCapabilityPreset(
        runtime=AgentRuntime.local_command,
        display_name="Local command",
        description="Generic local command profile for project scripts and checks.",
        default_command_template="python -m pytest",
        supports_dry_run=True,
        requires_write_access=False,
        requires_network_access=False,
        recommended_policy_prefixes=["python -m"],
        environment_defaults={},
    ),
)


def list_runtime_capability_presets() -> list[RuntimeCapabilityPreset]:
    return list(RUNTIME_CAPABILITY_PRESETS)

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

for relative in [
    "storage/sqlite",
    "storage/logs",
    "storage/artifacts",
    "examples/workspaces/demo-maintenance",
    "examples/workspaces/repo-triage",
]:
    (ROOT / relative).mkdir(parents=True, exist_ok=True)

for relative in [
    "storage/sqlite/.gitkeep",
    "storage/logs/.gitkeep",
    "storage/artifacts/.gitkeep",
]:
    path = ROOT / relative
    path.touch(exist_ok=True)

print("Storage and example directories are ready.")

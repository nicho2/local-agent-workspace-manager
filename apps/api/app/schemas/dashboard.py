from app.schemas.common import ModelBase
from app.schemas.run import RunRead


class DashboardSummary(ModelBase):
    workspaces: int
    agents: int
    enabled_schedules: int
    recent_runs: list[RunRead]
    execution_enabled: bool

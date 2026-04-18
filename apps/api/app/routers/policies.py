from fastapi import APIRouter

from app.core.config import get_settings
from app.schemas.policy import WorkspacePolicyCreate, WorkspacePolicyRead
from app.services.policy_service import create_policy, list_policies

router = APIRouter(prefix="/policies", tags=["policies"])


@router.get("", response_model=list[WorkspacePolicyRead])
def get_policies() -> list[WorkspacePolicyRead]:
    return list_policies(get_settings().database_path)


@router.post("", response_model=WorkspacePolicyRead, status_code=201)
def post_policy(payload: WorkspacePolicyCreate) -> WorkspacePolicyRead:
    return create_policy(get_settings().database_path, payload)

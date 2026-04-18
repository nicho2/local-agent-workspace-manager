from datetime import datetime
from pathlib import Path

from app.core.errors import internal_error, not_found
from app.db.database import get_connection, utc_now_iso
from app.schemas.settings import SystemSettingRead


def _row_to_setting(row: object) -> SystemSettingRead:
    assert isinstance(row, dict) or hasattr(row, "__getitem__")
    return SystemSettingRead(
        key=row["key"],
        value=row["value"],
        description=row["description"],
        updated_at=datetime.fromisoformat(row["updated_at"]),
    )


def list_settings(database_path: Path) -> list[SystemSettingRead]:
    with get_connection(database_path) as connection:
        rows = connection.execute("SELECT * FROM system_settings ORDER BY key ASC").fetchall()
    return [_row_to_setting(row) for row in rows]


def get_setting_value(database_path: Path, key: str) -> str | None:
    with get_connection(database_path) as connection:
        row = connection.execute(
            "SELECT value FROM system_settings WHERE key = ?",
            (key,),
        ).fetchone()
    return str(row["value"]) if row is not None else None


def get_bool_setting(database_path: Path, key: str, *, default: bool = False) -> bool:
    value = get_setting_value(database_path, key)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def update_setting(database_path: Path, key: str, value: str) -> SystemSettingRead:
    with get_connection(database_path) as connection:
        row = connection.execute(
            "SELECT * FROM system_settings WHERE key = ?",
            (key,),
        ).fetchone()
        if row is None:
            raise not_found("setting", key)

        connection.execute(
            "UPDATE system_settings SET value = ?, updated_at = ? WHERE key = ?",
            (value, utc_now_iso(), key),
        )
        updated = connection.execute(
            "SELECT * FROM system_settings WHERE key = ?",
            (key,),
        ).fetchone()

    if updated is None:
        raise internal_error("setting_update_failed", "Failed to update setting")
    return _row_to_setting(updated)

from datetime import datetime
from pathlib import Path

from fastapi import HTTPException

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


def update_setting(database_path: Path, key: str, value: str) -> SystemSettingRead:
    with get_connection(database_path) as connection:
        row = connection.execute(
            "SELECT * FROM system_settings WHERE key = ?",
            (key,),
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Setting not found")

        connection.execute(
            "UPDATE system_settings SET value = ?, updated_at = ? WHERE key = ?",
            (value, utc_now_iso(), key),
        )
        updated = connection.execute(
            "SELECT * FROM system_settings WHERE key = ?",
            (key,),
        ).fetchone()

    if updated is None:
        raise HTTPException(status_code=500, detail="Failed to update setting")
    return _row_to_setting(updated)

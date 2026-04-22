from datetime import datetime, timedelta, timezone

from app.core.errors import bad_request


class _CronField:
    def __init__(self, expression: str, minimum: int, maximum: int) -> None:
        self._expression = expression
        self._minimum = minimum
        self._maximum = maximum
        self.values = self._parse(expression)

    def _parse(self, expression: str) -> set[int]:
        values: set[int] = set()
        for part in expression.split(","):
            values.update(self._parse_part(part.strip()))
        if not values:
            raise ValueError("empty cron field")
        return values

    def _parse_part(self, part: str) -> set[int]:
        if not part:
            raise ValueError("empty cron token")

        if "/" in part:
            base, step_text = part.split("/", 1)
            if not step_text.isdigit() or int(step_text) <= 0:
                raise ValueError("invalid cron step")
            step = int(step_text)
        else:
            base = part
            step = 1

        if base == "*":
            start, end = self._minimum, self._maximum
        elif "-" in base:
            start_text, end_text = base.split("-", 1)
            start = int(start_text)
            end = int(end_text)
        else:
            value = int(base)
            self._ensure_in_range(value)
            return {value}

        if start > end:
            raise ValueError("invalid cron range")
        self._ensure_in_range(start)
        self._ensure_in_range(end)
        return set(range(start, end + 1, step))

    def _ensure_in_range(self, value: int) -> None:
        if value < self._minimum or value > self._maximum:
            raise ValueError("cron value out of range")

    def matches(self, value: int) -> bool:
        return value in self.values


class _CronExpression:
    def __init__(self, expression: str) -> None:
        parts = expression.split()
        if len(parts) != 5:
            raise ValueError("cron expression must have 5 fields")

        self.minute = _CronField(parts[0], 0, 59)
        self.hour = _CronField(parts[1], 0, 23)
        self.day_of_month = _CronField(parts[2], 1, 31)
        self.month = _CronField(parts[3], 1, 12)
        self.day_of_week = _CronField(parts[4], 0, 7)

    def matches(self, value: datetime) -> bool:
        cron_weekday = (value.weekday() + 1) % 7
        day_of_week_match = self.day_of_week.matches(cron_weekday) or (
            cron_weekday == 0 and self.day_of_week.matches(7)
        )
        day_of_month_match = self.day_of_month.matches(value.day)

        dom_is_wildcard = len(self.day_of_month.values) == 31
        dow_is_wildcard = len(self.day_of_week.values) in {7, 8}
        day_match = (
            day_of_month_match or day_of_week_match
            if not dom_is_wildcard and not dow_is_wildcard
            else day_of_month_match and day_of_week_match
        )

        return (
            self.minute.matches(value.minute)
            and self.hour.matches(value.hour)
            and self.month.matches(value.month)
            and day_match
        )


def validate_cron_expression(expression: str | None) -> None:
    if not expression:
        raise bad_request(
            "schedule_cron_expression_required",
            "cron_expression is required when mode=cron",
            {"mode": "cron"},
        )
    try:
        _CronExpression(expression)
    except ValueError as exc:
        raise bad_request(
            "schedule_cron_expression_invalid",
            "Invalid cron_expression",
            {"cron_expression": expression},
        ) from exc


def calculate_next_cron_run(expression: str, *, now: datetime | None = None) -> str:
    try:
        cron = _CronExpression(expression)
    except ValueError as exc:
        raise bad_request(
            "schedule_cron_expression_invalid",
            "Invalid cron_expression",
            {"cron_expression": expression},
        ) from exc

    base = now or datetime.now(timezone.utc)
    if base.tzinfo is None:
        base = base.replace(tzinfo=timezone.utc)
    candidate = base.astimezone(timezone.utc).replace(second=0, microsecond=0) + timedelta(
        minutes=1
    )

    for _ in range(366 * 24 * 60):
        if cron.matches(candidate):
            return candidate.isoformat()
        candidate += timedelta(minutes=1)
    raise bad_request(
        "schedule_cron_expression_invalid",
        "Invalid cron_expression",
        {"cron_expression": expression},
    )

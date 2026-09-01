"""
Inaya — AI metrics.

Pure, deterministic calculations over a project's tasks. These numbers do two
jobs: (1) they are fed into the AI prompts as grounding facts, and (2) they ARE
the fallback when an AI call fails. No network, no randomness — same input
always gives the same output.
"""

from datetime import date, datetime
from typing import Dict, Any, List

import models


def _to_date(d):
    if d is None:
        return None
    if isinstance(d, datetime):
        return d.date()
    return d


def compute_project_metrics(project: "models.Project") -> Dict[str, Any]:
    """Crunch a project's tasks into a metrics dict."""
    tasks: List[models.Task] = list(project.tasks)
    today = date.today()

    total = len(tasks)
    by_status: Dict[str, int] = {}
    for t in tasks:
        key = t.status.value if hasattr(t.status, "value") else str(t.status)
        by_status[key] = by_status.get(key, 0) + 1

    done = by_status.get("done", 0)
    blocked = by_status.get("blocked", 0)
    in_progress = by_status.get("in_progress", 0)
    review = by_status.get("review", 0)
    todo = by_status.get("todo", 0)

    completion_pct = round((done / total) * 100) if total else 0

    # Overdue = past due date and not done
    overdue = []
    for t in tasks:
        due = _to_date(t.due_date)
        is_done = (t.status.value if hasattr(t.status, "value") else str(t.status)) == "done"
        if due and not is_done and due < today:
            overdue.append(t)
    overdue_count = len(overdue)

    # Effort: estimated vs actual on completed work
    est_hours = sum(t.estimated_hours or 0 for t in tasks)
    actual_hours = sum(t.actual_hours or 0 for t in tasks if t.actual_hours)

    # Project window progress (time elapsed vs schedule)
    start = _to_date(project.start_date)
    end = _to_date(project.end_date)
    time_elapsed_pct = None
    days_remaining = None
    if start and end and end > start:
        total_days = (end - start).days
        elapsed = (today - start).days
        time_elapsed_pct = max(0, min(100, round((elapsed / total_days) * 100)))
        days_remaining = (end - today).days

    # Priority spread of open (not done) work
    open_by_priority: Dict[str, int] = {}
    for t in tasks:
        is_done = (t.status.value if hasattr(t.status, "value") else str(t.status)) == "done"
        if not is_done:
            p = t.priority.value if hasattr(t.priority, "value") else str(t.priority)
            open_by_priority[p] = open_by_priority.get(p, 0) + 1

    critical_open = open_by_priority.get("critical", 0)

    return {
        "project_name": project.name,
        "project_key": project.key,
        "declared_status": project.status.value if hasattr(project.status, "value") else str(project.status),
        "total_tasks": total,
        "by_status": by_status,
        "done": done,
        "todo": todo,
        "in_progress": in_progress,
        "review": review,
        "blocked": blocked,
        "completion_pct": completion_pct,
        "overdue_count": overdue_count,
        "overdue_titles": [t.title for t in overdue][:5],
        "estimated_hours": est_hours,
        "actual_hours": actual_hours,
        "time_elapsed_pct": time_elapsed_pct,
        "days_remaining": days_remaining,
        "open_by_priority": open_by_priority,
        "critical_open": critical_open,
    }


def derive_status(m: Dict[str, Any]) -> str:
    """
    Rule-based project health, one of: on_track / at_risk / delayed / completed.
    This is the deterministic fallback for the AI's derived_status.
    """
    if m["total_tasks"] > 0 and m["completion_pct"] == 100:
        return "completed"

    # Delayed: schedule mostly gone but work well behind, or lots overdue
    behind_schedule = (
        m["time_elapsed_pct"] is not None
        and m["time_elapsed_pct"] >= 75
        and m["completion_pct"] < 50
    )
    if behind_schedule or m["overdue_count"] >= 3:
        return "delayed"

    # At risk: any blocker, some overdue, critical open work, or past deadline with work left
    past_deadline = m["days_remaining"] is not None and m["days_remaining"] < 0 and m["completion_pct"] < 100
    if m["blocked"] > 0 or m["overdue_count"] >= 1 or m["critical_open"] >= 1 or past_deadline:
        return "at_risk"

    return "on_track"


def fallback_summary(m: Dict[str, Any]) -> str:
    """Plain-language progress summary computed without any AI (the fallback)."""
    parts = [
        f"{m['project_name']} is {m['completion_pct']}% complete "
        f"({m['done']} of {m['total_tasks']} tasks done)."
    ]
    if m["in_progress"] or m["review"]:
        parts.append(f"{m['in_progress']} in progress and {m['review']} in review.")
    if m["blocked"]:
        parts.append(f"{m['blocked']} task(s) are blocked and need attention.")
    if m["overdue_count"]:
        parts.append(f"{m['overdue_count']} task(s) are past their due date.")
    if m["days_remaining"] is not None:
        if m["days_remaining"] < 0:
            parts.append(f"The planned end date passed {abs(m['days_remaining'])} day(s) ago.")
        else:
            parts.append(f"{m['days_remaining']} day(s) remain in the schedule.")
    return " ".join(parts)


# ---- Effort estimation baseline (used to ground Groq + as its fallback) ----

# Rough baseline hours per category, scaled by priority. Deterministic.
_CATEGORY_BASE = {
    "development": 16,
    "design": 10,
    "testing": 8,
    "documentation": 5,
    "research": 12,
}
_PRIORITY_FACTOR = {
    "low": 0.8,
    "medium": 1.0,
    "high": 1.25,
    "critical": 1.5,
}


def fallback_estimate(category: str, priority: str, title: str = "") -> int:
    base = _CATEGORY_BASE.get(category, 10)
    factor = _PRIORITY_FACTOR.get(priority, 1.0)
    # small nudge for longer/more complex titles
    complexity = 1.0 + min(len(title), 80) / 400.0
    return max(1, round(base * factor * complexity))
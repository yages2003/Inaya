"""AI metrics, estimation fallback, and risk detection (pure logic)."""
from datetime import date, timedelta
from types import SimpleNamespace

from ai.metrics import (
    compute_project_metrics, derive_status, fallback_summary, fallback_estimate,
)
from ai.risk_detector import detect_risks


def _task(status="todo", priority="medium", category="development",
          due=None, start=None, est=None, actual=None):
    return SimpleNamespace(
        status=SimpleNamespace(value=status),
        priority=SimpleNamespace(value=priority),
        category=SimpleNamespace(value=category),
        due_date=due, start_date=start, created_at=date.today(),
        estimated_hours=est, actual_hours=actual, title="T")


def _project(tasks, status="on_track", start=None, end=None):
    today = date.today()
    return SimpleNamespace(
        name="P", key="P",
        status=SimpleNamespace(value=status),
        start_date=start or (today - timedelta(days=10)),
        end_date=end or (today + timedelta(days=10)),
        tasks=tasks)


def test_completion_pct():
    p = _project([_task("done"), _task("done"), _task("todo"), _task("todo")])
    m = compute_project_metrics(p)
    assert m["completion_pct"] == 50
    assert m["done"] == 2
    assert m["total_tasks"] == 4


def test_empty_project_metrics():
    m = compute_project_metrics(_project([]))
    assert m["completion_pct"] == 0
    assert m["total_tasks"] == 0


def test_overdue_counted():
    yesterday = date.today() - timedelta(days=1)
    p = _project([_task("in_progress", due=yesterday), _task("todo", due=yesterday)])
    m = compute_project_metrics(p)
    assert m["overdue_count"] == 2


def test_done_task_not_overdue():
    yesterday = date.today() - timedelta(days=1)
    p = _project([_task("done", due=yesterday)])
    m = compute_project_metrics(p)
    assert m["overdue_count"] == 0


def test_derive_status_completed():
    p = _project([_task("done"), _task("done")])
    assert derive_status(compute_project_metrics(p)) == "completed"


def test_derive_status_at_risk_when_blocked():
    p = _project([_task("blocked"), _task("todo")])
    assert derive_status(compute_project_metrics(p)) == "at_risk"


def test_derive_status_delayed_when_past_deadline():
    past = date.today() - timedelta(days=5)
    p = _project([_task("todo"), _task("todo"), _task("todo")],
                 start=date.today() - timedelta(days=30), end=past)
    assert derive_status(compute_project_metrics(p)) == "delayed"


def test_fallback_estimate_scales_with_priority():
    low = fallback_estimate("development", "low", "task")
    crit = fallback_estimate("development", "critical", "task")
    assert crit > low


def test_fallback_estimate_minimum_one():
    assert fallback_estimate("documentation", "low", "") >= 1


def test_fallback_summary_mentions_completion():
    p = _project([_task("done"), _task("todo")])
    s = fallback_summary(compute_project_metrics(p))
    assert "50%" in s or "complete" in s.lower()


def test_risk_dependency_bottleneck():
    p = _project([_task("blocked"), _task("todo")])
    risks = detect_risks(compute_project_metrics(p))
    assert any(r["scenario"] == "dependency_bottleneck" for r in risks)


def test_risk_velocity_drop_past_deadline():
    past = date.today() - timedelta(days=5)
    p = _project([_task("todo"), _task("todo")],
                 start=date.today() - timedelta(days=30), end=past)
    risks = detect_risks(compute_project_metrics(p))
    assert any(r["scenario"] == "velocity_drop" for r in risks)


def test_risk_scope_creep():
    # 90% schedule elapsed, 0% done, 4 open tasks
    start = date.today() - timedelta(days=27)
    end = date.today() + timedelta(days=3)
    p = _project([_task("todo") for _ in range(4)], start=start, end=end)
    risks = detect_risks(compute_project_metrics(p))
    assert any(r["scenario"] == "scope_creep" for r in risks)


def test_no_risks_on_healthy_project():
    p = _project([_task("done"), _task("in_progress")],
                 start=date.today() - timedelta(days=2), end=date.today() + timedelta(days=20))
    risks = detect_risks(compute_project_metrics(p))
    assert len(risks) == 0
"""
Inaya — Week 8: Risk-signal detection.

Deterministic detectors for the three RFP scenarios:
  1. scope creep          — work added faster than it's closed / growing backlog
  2. dependency bottleneck — blocked tasks holding up the project
  3. velocity drop         — little/no recent completion relative to schedule

Pure rules over the metrics dict. No AI needed (Gemini is used to *explain*
these in narrative form separately). Returns a list of signal dicts ready to
persist to the risk_signals table.
"""

from typing import Dict, Any, List


def detect_risks(m: Dict[str, Any]) -> List[Dict[str, Any]]:
    signals: List[Dict[str, Any]] = []

    total = m["total_tasks"]
    if total == 0:
        return signals

    open_tasks = total - m["done"]
    open_ratio = open_tasks / total

    # ---- 1. Scope creep ----
    # Lots of open work relative to how far along the schedule is: the backlog
    # isn't shrinking the way the timeline says it should.
    if m["time_elapsed_pct"] is not None:
        expected_done_pct = m["time_elapsed_pct"]
        actual_done_pct = m["completion_pct"]
        gap = expected_done_pct - actual_done_pct
        if gap >= 30 and open_tasks >= 3:
            level = "high" if gap >= 50 else "medium"
            signals.append({
                "scenario": "scope_creep",
                "level": level,
                "explanation": (
                    f"Schedule is {expected_done_pct}% elapsed but only "
                    f"{actual_done_pct}% of tasks are done — a {gap}-point gap, "
                    f"with {open_tasks} tasks still open. Backlog is outpacing delivery."
                ),
                "recommendation": (
                    "Re-baseline scope: defer non-critical tasks, split large items, "
                    "and confirm no new work is being added without trade-offs."
                ),
            })

    # ---- 2. Dependency bottleneck ----
    if m["blocked"] >= 1:
        level = "high" if m["blocked"] >= 2 else "medium"
        signals.append({
            "scenario": "dependency_bottleneck",
            "level": level,
            "explanation": (
                f"{m['blocked']} task(s) are in a blocked state, which can stall "
                f"dependent work downstream and idle the team."
            ),
            "recommendation": (
                "Triage blockers today: identify the dependency owner for each, "
                "escalate anything waiting on an external party, and re-sequence "
                "unblocked work to keep momentum."
            ),
        })

    # ---- 3. Velocity drop ----
    # Past or near the deadline with a lot still open, or a high overdue count:
    # completion is not keeping pace.
    past_deadline = m["days_remaining"] is not None and m["days_remaining"] < 0
    near_deadline = m["days_remaining"] is not None and 0 <= m["days_remaining"] <= 7
    if (past_deadline and m["completion_pct"] < 100) or \
       (near_deadline and open_ratio > 0.4) or \
       (m["overdue_count"] >= 3):
        if past_deadline or m["overdue_count"] >= 3:
            level = "high"
        else:
            level = "medium"
        if past_deadline:
            detail = f"the planned end date passed {abs(m['days_remaining'])} day(s) ago with {open_tasks} task(s) still open"
        elif near_deadline:
            detail = f"only {m['days_remaining']} day(s) remain but {open_tasks} of {total} tasks are still open"
        else:
            detail = f"{m['overdue_count']} task(s) are already overdue"
        signals.append({
            "scenario": "velocity_drop",
            "level": level,
            "explanation": (
                f"Delivery pace is behind schedule: {detail}. At the current rate "
                f"the remaining work is unlikely to finish on time."
            ),
            "recommendation": (
                "Protect the critical path: pull in help on the highest-priority "
                "open items, cut or defer low-priority scope, and set a realistic "
                "revised finish date with stakeholders."
            ),
        })

    return signals
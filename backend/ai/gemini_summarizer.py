"""
Inaya — Week 8: Progress summaries & stakeholder narratives via Gemini.

Uses Gemini 2.5 Flash through LangChain to turn a project's real metrics into:
  - a plain-language progress summary
  - an executive narrative (outcome/risk framing for leadership)
  - an operational narrative (task-level detail for the delivery team)

Everything is grounded in the metrics dict (facts, not invention). If Gemini is
unavailable, deterministic fallbacks are used so the feature never breaks.
"""

import os
import json
import logging
from typing import Dict, Any

from ai.metrics import fallback_summary, derive_status

logger = logging.getLogger("Inaya.ai.gemini")

GEMINI_MODEL = "gemini-2.5-flash"


def _build_llm():
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key or api_key == "placeholder":
        return None
    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(model=GEMINI_MODEL, temperature=0.3,
                                      max_retries=1, timeout=30)
    except Exception as e:
        logger.warning("Gemini client init failed: %s", e)
        return None


def _facts_block(m: Dict[str, Any]) -> str:
    """A compact, factual context string the model must ground its writing in."""
    lines = [
        f"Project: {m['project_name']} ({m.get('project_key') or 'no key'})",
        f"Declared status: {m['declared_status']}",
        f"Tasks: {m['total_tasks']} total, {m['done']} done ({m['completion_pct']}% complete)",
        f"In progress: {m['in_progress']}, In review: {m['review']}, To do: {m['todo']}, Blocked: {m['blocked']}",
        f"Overdue tasks: {m['overdue_count']}",
    ]
    if m["overdue_titles"]:
        lines.append("Overdue examples: " + "; ".join(m["overdue_titles"]))
    if m["time_elapsed_pct"] is not None:
        lines.append(f"Schedule elapsed: {m['time_elapsed_pct']}%, days remaining: {m['days_remaining']}")
    if m["open_by_priority"]:
        pr = ", ".join(f"{k}: {v}" for k, v in m["open_by_priority"].items())
        lines.append(f"Open work by priority: {pr}")
    return "\n".join(lines)


def _fallback_narratives(m: Dict[str, Any]) -> Dict[str, str]:
    summary = fallback_summary(m)
    exec_n = (
        f"{m['project_name']} is {m['completion_pct']}% complete and currently "
        f"tracked as '{m['declared_status']}'. "
        + ("Immediate attention is needed on blocked and overdue items. "
           if (m["blocked"] or m["overdue_count"]) else "Delivery is proceeding. ")
        + (f"{m['days_remaining']} days remain in the plan." if m["days_remaining"] is not None else "")
    )
    op_n = (
        f"Board state — done: {m['done']}, in progress: {m['in_progress']}, "
        f"review: {m['review']}, to do: {m['todo']}, blocked: {m['blocked']}. "
        + (f"{m['overdue_count']} task(s) are past due and should be re-planned. "
           if m["overdue_count"] else "No overdue tasks. ")
        + (f"{m['critical_open']} critical item(s) remain open." if m["critical_open"] else "")
    )
    return {"progress_summary": summary,
            "executive_narrative": exec_n.strip(),
            "operational_narrative": op_n.strip()}


def generate_summary(m: Dict[str, Any]) -> Dict[str, Any]:
    """
    Returns:
      {
        "progress_summary": str,
        "executive_narrative": str,
        "operational_narrative": str,
        "derived_status": str,     # on_track | at_risk | delayed | completed
        "source": "gemini" | "fallback",
        "model": str | None,
      }
    """
    status = derive_status(m)          # rule-based, always available
    llm = _build_llm()

    if llm is None:
        out = _fallback_narratives(m)
        out.update({"derived_status": status, "source": "fallback", "model": None})
        return out

    try:
        from langchain_core.prompts import ChatPromptTemplate
        facts = _facts_block(m)
        system = (
            "You are a project analyst writing for a software delivery tool. "
            "Using ONLY the facts provided, write three things about the project. "
            "Be concrete and reference the real numbers. Do not invent tasks or dates. "
            "Return ONLY a JSON object with exactly these keys and string values:\n"
            '{{"progress_summary": "...", "executive_narrative": "...", '
            '"operational_narrative": "..."}}\n'
            "progress_summary: 2-3 sentences, plain language, overall state.\n"
            "executive_narrative: 2-3 sentences for leadership — outcomes, risk, timeline.\n"
            "operational_narrative: 2-3 sentences for the delivery team — task-level focus and next actions."
        )
        prompt = ChatPromptTemplate.from_messages([
            ("system", system),
            ("human", "Facts:\n{facts}\n\nWrite the JSON now."),
        ])
        chain = prompt | llm
        resp = chain.invoke({"facts": facts})
        text = resp.content.strip()
        if text.startswith("```"):
            text = text.strip("`")
            if text.lstrip().lower().startswith("json"):
                text = text.lstrip()[4:]
        s, e = text.find("{"), text.rfind("}")
        data = json.loads(text[s:e + 1])
        return {
            "progress_summary": str(data["progress_summary"]).strip(),
            "executive_narrative": str(data["executive_narrative"]).strip(),
            "operational_narrative": str(data["operational_narrative"]).strip(),
            "derived_status": status,
            "source": "gemini",
            "model": GEMINI_MODEL,
        }
    except Exception as ex:
        logger.warning("Gemini summary failed, using fallback: %s", ex)
        out = _fallback_narratives(m)
        out.update({"derived_status": status, "source": "fallback", "model": None})
        return out
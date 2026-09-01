"""
Inaya — Week 7: Effort estimation via Groq (Llama 3.3 70B) + LangChain.

Given a task's title, description, category, and priority, predict how many
hours it will take. Uses ChatGroq through LangChain; if the model is
unavailable or returns junk, falls back to a deterministic estimate so the
feature never breaks a demo.
"""

import os
import json
import logging
from typing import Dict, Any

from ai.metrics import fallback_estimate

logger = logging.getLogger("Inaya.ai.groq")

GROQ_MODEL = "llama-3.3-70b-versatile"

_SYSTEM = (
    "You are an expert software delivery estimator. Given a work item, estimate "
    "the effort in whole hours for a competent engineer. Consider the category "
    "and priority. Respond with ONLY a JSON object, no prose, no markdown:\n"
    '{{"estimated_hours": <integer>, "rationale": "<one short sentence>"}}'
)


def _build_llm():
    """Create a ChatGroq client, or None if no key / import fails."""
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key or api_key == "placeholder":
        return None
    try:
        from langchain_groq import ChatGroq
        return ChatGroq(model=GROQ_MODEL, temperature=0.2, max_retries=1, timeout=20)
    except Exception as e:  # import error, etc.
        logger.warning("Groq client init failed: %s", e)
        return None


def _parse_json(text: str) -> Dict[str, Any]:
    """Pull a JSON object out of the model's reply, tolerating stray text/fences."""
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        # drop a leading 'json' language hint if present
        if text.lstrip().lower().startswith("json"):
            text = text.lstrip()[4:]
    start, end = text.find("{"), text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return json.loads(text[start:end + 1])
    raise ValueError("no JSON object found in model output")


def estimate_task_effort(*, title: str, description: str, category: str,
                         priority: str) -> Dict[str, Any]:
    """
    Returns:
      {
        "estimated_hours": int,
        "rationale": str,
        "source": "groq" | "fallback",
        "model": str | None,
      }
    """
    baseline = fallback_estimate(category, priority, title)
    llm = _build_llm()

    if llm is None:
        return {
            "estimated_hours": baseline,
            "rationale": "Estimated from category and priority baselines (AI unavailable).",
            "source": "fallback",
            "model": None,
        }

    try:
        from langchain_core.prompts import ChatPromptTemplate
        prompt = ChatPromptTemplate.from_messages([
            ("system", _SYSTEM),
            ("human",
             "Title: {title}\nDescription: {description}\n"
             "Category: {category}\nPriority: {priority}\n"
             "Baseline guess (hours): {baseline}\n\n"
             "Give your best estimate as JSON."),
        ])
        chain = prompt | llm
        resp = chain.invoke({
            "title": title, "description": description or "(none)",
            "category": category, "priority": priority, "baseline": baseline,
        })
        data = _parse_json(resp.content)
        hours = int(round(float(data["estimated_hours"])))
        hours = max(1, min(hours, 2000))  # sanity clamp
        return {
            "estimated_hours": hours,
            "rationale": str(data.get("rationale", "")).strip()[:300] or "Estimated by Groq.",
            "source": "groq",
            "model": GROQ_MODEL,
        }
    except Exception as e:
        logger.warning("Groq estimation failed, using fallback: %s", e)
        return {
            "estimated_hours": baseline,
            "rationale": "Estimated from category and priority baselines (AI call failed).",
            "source": "fallback",
            "model": None,
        }
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  IconSparkles, IconRefresh, IconAlertTriangle, IconClipboardText, IconUserCircle,
  IconTargetArrow, IconInfoCircle, IconClock,
} from "@tabler/icons-react";
import { getInsights, generateInsights, estimateTask } from "../api/client";
import { PROJECT_STATUS } from "../constants";

const RISK_LABEL = {
  scope_creep: "Scope creep",
  dependency_bottleneck: "Dependency bottleneck",
  velocity_drop: "Velocity drop",
};
const RISK_COLOR = {
  low: { text: "text-amber-500 dark:text-amber-400", dot: "bg-amber-500" },
  medium: { text: "text-orange-500 dark:text-orange-400", dot: "bg-orange-500" },
  high: { text: "text-red-500 dark:text-red-400", dot: "bg-red-500" },
};
const RISK_BADGE = {
  low: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  medium: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
  high: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
};

const TABS = [
  { value: "summary", label: "Summary", icon: IconClipboardText },
  { value: "executive", label: "Executive", icon: IconUserCircle },
  { value: "operational", label: "Operational", icon: IconTargetArrow },
];

export default function AIInsightsPanel({ projectId, canGenerate, tasks = [] }) {
  const [summary, setSummary] = useState(null);
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [source, setSource] = useState(null);
  const [tab, setTab] = useState("summary");

  const [estimateTaskId, setEstimateTaskId] = useState("");
  const [estimating, setEstimating] = useState(false);
  const [estimates, setEstimates] = useState({}); // taskId -> hours

  const load = async () => {
    setLoading(true);
    try {
      const data = await getInsights(projectId);
      setSummary(data.summary?.progress_summary ? data.summary : null);
      setRisks(data.risks || []);
    } catch {
      setSummary(null);
      setRisks([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [projectId]);

  const generate = async () => {
    setGenerating(true);
    try {
      const data = await generateInsights(projectId);
      setSummary(data.summary);
      setRisks(data.risks || []);
      setSource(data.summary?.source);
      toast.success(data.summary?.source === "gemini" ? "Insights generated with Gemini." : "Insights generated (offline fallback).");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Generation failed.");
    } finally {
      setGenerating(false);
    }
  };

  const runEstimate = async () => {
    if (!estimateTaskId) return;
    setEstimating(true);
    try {
      const res = await estimateTask(Number(estimateTaskId));
      setEstimates((prev) => ({ ...prev, [estimateTaskId]: res.estimated_hours ?? res.hours ?? res }));
      toast.success("Effort estimated.");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Estimation failed.");
    } finally {
      setEstimating(false);
    }
  };

  const derived = summary?.derived_status;
  const derivedMeta = derived ? PROJECT_STATUS[derived] : null;

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            <IconSparkles size={20} />
          </div>
          <div>
            <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100">AI insights</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">Progress summary, stakeholder narratives, and risk signals</p>
          </div>
        </div>
        {canGenerate && !loading && (
          <button onClick={generate} disabled={generating}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-100 disabled:opacity-60 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20">
            <IconRefresh size={16} className={generating ? "animate-spin" : ""} />
            {generating ? "Generating…" : summary ? "Regenerate" : "Generate insights"}
          </button>
        )}
      </div>

      {loading ? (
        <div className="animate-fade-in space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-5 w-32 skeleton rounded-full" />
            <div className="h-4 w-20 skeleton" />
          </div>
          <div className="h-8 w-64 skeleton rounded-lg" />
          <div className="space-y-2">
            <div className="h-3.5 w-full skeleton" />
            <div className="h-3.5 w-11/12 skeleton" />
            <div className="h-3.5 w-2/3 skeleton" />
          </div>
          <div className="space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <div className="h-3 w-24 skeleton" />
            <div className="h-10 w-full skeleton rounded-lg" />
            <div className="h-10 w-full skeleton rounded-lg" />
          </div>
        </div>
      ) : !summary ? (
        <div className="flex flex-col items-center gap-3 rounded-lg bg-slate-50 px-4 py-8 text-center dark:bg-slate-800/60">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10 dark:text-indigo-400">
            <IconSparkles size={20} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No insights yet</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {canGenerate ? "Generate an AI-powered progress summary, narratives, and risk signals for this project."
                : "An analysis hasn't been run for this project yet."}
            </p>
          </div>
          {canGenerate && (
            <button onClick={generate} disabled={generating}
              className="mt-1 flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60">
              <IconSparkles size={16} /> Generate insights
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {derivedMeta && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-slate-500 dark:text-slate-400">AI-assessed status:</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${derivedMeta.bg} ${derivedMeta.text}`}>{derivedMeta.label}</span>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <span className="text-slate-500 dark:text-slate-400">{summary.completion_pct}% complete</span>
              {(source || summary.model_used) && (
                <span className={`ml-auto rounded-full border px-2 py-0.5 text-xs ${
                  (source || summary.model_used) === "fallback" ? "border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400" : "border-indigo-200 text-indigo-600 dark:border-indigo-500/30 dark:text-indigo-400"}`}>
                  {source === "gemini" || (summary.model_used && summary.model_used !== "fallback") ? "Gemini" : "offline fallback"}
                </span>
              )}
            </div>
          )}

          <div>
            <div className="mb-3 flex gap-1 rounded-lg bg-slate-100 p-1 text-sm dark:bg-slate-800">
              {TABS.map((t) => (
                <button key={t.value} onClick={() => setTab(t.value)}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors ${
                    tab === t.value ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-slate-100" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"}`}>
                  <t.icon size={15} /> {t.label}
                </button>
              ))}
            </div>
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {tab === "summary" && summary.progress_summary}
              {tab === "executive" && summary.executive_narrative}
              {tab === "operational" && summary.operational_narrative}
            </p>
          </div>

          <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Risk signals</p>
            {risks.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                <IconInfoCircle size={15} /> No active risks detected.
              </div>
            ) : (
              <div className="space-y-2">
                {risks.map((r) => {
                  const { text: textColor, dot: dotColor } = RISK_COLOR[r.level] || { text: "text-slate-500 dark:text-slate-400", dot: "bg-slate-400" };
                  const badge = RISK_BADGE[r.level] || "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300";
                  return (
                    <div key={r.id} className={`rounded-lg border-l-2 bg-slate-50/60 py-2 pl-3 pr-3 dark:bg-slate-800/60 ${dotColor.replace("bg-", "border-")}`}>
                      <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                        <IconAlertTriangle size={14} className={textColor} />
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{RISK_LABEL[r.scenario] || r.scenario}</span>
                        <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${badge}`}>{r.level}</span>
                      </div>
                      <p className="mb-0.5 text-xs text-slate-500 dark:text-slate-400">{r.explanation}</p>
                      {r.recommendation && <p className="text-xs italic text-slate-600 dark:text-slate-400">→ {r.recommendation}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
        <div className="mb-2 flex items-center gap-2">
          <IconClock size={16} className="text-indigo-600 dark:text-indigo-400" />
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Effort estimation</p>
        </div>
        <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">Estimate predicted hours for a specific task using AI.</p>
        <div className="flex items-center gap-2">
          <select value={estimateTaskId} onChange={(e) => setEstimateTaskId(e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition-colors focus-ring dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <option value="">Select a task…</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>{t.title}{estimates[t.id] ? ` — ${estimates[t.id]}h` : ""}</option>
            ))}
          </select>
          <button onClick={runEstimate} disabled={!estimateTaskId || estimating}
            className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-60">
            {estimating ? "Estimating…" : "Estimate"}
          </button>
        </div>
        {estimateTaskId && estimates[estimateTaskId] != null && (
          <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-slate-700 dark:bg-indigo-500/10 dark:text-slate-300">
            Predicted effort: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{estimates[estimateTaskId]} hours</span>
          </p>
        )}
      </div>
    </div>
  );
}

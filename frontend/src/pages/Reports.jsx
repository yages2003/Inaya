import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { IconPrinter, IconUserCircle, IconTargetArrow, IconFileAnalytics } from "@tabler/icons-react";
import { getProjects, getInsights } from "../api/client";

export default function Reports() {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try { setProjects(await getProjects()); } catch { setProjects([]); }
    })();
  }, []);

  useEffect(() => {
    if (!projectId) { setSummary(null); return; }
    (async () => {
      setLoading(true);
      try {
        const data = await getInsights(Number(projectId));
        setSummary(data.summary?.executive_narrative || data.summary?.operational_narrative ? data.summary : null);
      } catch (e) {
        toast.error("Couldn't load report.");
        setSummary(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

  const project = projects.find((p) => String(p.id) === String(projectId));

  return (
    <>
      <div className="mb-6 flex items-center justify-between no-print">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Reports</h2>
          <p className="text-sm text-slate-500">Executive and operational narratives for a project.</p>
        </div>
        {summary && (
          <button onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700">
            <IconPrinter size={16} /> Print
          </button>
        )}
      </div>

      <div className="mb-6 no-print">
        <label className="mb-1 block text-sm font-medium text-slate-700">Project</label>
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition-colors focus-ring">
          <option value="">Select a project…</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {loading && (
        <div className="animate-fade-in no-print">
          <div className="mb-6 border-b border-slate-200 pb-4">
            <div className="mb-2 h-6 w-56 skeleton" />
            <div className="h-3.5 w-40 skeleton" />
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="card space-y-2 p-5">
                <div className="mb-2 h-4 w-40 skeleton" />
                <div className="h-3.5 w-full skeleton" />
                <div className="h-3.5 w-11/12 skeleton" />
                <div className="h-3.5 w-2/3 skeleton" />
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && !projectId && (
        <div className="flex flex-col items-center gap-3 py-16 text-center no-print">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <IconFileAnalytics size={22} />
          </div>
          <p className="text-sm text-slate-500">Select a project above to view its report.</p>
        </div>
      )}

      {!loading && projectId && !summary && (
        <div className="flex flex-col items-center gap-3 py-16 text-center no-print">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <IconFileAnalytics size={22} />
          </div>
          <p className="text-sm text-slate-500">No AI insights available for this project yet. Generate insights from its AI Insights tab first.</p>
        </div>
      )}

      {!loading && summary && (
        <div>
          <div className="mb-6 border-b border-slate-200 pb-4 print:mb-4">
            <h3 className="text-xl font-bold text-slate-800">{project?.name}</h3>
            <p className="text-sm text-slate-500">Report generated {new Date().toLocaleDateString()}</p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="card p-5">
              <div className="mb-3 flex items-center gap-2">
                <IconUserCircle size={18} className="text-indigo-600" />
                <h4 className="font-semibold text-slate-800">Executive Narrative</h4>
              </div>
              <p className="text-sm leading-relaxed text-slate-700">{summary.executive_narrative || "No executive narrative available."}</p>
            </div>
            <div className="card p-5">
              <div className="mb-3 flex items-center gap-2">
                <IconTargetArrow size={18} className="text-indigo-600" />
                <h4 className="font-semibold text-slate-800">Operational Narrative</h4>
              </div>
              <p className="text-sm leading-relaxed text-slate-700">{summary.operational_narrative || "No operational narrative available."}</p>
            </div>
          </div>
        </div>
      )}

    </>
  );
}

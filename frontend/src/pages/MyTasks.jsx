import { useEffect, useState } from "react";
import { IconChecklist } from "@tabler/icons-react";
import { getMyTasks } from "../api/client";
import { TASK_STATUS, TASK_PRIORITY, TASK_CATEGORY, dueMeta } from "../constants";
import { useAuth } from "../auth/AuthContext";

function TaskItem({ t }) {
  const s = TASK_STATUS[t.status] || {};
  const p = TASK_PRIORITY[t.priority] || {};
  const due = dueMeta(t.due_date);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-2 flex items-center justify-between">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.bg} ${s.text}`}>{s.label}</span>
        <span className={`flex items-center gap-1 text-xs font-medium ${p.text}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" /> {p.label}
        </span>
      </div>
      <p className="mb-2 text-sm font-medium text-slate-800">{t.title}</p>
      <div className="flex flex-wrap gap-1.5">
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{TASK_CATEGORY[t.category]}</span>
        {due && <span className={`rounded px-1.5 py-0.5 text-xs ${due.bg} ${due.text}`}>{due.label}</span>}
      </div>
    </div>
  );
}

export default function MyTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { setTasks(await getMyTasks()); } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-[110px] rounded-xl" />)}
    </div>
  );

  const active = tasks.filter((t) => t.status !== "done");
  const done = tasks.filter((t) => t.status === "done");

  return (
    <>
      <h2 className="mb-1 text-2xl font-bold text-slate-800">My tasks</h2>
      <p className="mb-6 text-sm text-slate-500">Everything assigned to {user?.name}.</p>
      {tasks.length === 0 ? (
        <div className="flex h-56 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-white/60">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <IconChecklist size={22} />
          </div>
          <p className="text-sm text-slate-500">You have no assigned tasks right now.</p>
        </div>
      ) : (
        <div className="space-y-8">
          <div>
            <p className="mb-3 font-semibold text-slate-800">Active ({active.length})</p>
            {active.length === 0 ? (
              <p className="text-sm text-slate-500">Nothing active. Nice work.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {active.map((t) => <TaskItem key={t.id} t={t} />)}
              </div>
            )}
          </div>
          {done.length > 0 && (
            <div>
              <p className="mb-3 font-semibold text-slate-800">Completed ({done.length})</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {done.map((t) => <TaskItem key={t.id} t={t} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

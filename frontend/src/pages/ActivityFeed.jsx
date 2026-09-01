import { useEffect, useState } from "react";
import { IconPlus, IconArrowRight, IconMessage, IconFlag, IconActivity } from "@tabler/icons-react";
import { getActivity } from "../api/client";

const ICONS = {
  project_created: IconPlus, task_created: IconPlus,
  task_status_changed: IconArrowRight, project_status_changed: IconFlag,
  comment_added: IconMessage,
};

export default function ActivityFeed() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try { setItems(await getActivity({ limit: 100 })); } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-6">
      {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-10" />)}
    </div>
  );

  return (
    <>
      <h2 className="mb-6 text-2xl font-bold text-slate-800">Activity</h2>
      {items.length === 0 ? (
        <div className="flex h-56 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-white/60">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <IconActivity size={22} />
          </div>
          <p className="text-sm text-slate-500">No activity recorded yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <ul className="space-y-5">
            {items.map((it) => {
              const Icon = ICONS[it.event_type] || IconArrowRight;
              return (
                <li key={it.id} className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                    <Icon size={14} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-700">{it.description}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{new Date(it.created_at).toLocaleString()}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}

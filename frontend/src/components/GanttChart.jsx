import { useMemo, useState } from "react";
import {
  ComposedChart, XAxis, YAxis, Bar, Cell, ReferenceLine, ResponsiveContainer, Tooltip,
} from "recharts";
import { IconTimeline } from "@tabler/icons-react";
import { TASK_STATUS } from "../constants";

const DAY = 24 * 60 * 60 * 1000;

function toDate(s) {
  if (!s) return null;
  const d = new Date(typeof s === "string" && s.length === 10 ? s + "T00:00:00" : s);
  return isNaN(d.getTime()) ? null : d;
}
function daysBetween(a, b) { return Math.round((b - a) / DAY); }
function fmtShort(d) { return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }); }

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const meta = TASK_STATUS[d.status] || { label: d.status, bg: "bg-slate-100", text: "text-slate-600" };
  return (
    <div className="min-w-[180px] rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-lg">
      <p className="mb-1.5 font-semibold text-slate-800">{d.title}</p>
      <div className="flex items-center gap-1.5">
        <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-medium ${meta.bg} ${meta.text}`}>{meta.label}</span>
      </div>
      <p className="mt-1.5 text-slate-500">{fmtShort(d._start)} → {fmtShort(d._end)}</p>
      {d.overdue && (
        <p className="mt-1.5 flex items-center gap-1 font-medium text-red-600">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Overdue
        </p>
      )}
    </div>
  );
}

export default function GanttChart({ tasks }) {
  const [hoverIdx, setHoverIdx] = useState(null);

  const model = useMemo(() => {
    const withDates = tasks
      .map((t) => {
        const start = toDate(t.start_date) || toDate(t.created_at);
        const end = toDate(t.due_date) || (start ? new Date(start.getTime() + 3 * DAY) : null);
        return { ...t, _start: start, _end: end };
      })
      .filter((t) => t._start && t._end)
      .sort((a, b) => a._start - b._start);

    if (withDates.length === 0) return null;

    let min = withDates[0]._start, max = withDates[0]._end;
    withDates.forEach((t) => {
      if (t._start < min) min = t._start;
      if (t._end > max) max = t._end;
    });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (today < min) min = today;
    if (today > max) max = today;
    min = new Date(min.getTime() - 2 * DAY);
    max = new Date(max.getTime() + 2 * DAY);

    const data = withDates.map((t) => {
      const overdue = t.status !== "done" && t._end < today;
      return {
        ...t,
        overdue,
        startOffset: daysBetween(min, t._start),
        duration: Math.max(1, daysBetween(t._start, t._end)),
      };
    });

    return { data, min, max, totalDays: Math.max(1, daysBetween(min, max)), today };
  }, [tasks]);

  if (!model) {
    return (
      <div className="card flex flex-col items-center gap-3 p-10 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <IconTimeline size={20} />
        </div>
        <p className="text-sm text-slate-500">No tasks with dates to display. Add start and due dates to see the timeline.</p>
      </div>
    );
  }

  const { data, min, totalDays, today } = model;
  const ROW_H = 46;
  const height = data.length * ROW_H + 60;
  const todayOffset = daysBetween(min, today);

  return (
    <div className="card p-4">
      <div className="mb-4 flex flex-wrap items-center gap-3 border-b border-slate-100 pb-3">
        <p className="font-semibold text-slate-800">Timeline</p>
        <span className="flex items-center gap-1.5 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Overdue / slipped
        </span>
        <span className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="h-2.5 border-l-2 border-dashed border-red-400" /> Today
        </span>
      </div>

      <div style={{ width: "100%", overflowX: "auto" }}>
        <div style={{ minWidth: 700, height }}>
          <ResponsiveContainer width="100%" height={height}>
            <ComposedChart data={data} layout="vertical" margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
              onMouseLeave={() => setHoverIdx(null)}>
              <XAxis
                type="number" domain={[0, totalDays]}
                tickFormatter={(v) => fmtShort(new Date(min.getTime() + v * DAY))}
                tick={{ fontSize: 11, fill: "#94a3b8", fontFamily: "Inter, sans-serif" }}
                axisLine={{ stroke: "#e2e8f0" }}
                tickLine={{ stroke: "#e2e8f0" }}
                ticks={Array.from({ length: Math.floor(totalDays / 7) + 1 }, (_, i) => i * 7)}
              />
              <YAxis type="category" dataKey="title" width={200}
                tick={{ fontSize: 12, fill: "#334155", fontFamily: "Inter, sans-serif" }}
                axisLine={{ stroke: "#e2e8f0" }}
                tickLine={false}
                tickFormatter={(v) => (v.length > 24 ? v.slice(0, 24) + "…" : v)} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine x={todayOffset} stroke="#EF4444" strokeWidth={2} strokeDasharray="4 3" />
              {/* invisible offset bar to push the visible bar to the right start position */}
              <Bar dataKey="startOffset" stackId="gantt" fill="transparent" isAnimationActive={false} />
              <Bar dataKey="duration" stackId="gantt" radius={4} isAnimationActive={false}
                onMouseEnter={(_, i) => setHoverIdx(i)}>
                {data.map((t, i) => {
                  const meta = TASK_STATUS[t.status] || { solid: "#94a3b8" };
                  return (
                    <Cell key={t.id} fill={meta.solid}
                      fillOpacity={t.status === "done" ? 0.55 : 0.9}
                      stroke={t.overdue ? "#b91c1c" : "transparent"}
                      strokeWidth={t.overdue ? 2 : 0} />
                  );
                })}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

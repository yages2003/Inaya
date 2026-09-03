import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  IconPlus, IconFolders, IconChecklist, IconAlertTriangle, IconCircleCheck, IconSearch,
} from "@tabler/icons-react";

import { getProjects, createProject, getTasks } from "../api/client";
import { PROJECT_STATUS } from "../constants";
import { useAuth } from "../auth/AuthContext";
import Modal from "../components/Modal";

function StatCard({ icon, label, value, color }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${color.bg} ${color.text}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
          <p className="text-2xl font-bold leading-tight text-slate-800 dark:text-slate-100">{value}</p>
        </div>
      </div>
    </div>
  );
}

function ProjectCard({ project, tasksForProject, onOpen }) {
  const meta = PROJECT_STATUS[project.status] || { label: project.status, bg: "bg-slate-100 dark:bg-slate-700/50", text: "text-slate-600 dark:text-slate-300", solid: "bg-slate-400" };
  const total = tasksForProject.length;
  const done = tasksForProject.filter((t) => t.status === "done").length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div
      onClick={() => onOpen(project.id)}
      className="cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {project.key && (
            <span className="rounded bg-indigo-600 px-1.5 py-0.5 text-xs font-semibold text-white">{project.key}</span>
          )}
          <span className="truncate text-lg font-semibold text-slate-800 dark:text-slate-100">{project.name}</span>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${meta.bg} ${meta.text}`}>{meta.label}</span>
      </div>
      <p className="min-h-10 text-sm text-slate-500 line-clamp-2 dark:text-slate-400">{project.description || "No description"}</p>
      <div className="mb-1 mt-4 flex items-center justify-between">
        <span className="text-xs text-slate-500 dark:text-slate-400">{done}/{total} tasks done</span>
        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
        <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">{project.start_date} → {project.end_date}</p>
    </div>
  );
}

export default function Dashboard() {
  const { can } = useAuth();
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [opened, setOpened] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "", key: "", description: "", status: "on_track", start_date: "", end_date: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const [p, t] = await Promise.all([getProjects(), getTasks()]);
      setProjects(p);
      setTasks(t);
    } catch (e) {
      toast.error("Couldn't load dashboard: " + String(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.name || !form.start_date || !form.end_date) {
      toast.error("Name, start and end dates are required.");
      return;
    }
    setSaving(true);
    try {
      await createProject({
        name: form.name, key: form.key || null, description: form.description,
        status: form.status, start_date: form.start_date, end_date: form.end_date,
      });
      toast.success("Project created.");
      setOpened(false);
      setForm({ name: "", key: "", description: "", status: "on_track", start_date: "", end_date: "" });
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Create failed: " + String(e));
    } finally {
      setSaving(false);
    }
  };

  const tasksByProject = useMemo(() => {
    const m = {};
    tasks.forEach((t) => { (m[t.project_id] = m[t.project_id] || []).push(t); });
    return m;
  }, [tasks]);

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
        || (p.key || "").toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, search, statusFilter]);

  const stats = {
    total: projects.length,
    atRisk: projects.filter((p) => p.status === "at_risk" || p.status === "delayed").length,
    completed: projects.filter((p) => p.status === "completed").length,
    openTasks: tasks.filter((t) => t.status !== "done").length,
  };

  const filters = [
    { label: "All", value: "all" },
    { label: "On track", value: "on_track" },
    { label: "At risk", value: "at_risk" },
    { label: "Delayed", value: "delayed" },
  ];

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Dashboard</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Overview of all projects and work.</p>
        </div>
        {can("project_create") && (
          <button onClick={() => setOpened(true)}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            <IconPlus size={16} /> New project
          </button>
        )}
      </div>

      {loading ? (
        <div>
          <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-[70px] rounded-xl" />)}
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-[150px] rounded-xl" />)}
          </div>
        </div>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard icon={<IconFolders size={22} />} label="Projects" value={stats.total} color={{ bg: "bg-indigo-50 dark:bg-indigo-500/10", text: "text-indigo-600 dark:text-indigo-400" }} />
            <StatCard icon={<IconChecklist size={22} />} label="Open tasks" value={stats.openTasks} color={{ bg: "bg-blue-50 dark:bg-blue-500/10", text: "text-blue-600 dark:text-blue-400" }} />
            <StatCard icon={<IconAlertTriangle size={22} />} label="Needs attention" value={stats.atRisk} color={{ bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-600 dark:text-amber-400" }} />
            <StatCard icon={<IconCircleCheck size={22} />} label="Completed" value={stats.completed} color={{ bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" }} />
          </div>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Projects</h4>
            <div className="flex items-center gap-3">
              <div className="relative">
                <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  placeholder="Search projects…" value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-[220px] rounded-lg border border-slate-200 py-1.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500"
                />
              </div>
              <div className="flex rounded-lg bg-slate-100 p-1 text-xs dark:bg-slate-800">
                {filters.map((f) => (
                  <button key={f.value} onClick={() => setStatusFilter(f.value)}
                    className={`rounded-md px-2.5 py-1 font-medium transition ${statusFilter === f.value ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-slate-100" : "text-slate-500 dark:text-slate-400"}`}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="flex h-56 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-white/60 dark:border-slate-700 dark:bg-slate-900/40">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                <IconFolders size={22} />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {projects.length === 0 ? "No projects yet." : "No projects match your filters."}
              </p>
              {projects.length === 0 && can("project_create") && (
                <button onClick={() => setOpened(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-100 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20">
                  <IconPlus size={16} /> Create your first project
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => (
                <ProjectCard key={p.id} project={p}
                  tasksForProject={tasksByProject[p.id] || []}
                  onOpen={(id) => navigate(`/projects/${id}`)} />
              ))}
            </div>
          )}
        </>
      )}

      <Modal opened={opened} onClose={() => setOpened(false)} title="New project">
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Name</label>
              <input required placeholder="e.g. Customer Portal Revamp" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" />
            </div>
            <div className="w-24">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Key</label>
              <input placeholder="CPR" maxLength={10} value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value.toUpperCase() })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
            <textarea placeholder="What is this project about?" rows={2} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {Object.entries(PROJECT_STATUS).map(([value, m]) => (
                <option key={value} value={value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Start date</label>
              <input type="date" required value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:[color-scheme:dark]" />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">End date</label>
              <input type="date" required value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:[color-scheme:dark]" />
            </div>
          </div>
          <button onClick={submit} disabled={saving}
            className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
            {saving ? "Creating…" : "Create project"}
          </button>
        </div>
      </Modal>
    </>
  );
}

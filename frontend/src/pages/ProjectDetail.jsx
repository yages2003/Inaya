import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  IconPlus, IconArrowLeft, IconSend, IconLayoutKanban, IconTimeline, IconFlag3Filled,
  IconLayoutList, IconSparkles, IconActivity, IconTrash, IconPencil,
} from "@tabler/icons-react";

import KanbanBoard from "../components/KanbanBoard";
import GanttChart from "../components/GanttChart";
import AIInsightsPanel from "../components/AIInsightsPanel";
import Modal from "../components/Modal";
import { useAuth } from "../auth/AuthContext";
import {
  getProject, getTasks, createTask, updateTask, deleteTask, getAssignees, getComments, addComment,
  getActivity, updateProject,
} from "../api/client";
import {
  PROJECT_STATUS, TASK_STATUS, TASK_PRIORITY, TASK_CATEGORY, initials, avatarColor, dueMeta,
} from "../constants";

function newTaskForm() {
  return {
    title: "", description: "", category: "development", priority: "medium",
    estimated_hours: "", start_date: "", due_date: "", assignee_ids: [],
  };
}

const TABS = [
  { value: "overview", label: "Overview", icon: IconLayoutList },
  { value: "board", label: "Kanban", icon: IconLayoutKanban },
  { value: "timeline", label: "Timeline", icon: IconTimeline },
  { value: "ai", label: "AI Insights", icon: IconSparkles },
  { value: "activity", label: "Activity", icon: IconActivity },
];

const PRIORITY_FILTERS = [
  { label: "All", value: "all" },
  { label: "Critical", value: "critical" },
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
];

function Badge({ children, className = "" }) {
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>{children}</span>;
}

export default function ProjectDetail() {
  const { id } = useParams();
  const projectId = Number(id);
  const { can } = useAuth();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [loading, setLoading] = useState(true);

  const [taskModal, setTaskModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(newTaskForm());

  const [detailModal, setDetailModal] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  const [priorityFilter, setPriorityFilter] = useState("all");
  const [tab, setTab] = useState("overview");

  const [projectActivity, setProjectActivity] = useState([]);
  const [activityLoaded, setActivityLoaded] = useState(false);

  const loadTasks = useCallback(async () => {
    setTasks(await getTasks({ project_id: projectId }));
  }, [projectId]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [p, a] = await Promise.all([getProject(projectId), getAssignees()]);
      setProject(p);
      setAssignees(a);
      await loadTasks();
    } catch (e) {
      toast.error("Load failed: " + String(e));
    } finally {
      setLoading(false);
    }
  }, [projectId, loadTasks]);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    if (tab !== "activity" || activityLoaded) return;
    (async () => {
      try {
        const all = await getActivity({ limit: 200 });
        setProjectActivity(all.filter((a) => a.project_id === projectId));
      } catch {
        setProjectActivity([]);
      } finally {
        setActivityLoaded(true);
      }
    })();
  }, [tab, activityLoaded, projectId]);

  const handleStatusChange = async (taskId, newStatus) => {
    const prev = tasks;
    setTasks((ts) => ts.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    try {
      await updateTask(taskId, { status: newStatus });
    } catch (e) {
      setTasks(prev);
      toast.error(e?.response?.data?.detail || "Couldn't move task.");
    }
  };

  const submitTask = async () => {
    if (!form.title) {
      toast.error("Title is required.");
      return;
    }
    setSaving(true);
    try {
      await createTask({
        title: form.title, description: form.description, category: form.category,
        priority: form.priority, estimated_hours: form.estimated_hours ? Number(form.estimated_hours) : null,
        start_date: form.start_date || null, due_date: form.due_date || null,
        project_id: projectId, assignee_ids: form.assignee_ids.map(Number),
      });
      toast.success("Task created.");
      setTaskModal(false);
      setForm(newTaskForm());
      loadTasks();
    } catch (e) {
      toast.error(JSON.stringify(e?.response?.data?.detail || String(e)));
    } finally {
      setSaving(false);
    }
  };

  const openTask = async (task) => {
    setActiveTask(task);
    setDetailModal(true);
    try { setComments(await getComments(task.id)); } catch { setComments([]); }
  };

  const submitComment = async () => {
    if (!commentText.trim()) return;
    try {
      await addComment(activeTask.id, { content: commentText, author_id: null });
      setCommentText("");
      setComments(await getComments(activeTask.id));
    } catch {
      toast.error("Couldn't add comment.");
    }
  };

  const removeTask = async () => {
    if (!activeTask) return;
    if (!window.confirm(`Delete task "${activeTask.title}"? This can't be undone.`)) return;
    setDeleting(true);
    try {
      await deleteTask(activeTask.id);
      toast.success("Task deleted.");
      setDetailModal(false);
      setActiveTask(null);
      loadTasks();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Couldn't delete task.");
    } finally {
      setDeleting(false);
    }
  };

  const openEditProject = () => {
    setEditForm({
      name: project.name, key: project.key || "", description: project.description || "",
      status: project.status, start_date: project.start_date || "", end_date: project.end_date || "",
    });
    setEditModal(true);
  };

  const submitEditProject = async () => {
    if (!editForm.name || !editForm.start_date || !editForm.end_date) {
      toast.error("Name, start and end dates are required.");
      return;
    }
    setEditSaving(true);
    try {
      const updated = await updateProject(projectId, {
        name: editForm.name, key: editForm.key || null, description: editForm.description,
        status: editForm.status, start_date: editForm.start_date, end_date: editForm.end_date,
      });
      setProject(updated);
      toast.success("Project updated.");
      setEditModal(false);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Couldn't update project.");
    } finally {
      setEditSaving(false);
    }
  };

  const visibleTasks = useMemo(() => {
    if (priorityFilter === "all") return tasks;
    return tasks.filter((t) => t.priority === priorityFilter);
  }, [tasks, priorityFilter]);

  if (loading) return (
    <div className="animate-fade-in">
      <div className="mb-2 h-4 w-40 skeleton" />
      <div className="mb-4 flex items-center gap-3">
        <div className="h-9 w-9 skeleton rounded-lg" />
        <div className="h-7 w-56 skeleton" />
        <div className="h-6 w-20 skeleton rounded-full" />
      </div>
      <div className="mb-5 h-4 w-2/3 skeleton" />
      <div className="mb-4 flex gap-1 border-b border-slate-200 pb-2 dark:border-slate-800">
        {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-6 w-24 skeleton rounded-md" />)}
      </div>
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card p-4">
            <div className="mb-2 h-3 w-16 skeleton" />
            <div className="h-6 w-10 skeleton" />
          </div>
        ))}
      </div>
      <div className="card h-32 p-5">
        <div className="h-4 w-1/3 skeleton" />
      </div>
    </div>
  );
  if (!project) return (
    <div className="flex h-[300px] flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
        <IconLayoutList size={22} />
      </div>
      <p className="text-slate-500 dark:text-slate-400">Project not found.</p>
      <Link to="/" className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">Back to projects</Link>
    </div>
  );

  const meta = PROJECT_STATUS[project.status] || { label: project.status, bg: "bg-slate-100 dark:bg-slate-700/50", text: "text-slate-600 dark:text-slate-300" };
  const pk = project.key || "TASK";

  const doneCount = tasks.filter((t) => t.status === "done").length;
  const overviewStats = [
    { label: "Total tasks", value: tasks.length },
    { label: "Done", value: doneCount },
    { label: "In progress", value: tasks.filter((t) => t.status === "in_progress").length },
    { label: "Blocked", value: tasks.filter((t) => t.status === "blocked").length },
  ];

  return (
    <>
      <nav className="mb-2 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
        <Link to="/" className="font-medium text-indigo-600 transition-colors hover:text-indigo-700 hover:underline dark:text-indigo-400">Projects</Link>
        <span className="text-slate-300 dark:text-slate-600">/</span>
        <span className="text-slate-600 dark:text-slate-300">{project.name}</span>
      </nav>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/" className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300">
            <IconArrowLeft size={18} />
          </Link>
          {project.key && <Badge className="bg-indigo-600 font-semibold tracking-wide text-white">{project.key}</Badge>}
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{project.name}</h2>
          <Badge className={`${meta.bg} ${meta.text}`}>{meta.label}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {can("project_edit") && (
            <button onClick={openEditProject}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
              <IconPencil size={15} /> Edit project
            </button>
          )}
          {can("task_create") && (
            <button onClick={() => setTaskModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700">
              <IconPlus size={16} /> New task
            </button>
          )}
        </div>
      </div>

      {project.description && <p className="mb-5 text-slate-500 dark:text-slate-400">{project.description}</p>}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button key={t.value} onClick={() => setTab(t.value)}
              className={`relative flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors ${
                tab === t.value ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"}`}>
              <t.icon size={16} /> {t.label}
              {tab === t.value && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />}
            </button>
          ))}
        </div>
        {(tab === "board" || tab === "timeline") && (
          <div className="flex items-center gap-2 pb-2">
            <IconFlag3Filled size={13} className="text-slate-400 dark:text-slate-500" />
            <div className="flex rounded-lg bg-slate-100 p-1 text-xs dark:bg-slate-800">
              {PRIORITY_FILTERS.map((f) => (
                <button key={f.value} onClick={() => setPriorityFilter(f.value)}
                  className={`rounded-md px-2.5 py-1 font-medium transition-colors ${priorityFilter === f.value ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-slate-100" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {tab === "overview" && (
        <div className="animate-fade-in">
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {overviewStats.map((s) => (
              <div key={s.label} className="card p-4 transition-shadow hover:shadow-md">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{s.label}</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{s.value}</p>
              </div>
            ))}
          </div>
          <div className="card grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Timeline</p>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{project.start_date} → {project.end_date}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Status</p>
              <Badge className={`mt-1 ${meta.bg} ${meta.text}`}>{meta.label}</Badge>
            </div>
          </div>
        </div>
      )}

      {tab === "board" && (
        <div className="animate-fade-in">
          <KanbanBoard tasks={visibleTasks} onStatusChange={handleStatusChange}
            canEdit={can("task_edit_any") || can("task_edit_own")} projectKey={pk} onOpenTask={openTask} />
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">Tip: drag a card between columns to change its status.</p>
        </div>
      )}

      {tab === "timeline" && <div className="animate-fade-in"><GanttChart tasks={visibleTasks} /></div>}

      {tab === "ai" && <div className="animate-fade-in"><AIInsightsPanel projectId={projectId} canGenerate={can("project_view")} tasks={tasks} /></div>}

      {tab === "activity" && (
        <div className="card animate-fade-in p-5">
          {!activityLoaded ? (
            <div className="space-y-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="border-l-2 border-slate-100 pl-3 dark:border-slate-700">
                  <div className="mb-1.5 h-3.5 w-2/3 skeleton" />
                  <div className="h-3 w-24 skeleton" />
                </div>
              ))}
            </div>
          ) : projectActivity.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                <IconActivity size={20} />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">No activity recorded for this project yet.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {projectActivity.map((a) => (
                <li key={a.id} className="border-l-2 border-indigo-200 pl-3 dark:border-indigo-500/30">
                  <p className="text-sm text-slate-700 dark:text-slate-300">{a.description}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{new Date(a.created_at).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Modal opened={taskModal} onClose={() => setTaskModal(false)} title="New task">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Title</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition-colors focus-ring dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
            <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition-colors focus-ring dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition-colors focus-ring dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {Object.entries(TASK_CATEGORY).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Priority</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition-colors focus-ring dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {Object.entries(TASK_PRIORITY).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Estimated hours</label>
              <input type="number" min={0} value={form.estimated_hours}
                onChange={(e) => setForm({ ...form, estimated_hours: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition-colors focus-ring dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Start date</label>
              <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition-colors focus-ring dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:[color-scheme:dark]" />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Due date</label>
              <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition-colors focus-ring dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:[color-scheme:dark]" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Assignees</label>
            <select multiple value={form.assignee_ids}
              onChange={(e) => setForm({ ...form, assignee_ids: Array.from(e.target.selectedOptions, (o) => o.value) })}
              className="h-28 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition-colors focus-ring dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {assignees.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <button onClick={submitTask} disabled={saving}
            className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60">
            {saving ? "Creating…" : "Create task"}
          </button>
        </div>
      </Modal>

      <Modal opened={detailModal} onClose={() => setDetailModal(false)} size="lg"
        title={activeTask ? `${pk}-${activeTask.id}` : ""}>
        {activeTask && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{activeTask.title}</h3>
              {can("task_delete") && (
                <button onClick={removeTask} disabled={deleting}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-60 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20">
                  <IconTrash size={14} /> {deleting ? "Deleting…" : "Delete"}
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={`${TASK_STATUS[activeTask.status]?.bg} ${TASK_STATUS[activeTask.status]?.text}`}>
                {TASK_STATUS[activeTask.status]?.label}
              </Badge>
              <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
                {TASK_PRIORITY[activeTask.priority]?.label} priority
              </Badge>
              <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300">{TASK_CATEGORY[activeTask.category]}</Badge>
              {activeTask.due_date && (() => {
                const d = dueMeta(activeTask.due_date);
                return <Badge className={`${d.bg} ${d.text}`}>{d.label}</Badge>;
              })()}
            </div>
            {activeTask.description && <p className="text-sm text-slate-600 dark:text-slate-300">{activeTask.description}</p>}
            {activeTask.assignees?.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500 dark:text-slate-400">Assignees:</span>
                <div className="flex -space-x-2">
                  {activeTask.assignees.map((a) => (
                    <div key={a.id} title={a.name}
                      className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-xs font-semibold text-white dark:border-slate-800 ${avatarColor(a.name)}`}>
                      {initials(a.name)}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="border-t border-slate-100 pt-3 dark:border-slate-700">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Comments</p>
              <div className="mb-3 space-y-2">
                {comments.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No comments yet.</p>}
                {comments.map((c) => (
                  <div key={c.id} className="rounded-lg border border-slate-100 p-2.5 dark:border-slate-700">
                    <p className="text-sm text-slate-700 dark:text-slate-300">{c.content}</p>
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{new Date(c.created_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
              {can("comment_create") && (
                <div className="flex items-end gap-2">
                  <textarea placeholder="Write a comment…" rows={1} value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition-colors focus-ring dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" />
                  <button onClick={submitComment}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700">
                    <IconSend size={16} /> Send
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal opened={editModal} onClose={() => setEditModal(false)} title="Edit project">
        {editForm && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Name</label>
                <input required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition-colors focus-ring dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" />
              </div>
              <div className="w-24">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Key</label>
                <input maxLength={10} value={editForm.key}
                  onChange={(e) => setEditForm({ ...editForm, key: e.target.value.toUpperCase() })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition-colors focus-ring dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
              <textarea rows={2} value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition-colors focus-ring dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
              <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition-colors focus-ring dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {Object.entries(PROJECT_STATUS).map(([value, m]) => (
                  <option key={value} value={value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Start date</label>
                <input type="date" required value={editForm.start_date}
                  onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition-colors focus-ring dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:[color-scheme:dark]" />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">End date</label>
                <input type="date" required value={editForm.end_date}
                  onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition-colors focus-ring dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:[color-scheme:dark]" />
              </div>
            </div>
            <button onClick={submitEditProject} disabled={editSaving}
              className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60">
              {editSaving ? "Saving…" : "Save changes"}
            </button>
          </div>
        )}
      </Modal>
    </>
  );
}


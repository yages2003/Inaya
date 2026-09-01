// Inaya domain constants + shared helpers.
// Colors are Tailwind-compatible: { bg, text, dot, border } utility classes.

export const PROJECT_STATUS = {
  on_track: { label: "On track", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", solid: "bg-emerald-500" },
  at_risk: { label: "At risk", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", solid: "bg-amber-500" },
  delayed: { label: "Delayed", bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500", solid: "bg-red-500" },
  completed: { label: "Completed", bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-500", solid: "bg-violet-500" },
};

export const TASK_STATUS = {
  todo: { label: "To do", bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400", solid: "#94a3b8" },
  in_progress: { label: "In progress", bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", solid: "#3b82f6" },
  review: { label: "In review", bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-500", solid: "#8B5CF6" },
  done: { label: "Done", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", solid: "#10B981" },
  blocked: { label: "Blocked", bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500", solid: "#EF4444" },
};

export const TASK_COLUMNS = ["todo", "in_progress", "review", "done", "blocked"];

export const TASK_PRIORITY = {
  low: { label: "Low", bg: "bg-slate-100", text: "text-slate-500" },
  medium: { label: "Medium", bg: "bg-blue-50", text: "text-blue-600" },
  high: { label: "High", bg: "bg-amber-50", text: "text-amber-600" },
  critical: { label: "Critical", bg: "bg-red-50", text: "text-red-600" },
};

export const TASK_CATEGORY = {
  development: "Development",
  design: "Design",
  testing: "Testing",
  documentation: "Documentation",
  research: "Research",
};

export const ROLE_LABELS = {
  super_admin: "Super Admin",
  org_admin: "Organization Admin",
  project_manager: "Project Manager",
  scrum_master: "Scrum Master",
  developer: "Developer",
  qa_engineer: "QA Engineer",
  reporter: "Reporter",
  viewer: "Viewer",
};

export const ROLE_COLORS = {
  super_admin: { bg: "bg-red-50", text: "text-red-700" },
  org_admin: { bg: "bg-purple-50", text: "text-purple-700" },
  project_manager: { bg: "bg-emerald-50", text: "text-emerald-700" },
  scrum_master: { bg: "bg-cyan-50", text: "text-cyan-700" },
  developer: { bg: "bg-blue-50", text: "text-blue-700" },
  qa_engineer: { bg: "bg-green-50", text: "text-green-700" },
  reporter: { bg: "bg-orange-50", text: "text-orange-700" },
  viewer: { bg: "bg-slate-100", text: "text-slate-600" },
};

export const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }));

export function initials(name) {
  return (name || "?")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const AVATAR_COLORS = [
  "bg-teal-500", "bg-blue-500", "bg-violet-500", "bg-purple-500",
  "bg-orange-500", "bg-cyan-500", "bg-indigo-500", "bg-pink-500",
];
export function avatarColor(name) {
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export function dueMeta(due) {
  if (!due) return null;
  const d = new Date(due + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((d - today) / (24 * 60 * 60 * 1000));
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, bg: "bg-red-50", text: "text-red-700" };
  if (days === 0) return { label: "Due today", bg: "bg-amber-50", text: "text-amber-700" };
  if (days <= 3) return { label: `Due in ${days}d`, bg: "bg-amber-50", text: "text-amber-600" };
  return {
    label: `Due ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
    bg: "bg-slate-100", text: "text-slate-600",
  };
}

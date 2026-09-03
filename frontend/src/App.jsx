import { Routes, Route, Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import {
  IconLayoutDashboard, IconListCheck, IconActivity, IconUsersGroup,
  IconLogout, IconChevronDown, IconSearch, IconReportAnalytics, IconSun, IconMoon,
} from "@tabler/icons-react";

import { useAuth } from "./auth/AuthContext";
import { useTheme } from "./theme/ThemeContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import { ROLE_LABELS, ROLE_COLORS, initials, avatarColor } from "./constants";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ProjectDetail from "./pages/ProjectDetail";
import ActivityFeed from "./pages/ActivityFeed";
import MyTasks from "./pages/MyTasks";
import AdminUsers from "./pages/AdminUsers";
import Reports from "./pages/Reports";

function SideItem({ to, label, icon, active }) {
  return (
    <Link
      to={to}
      className={`group flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm transition-all
        ${active ? "bg-indigo-600 text-white font-semibold shadow-sm shadow-indigo-900/30" : "text-slate-400 font-medium hover:bg-slate-800/80 hover:text-white"}`}
    >
      <span className={active ? "text-white" : "text-slate-500 transition-colors group-hover:text-slate-200"}>{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

function Sidebar() {
  const { pathname } = useLocation();
  const { can } = useAuth();
  const is = (p) => pathname === p || (p !== "/dashboard" && pathname.startsWith(p));
  return (
    <div className="flex h-full flex-col gap-1">
      <div className="mb-3 flex items-center gap-2 px-2 py-4">
        <img src="/logo-lockup.png" alt="Inaya" className="h-11 w-auto" />
        <p className="text-xs text-slate-500">Project management</p>
      </div>
      <p className="mb-1 px-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600">Workspace</p>
      <SideItem to="/dashboard" label="Dashboard" icon={<IconLayoutDashboard size={19} />} active={pathname === "/dashboard"} />
      <SideItem to="/my-tasks" label="My tasks" icon={<IconListCheck size={19} />} active={is("/my-tasks")} />
      <SideItem to="/reports" label="Reports" icon={<IconReportAnalytics size={19} />} active={is("/reports")} />
      <SideItem to="/activity" label="Activity" icon={<IconActivity size={19} />} active={is("/activity")} />
      {can("manage_users") && (
        <>
          <div className="my-2 border-t border-slate-800" />
          <p className="mb-1 px-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600">Admin</p>
          <SideItem to="/admin/users" label="User management" icon={<IconUsersGroup size={19} />} active={is("/admin/users")} />
        </>
      )}
    </div>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!user) return null;
  const roleColor = ROLE_COLORS[user.role] || { bg: "bg-slate-100", text: "text-slate-600" };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="focus-ring flex items-center gap-2 rounded-lg p-1 pr-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">
        <div className={`flex h-[34px] w-[34px] items-center justify-center rounded-full text-xs font-semibold text-white ${avatarColor(user.name)}`}>
          {initials(user.name)}
        </div>
        <div className="hidden text-left sm:block">
          <p className="text-sm font-medium leading-none text-slate-800 dark:text-slate-100">{user.name}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{ROLE_LABELS[user.role]}</p>
        </div>
        <IconChevronDown size={14} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="animate-fade-in absolute right-0 z-40 mt-2 w-60 rounded-lg border border-slate-200 bg-white p-2 shadow-lg shadow-slate-900/5 dark:border-slate-700 dark:bg-slate-800">
          <div className="px-2 py-1.5">
            <p className="text-xs text-slate-500 dark:text-slate-400">Signed in as</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
          </div>
          <div className="px-2 py-1">
            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${roleColor.bg} ${roleColor.text}`}>
              {ROLE_LABELS[user.role]}
            </span>
          </div>
          <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
          <button onClick={logout} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10">
            <IconLogout size={16} /> Log out
          </button>
        </div>
      )}
    </div>
  );
}

export function ThemeToggle({ className = "" }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`focus-ring flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 ${className}`}
    >
      {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
    </button>
  );
}

function HeaderSearch() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  return (
    <div className="hidden sm:block">
      <div className="relative w-80">
        <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          placeholder="Search projects…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") navigate("/dashboard"); }}
          className="focus-ring w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 transition-colors focus:border-indigo-400 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:bg-slate-800"
        />
      </div>
    </div>
  );
}

function Shell({ children }) {
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      <div className="w-[250px] shrink-0 border-r border-slate-800/60 bg-slate-900 p-3 no-print">
        <Sidebar />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur no-print dark:border-slate-800 dark:bg-slate-900/80">
          <HeaderSearch />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-[1400px] animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<ProtectedRoute><Shell><Dashboard /></Shell></ProtectedRoute>} />
      <Route path="/my-tasks" element={<ProtectedRoute><Shell><MyTasks /></Shell></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Shell><Reports /></Shell></ProtectedRoute>} />
      <Route path="/projects/:id" element={<ProtectedRoute><Shell><ProjectDetail /></Shell></ProtectedRoute>} />
      <Route path="/activity" element={<ProtectedRoute><Shell><ActivityFeed /></Shell></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute perm="manage_users"><Shell><AdminUsers /></Shell></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

import { Link, Navigate } from "react-router-dom";
import {
  IconChartArcs, IconLayoutKanban, IconTimeline, IconSparkles, IconUsersGroup,
  IconArrowRight, IconCircleCheck,
} from "@tabler/icons-react";
import { useAuth } from "../auth/AuthContext";

const FEATURES = [
  {
    icon: IconLayoutKanban,
    title: "Kanban boards",
    desc: "Drag tasks across To Do, In Progress, Review, Done, and Blocked columns with real-time status updates.",
  },
  {
    icon: IconTimeline,
    title: "Gantt timelines",
    desc: "See every task laid out on a timeline, with overdue items and milestones highlighted at a glance.",
  },
  {
    icon: IconSparkles,
    title: "AI insights",
    desc: "Get AI-generated progress summaries, stakeholder narratives, effort estimates, and risk signals.",
  },
  {
    icon: IconUsersGroup,
    title: "Team collaboration",
    desc: "Comment threads, activity feeds, and role-based permissions keep every team aligned.",
  },
];

export default function Home() {
  const { user, loading } = useAuth();

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-indigo-600 text-white">
              <IconChartArcs size={20} />
            </div>
            <span className="text-lg font-bold text-slate-800">Inaya</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login"
              className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100">
              Log in
            </Link>
            <Link to="/register"
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700">
              Sign up <IconArrowRight size={15} />
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 pb-16 pt-20 text-center sm:pt-28">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
          <IconSparkles size={14} /> AI-powered project management
        </span>
        <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
          One place for tasks, timelines,<br className="hidden sm:block" /> and team collaboration.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-500">
          Inaya brings Kanban boards, Gantt timelines, comments, and AI-generated
          insights together so your team always knows what's on track — and what needs attention.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/register"
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700">
            Get started free <IconArrowRight size={16} />
          </Link>
          <Link to="/login"
            className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50">
            Log in
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-5 transition-shadow hover:shadow-md">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <f.icon size={20} />
              </div>
              <h3 className="mb-1 font-semibold text-slate-800">{f.title}</h3>
              <p className="text-sm text-slate-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center">
          <h2 className="text-2xl font-bold text-slate-800">Ready to get your team organized?</h2>
          <p className="mt-2 text-slate-500">Create an account in seconds — no credit card required.</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {[
              "Kanban boards and Gantt timelines side by side",
              "Comments and activity feeds on every task",
              "AI progress summaries and risk signals",
            ].map((t) => (
              <span key={t} className="flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
                <IconCircleCheck size={14} className="text-indigo-500" /> {t}
              </span>
            ))}
          </div>
          <Link to="/register"
            className="mt-8 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700">
            Create your account <IconArrowRight size={16} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Inaya. All rights reserved.
      </footer>
    </div>
  );
}

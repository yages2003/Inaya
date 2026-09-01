import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { IconChartArcs, IconAlertCircle, IconCircleCheck } from "@tabler/icons-react";
import { useAuth } from "../auth/AuthContext";

function extractError(e) {
  const d = e?.response?.data?.detail;
  if (!d) return "";
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x) => x.msg || JSON.stringify(x)).join("; ");
  if (typeof d === "object") return d.msg || JSON.stringify(d);
  return String(d);
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (e) {
      setError(extractError(e) || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div
        className="hidden flex-1 flex-col justify-center p-14 text-white sm:flex"
        style={{ background: "linear-gradient(150deg, #0f172a 0%, #312e81 60%, #6366F1 100%)" }}
      >
        <div className="mb-10 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-white text-indigo-600">
            <IconChartArcs size={28} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Inaya</h1>
        </div>
        <h2 className="max-w-md text-2xl font-semibold leading-tight">
          One place for tasks, timelines, and team collaboration.
        </h2>
        <ul className="mt-8 max-w-md space-y-3 text-indigo-100">
          {[
            "Kanban boards and Gantt timelines side by side",
            "Comments and activity feeds on every task",
            "AI progress summaries and risk signals",
          ].map((t) => (
            <li key={t} className="flex items-start gap-2">
              <IconCircleCheck size={18} className="mt-0.5 shrink-0 text-indigo-300" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h2 className="mb-1 text-2xl font-bold text-slate-800">Sign in</h2>
          <p className="mb-6 text-sm text-slate-500">Welcome back. Enter your details to continue.</p>

          {error && (
            <div className="mb-4 flex animate-fade-in items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
              <IconAlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email" placeholder="you@company.com" value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
              <input
                type="password" placeholder="Your password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus-ring"
              />
            </div>
            <button
              onClick={submit} disabled={loading}
              className="mt-1 w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            No account?{" "}
            <Link to="/register" className="font-medium text-indigo-600 hover:underline">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

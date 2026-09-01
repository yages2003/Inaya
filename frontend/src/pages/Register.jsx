import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { IconChartArcs, IconAlertCircle } from "@tabler/icons-react";
import { useAuth } from "../auth/AuthContext";

function extractError(e) {
  const d = e?.response?.data?.detail;
  if (!d) return "";
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x) => x.msg || JSON.stringify(x)).join("; ");
  if (typeof d === "object") return d.msg || JSON.stringify(d);
  return String(d);
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      await register(form);
      navigate("/dashboard", { replace: true });
    } catch (e) {
      setError(extractError(e) || "Registration failed.");
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
          Get your team organized in minutes.
        </h2>
        <p className="mt-4 max-w-md text-indigo-100">
          The first account created becomes the Super Admin and can manage everyone else.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h2 className="mb-1 text-2xl font-bold text-slate-800">Create account</h2>
          <p className="mb-6 text-sm text-slate-500">Start managing projects with your team.</p>

          {error && (
            <div className="mb-4 flex animate-fade-in items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
              <IconAlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Full name</label>
              <input
                placeholder="Jane Doe" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email" placeholder="you@company.com" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
              <input
                type="password" placeholder="At least 6 characters" value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus-ring"
              />
            </div>
            <button
              onClick={submit} disabled={loading}
              className="mt-1 w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-indigo-600 hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

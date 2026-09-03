import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { listUsers, changeUserRole, setUserActive } from "../api/client";
import { ROLE_LABELS, ROLE_COLORS, ROLE_OPTIONS, initials, avatarColor } from "../constants";
import { useAuth } from "../auth/AuthContext";

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setUsers(await listUsers()); }
    catch { toast.error("Couldn't load users."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const onRoleChange = async (id, role) => {
    try {
      const updated = await changeUserRole(id, role);
      setUsers((us) => us.map((u) => (u.id === id ? updated : u)));
      toast.success(`Role updated to ${ROLE_LABELS[role]}.`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Update failed.");
    }
  };
  const onActiveToggle = async (id, active) => {
    try {
      const updated = await setUserActive(id, active);
      setUsers((us) => us.map((u) => (u.id === id ? updated : u)));
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Update failed.");
    }
  };

  if (loading) return (
    <div className="flex h-[200px] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
    </div>
  );

  return (
    <>
      <h2 className="mb-1 text-2xl font-bold text-slate-800 dark:text-slate-100">User management</h2>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">Assign roles and control access. Each role grants a different set of permissions.</p>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
            <tr>
              <th className="px-5 py-3">User</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Role</th>
              <th className="px-5 py-3">Active</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isSelf = me?.id === u.id;
              const rc = ROLE_COLORS[u.role] || { bg: "bg-slate-100", text: "text-slate-600" };
              return (
                <tr key={u.id} className="border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-700/40">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${avatarColor(u.name)}`}>
                        {initials(u.name)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                          {u.name} {isSelf && <span className="text-xs text-slate-400 dark:text-slate-500">(you)</span>}
                        </p>
                        <span className={`inline-block rounded-full px-1.5 py-0.5 text-xs ${rc.bg} ${rc.text}`}>{ROLE_LABELS[u.role]}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{u.email}</td>
                  <td className="px-5 py-3">
                    <select value={u.role} onChange={(e) => onRoleChange(u.id, e.target.value)}
                      className="w-48 rounded-lg border border-slate-300 px-2 py-1 text-xs outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-indigo-500">
                      {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        disabled={isSelf}
                        onClick={() => onActiveToggle(u.id, !u.is_active)}
                        aria-pressed={u.is_active}
                        className={`focus-ring relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                          u.is_active ? "border-indigo-600 bg-indigo-600" : "border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700"
                        }`}
                      >
                        <span
                          className={`inline-block h-[18px] w-[18px] rounded-full bg-white shadow-md ring-1 ring-slate-900/5 transition-transform ${
                            u.is_active ? "translate-x-[22px]" : "translate-x-[3px]"
                          }`}
                        />
                      </button>
                      <span className={`text-xs font-medium ${u.is_active ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`}>
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

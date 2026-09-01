import { createContext, useContext, useEffect, useState } from "react";
import * as apiClient from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, restore session from localStorage and re-validate with the server.
  useEffect(() => {
    const token = localStorage.getItem("inaya_token");
    const cached = localStorage.getItem("inaya_user");
    if (!token) {
      setLoading(false);
      return;
    }
    if (cached) {
      try {
        setUser(JSON.parse(cached));
      } catch {
        /* ignore */
      }
    }
    // revalidate
    apiClient
      .getMe()
      .then((u) => {
        setUser(u);
        localStorage.setItem("inaya_user", JSON.stringify(u));
      })
      .catch(() => {
        localStorage.removeItem("inaya_token");
        localStorage.removeItem("inaya_user");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const persist = (data) => {
    localStorage.setItem("inaya_token", data.access_token);
    localStorage.setItem("inaya_user", JSON.stringify(data.user));
    setUser(data.user);
  };

  const login = async (email, password) => {
    const data = await apiClient.login(email, password);
    persist(data);
    return data.user;
  };

  const register = async (payload) => {
    const data = await apiClient.register(payload);
    persist(data);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("inaya_token");
    localStorage.removeItem("inaya_user");
    setUser(null);
  };

  // Permission check used across the UI to gate controls.
  const can = (perm) => !!user && Array.isArray(user.permissions) && user.permissions.includes(perm);

  const refreshUser = async () => {
    const u = await apiClient.getMe();
    setUser(u);
    localStorage.setItem("inaya_user", JSON.stringify(u));
    return u;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, can, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
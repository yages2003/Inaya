import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("inaya_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem("inaya_token");
      localStorage.removeItem("inaya_user");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

// Auth
export const register = (data) => api.post("/auth/register", data).then((r) => r.data);
export const login = (email, password) => {
  const form = new URLSearchParams();
  form.append("username", email);
  form.append("password", password);
  return api
    .post("/auth/login", form, { headers: { "Content-Type": "application/x-www-form-urlencoded" } })
    .then((r) => r.data);
};
export const getMe = () => api.get("/auth/me").then((r) => r.data);
export const listUsers = () => api.get("/auth/users").then((r) => r.data);
export const changeUserRole = (id, role) =>
  api.patch(`/auth/users/${id}/role`, { role }).then((r) => r.data);
export const setUserActive = (id, active) =>
  api.patch(`/auth/users/${id}/active?active=${active}`).then((r) => r.data);

// Projects
export const getProjects = () => api.get("/projects").then((r) => r.data);
export const getProject = (id) => api.get(`/projects/${id}`).then((r) => r.data);
export const createProject = (data) => api.post("/projects", data).then((r) => r.data);
export const updateProject = (id, data) => api.patch(`/projects/${id}`, data).then((r) => r.data);
export const deleteProject = (id) => api.delete(`/projects/${id}`);

// Tasks
export const getTasks = (params = {}) => api.get("/tasks", { params }).then((r) => r.data);
export const getMyTasks = () => api.get("/tasks/mine").then((r) => r.data);
export const getTask = (id) => api.get(`/tasks/${id}`).then((r) => r.data);
export const createTask = (data) => api.post("/tasks", data).then((r) => r.data);
export const updateTask = (id, data) => api.patch(`/tasks/${id}`, data).then((r) => r.data);
export const deleteTask = (id) => api.delete(`/tasks/${id}`);

// Comments
export const getComments = (taskId) => api.get(`/tasks/${taskId}/comments`).then((r) => r.data);
export const addComment = (taskId, data) =>
  api.post(`/tasks/${taskId}/comments`, data).then((r) => r.data);

// Assignees
export const getAssignees = () => api.get("/assignees").then((r) => r.data);

// Activity
export const getActivity = (params = {}) => api.get("/activity", { params }).then((r) => r.data);


// AI (Weeks 7-8)
export const estimateEffort = (data) => api.post("/ai/estimate", data).then((r) => r.data);
export const estimateTask = (taskId) => api.post(`/ai/tasks/${taskId}/estimate`).then((r) => r.data);
export const generateInsights = (projectId) =>
  api.post(`/ai/projects/${projectId}/generate`).then((r) => r.data);
export const getInsights = (projectId) =>
  api.get(`/ai/projects/${projectId}/insights`).then((r) => r.data);
export const generateProjectSummary = (projectId) =>
  api.post(`/ai/projects/${projectId}/summary`).then((r) => r.data);
export const getProjectNarrative = (projectId, format = "executive") =>
  api.get(`/ai/projects/${projectId}/narrative`, { params: { format } }).then((r) => r.data);
export const analyzeProjectRisks = (projectId) =>
  api.post(`/ai/projects/${projectId}/risks/analyze`).then((r) => r.data);
export const getProjectRisks = (projectId) =>
  api.get(`/ai/projects/${projectId}/risks`).then((r) => r.data);
export const getProjectAIHistory = (projectId) =>
  api.get(`/ai/projects/${projectId}/history`).then((r) => r.data);

export default api;
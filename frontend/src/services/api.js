/**
 * API client with JWT auth interceptor.
 * All API calls go through this.
 */
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sentinel_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('sentinel_token');
      localStorage.removeItem('sentinel_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// ========== AUTH ==========
export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  setup: (data) => api.post('/auth/setup', data),
  me: () => api.get('/auth/me'),
};

// ========== DASHBOARD ==========
export const dashboardApi = {
  get: () => api.get('/dashboard'),
};

// ========== ACCOUNTS ==========
export const accountsApi = {
  list: (params) => api.get('/accounts', { params }),
  get: (id) => api.get(`/accounts/${id}`),
  create: (data) => api.post('/accounts', data),
  update: (id, data) => api.put(`/accounts/${id}`, data),
  delete: (id) => api.delete(`/accounts/${id}`),
  contacts: (id) => api.get(`/accounts/${id}/contacts`),
};

// ========== CONTACTS ==========
export const contactsApi = {
  create: (data) => api.post('/contacts', data),
  get: (id) => api.get(`/contacts/${id}`),
  update: (id, data) => api.put(`/contacts/${id}`, data),
};

// ========== POLICIES ==========
export const policiesApi = {
  list: (params) => api.get('/policies', { params }),
  get: (id) => api.get(`/policies/${id}`),
  create: (data) => api.post('/policies', data),
  update: (id, data) => api.put(`/policies/${id}`, data),
  installments: (policyId) => api.get(`/policies/${policyId}/installments`),
  createInstallment: (policyId, data) => api.post(`/policies/${policyId}/installments`, data),
  updateInstallment: (id, data) => api.put(`/policies/installments/${id}`, data),
};

// ========== SERVICE BOARD ==========
export const serviceBoardApi = {
  list: (params) => api.get('/service-board', { params }),
  get: (id) => api.get(`/service-board/${id}`),
  create: (data) => api.post('/service-board', data),
  update: (id, data) => api.put(`/service-board/${id}`, data),
};

// ========== TASKS ==========
export const tasksApi = {
  list: (params) => api.get('/tasks', { params }),
  my: (params) => api.get('/tasks/my', { params }),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
};

// ========== PROSPECTS ==========
export const prospectsApi = {
  list: (params) => api.get('/prospects', { params }),
  pipeline: () => api.get('/prospects/pipeline'),
  get: (id) => api.get(`/prospects/${id}`),
  create: (data) => api.post('/prospects', data),
  update: (id, data) => api.put(`/prospects/${id}`, data),
  updateStage: (id, stage) => api.put(`/prospects/${id}/stage?stage=${stage}`),
  convert: (id) => api.post(`/prospects/${id}/convert`),
};

// ========== SALES LOG ==========
export const salesLogApi = {
  list: (params) => api.get('/sales-log', { params }),
  create: (data) => api.post('/sales-log', data),
  summary: () => api.get('/sales-log/summary'),
  trends: (params) => api.get('/sales-log/trends', { params }),
};

// ========== CARRIERS ==========
export const carriersApi = {
  list: (params) => api.get('/carriers', { params }),
  get: (id) => api.get(`/carriers/${id}`),
  create: (data) => api.post('/carriers', data),
};

// ========== NOTES ==========
export const notesApi = {
  list: (entityType, entityId) => api.get('/notes', { params: { linked_entity_type: entityType, linked_entity_id: entityId } }),
  create: (data) => api.post('/notes', data),
};

// ========== COMM LOGS ==========
export const commLogsApi = {
  list: (entityType, entityId, channel) => api.get('/comm-logs', { params: { linked_entity_type: entityType, linked_entity_id: entityId, channel } }),
  create: (data) => api.post('/comm-logs', data),
};

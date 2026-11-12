import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000',
  timeout: 15000,
})

// Turns any failure into a readable sentence (FastAPI 422 errors arrive as a list).
export function errorMessage(err) {
  const d = err?.response?.data?.detail
  if (Array.isArray(d)) return d.map((x) => `${(x.loc || []).slice(1).join('.')}: ${x.msg}`).join('; ')
  if (typeof d === 'string') return d
  if (err?.code === 'ERR_NETWORK') return 'Cannot reach the server. Is the backend running on port 8000?'
  return err?.message || 'Something went wrong'
}

// Drop empty filters so we never send ?category= (empty string).
const clean = (p = {}) =>
  Object.fromEntries(Object.entries(p).filter(([, v]) => v !== '' && v !== null && v !== undefined))
const get = (url, params) => api.get(url, { params: clean(params) }).then((r) => r.data)

export const dashboardApi = {
  summary: () => get('/api/dashboard/summary'),
  charts: () => get('/api/dashboard/charts'),
}

export const facilitiesApi = {
  list: (params) => get('/api/facilities', params),
  nearby: (params) => get('/api/facilities/nearby', params),
  create: (body) => api.post('/api/facilities', body).then((r) => r.data),
  update: (id, body) => api.patch(`/api/facilities/${id}`, body).then((r) => r.data),
  remove: (id) => api.delete(`/api/facilities/${id}`),
}

export const incidentsApi = {
  list: (params) => get('/api/incidents', params),
  create: (body) => api.post('/api/incidents', body).then((r) => r.data),
  update: (id, body) => api.patch(`/api/incidents/${id}`, body).then((r) => r.data),
  nearby: (id, params) => get(`/api/incidents/${id}/nearby`, params),
}

export const routesApi = {
  list: () => get('/api/routes'),
  nearFacilities: (id, params) => get(`/api/routes/${id}/nearby-facilities`, params),
}
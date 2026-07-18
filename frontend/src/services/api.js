import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- Historical replay plumbing -------------------------------------------
// When a replay episode is active, every GET request is transparently stamped
// with `at=<historical ISO timestamp>` so the whole backend (readings, map,
// forecasts, attribution, GRAP, enforcement, advisories) answers as of that
// moment. Routes that don't support `at` simply ignore it.
let _replayAt = null;
export const setGlobalReplayAt = (isoOrNull) => { _replayAt = isoOrNull; };

apiClient.interceptors.request.use((config) => {
  if (_replayAt && (config.method || 'get').toLowerCase() === 'get') {
    config.params = { ...(config.params || {}), at: _replayAt };
  }
  return config;
});

export const replayApi = {
  episodes: () => apiClient.get('/replay/episodes').then(r => r.data),
  episode: (id) => apiClient.get(`/replay/episodes/${id}`).then(r => r.data),
  seed: (id) => apiClient.post(`/replay/episodes/${id}/seed`).then(r => r.data),
};

export const stationsApi = {
  list: (city) => apiClient.get(`/stations${city ? `?city=${city}` : ''}`).then(r => r.data),
  get: (id) => apiClient.get(`/stations/${id}`).then(r => r.data),
  readings: (id, hours = 24) => apiClient.get(`/stations/${id}/readings?hours=${hours}`).then(r => r.data),
};

export const aqiApi = {
  current: (city) => apiClient.get(`/aqi/current?city=${city}`).then(r => r.data),
  at: (city, hoursAgo) => apiClient.get(`/aqi/at?city=${city}&hours_ago=${hoursAgo}`).then(r => r.data),
  history: (id, start, end) => apiClient.get(`/aqi/history?station_id=${id}&start=${start}&end=${end}`).then(r => r.data),
  heatmap: (city) => apiClient.get(`/aqi/heatmap?city=${city}`).then(r => r.data),
  compare: (cities) => apiClient.get(`/aqi/compare?cities=${cities}`).then(r => r.data),
};

export const predictApi = {
  forecast: (id, hours = 72) => apiClient.get(`/predict/forecast?station_id=${id}&hours=${hours}`).then(r => r.data),
  alerts: (city, threshold = 300) => apiClient.get(`/predict/alerts?city=${city}&threshold=${threshold}`).then(r => r.data),
  trigger: (id) => apiClient.post(`/predict/trigger-forecast${id ? `?station_id=${id}` : ''}`).then(r => r.data),
};

export const attributionApi = {
  sources: (city, zone) => apiClient.get(`/attribution/sources?city=${city}${zone ? `&zone=${zone}` : ''}`).then(r => r.data),
  evidence: (city, zone) => apiClient.get(`/attribution/evidence?city=${city}&zone=${zone}`).then(r => r.data),
  industrial: (city) => apiClient.get(`/attribution/industrial?city=${city}`).then(r => r.data),
};

export const enforcementApi = {
  actions: (city) => apiClient.get(`/enforcement/actions?city=${city}`).then(r => r.data),
  get: (id) => apiClient.get(`/enforcement/actions/${id}`).then(r => r.data),
  update: (id, status) => apiClient.patch(`/enforcement/actions/${id}?status=${status}`).then(r => r.data),
  analyze: (id) => apiClient.post(`/enforcement/actions/${id}/analyze`).then(r => r.data),
};

export const advisoryApi = {
  citizen: (city, zone) => apiClient.get(`/advisory/citizen?city=${city}${zone ? `&zone=${zone}` : ''}`).then(r => r.data),
  vulnerabilityMap: (city) => apiClient.get(`/advisory/vulnerability-map?city=${city}`).then(r => r.data),
  generate: (city, zone) => apiClient.post(`/advisory/generate?city=${city}&zone=${zone}`).then(r => r.data),
};

export const grapApi = {
  status: (city, horizon = 48) => apiClient.get(`/grap/status?city=${city}&horizon=${horizon}`).then(r => r.data),
  schedule: () => apiClient.get('/grap/schedule').then(r => r.data),
};

export const healthApi = {
  city: (city) => apiClient.get(`/health-impact/city?city=${city}`).then(r => r.data),
  action: (city, reductionPct = 30) => apiClient.get(`/health-impact/action?city=${city}&reduction_pct=${reductionPct}`).then(r => r.data),
};

export const chatApi = {
  query: (question) => apiClient.post('/chat/query', { question }).then(r => r.data),
};

export const dataApi = {
  ingest: () => apiClient.post('/data/ingest').then(r => r.data),
  seed: (days = 7) => apiClient.post(`/data/seed?days=${days}`).then(r => r.data),
  status: () => apiClient.get('/data/status').then(r => r.data),
};

export default apiClient;

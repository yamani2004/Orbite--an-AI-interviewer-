import { supabase } from './supabase';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

async function request(path, options = {}) {
  const { data } = await supabase.auth.getSession();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (data.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
  const response = await fetch(`${API_URL}${path}`, { headers, ...options });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message || 'Something went wrong. Please try again.');
  return response.status === 204 ? null : response.json();
}
export const api = {
  getQuestions: track => request(`/api/questions?track=${encodeURIComponent(track)}`),
  getCatalog: filters => request(`/api/questions/catalog?${new URLSearchParams(Object.entries(filters).filter(([, value]) => value)).toString()}`),
  startInterview: body => request('/api/interviews', { method: 'POST', body: JSON.stringify(body) }),
  saveInterviewAnswer: (id, body) => request(`/api/interviews/${id}/answers`, { method: 'POST', body: JSON.stringify(body) }),
  finishInterview: id => request(`/api/interviews/${id}/finish`, { method: 'POST' }),
  getProgress: () => request('/api/progress'),
  getChallenge: () => request('/api/daily-challenge'),
  getRoadmap: (goal, commitment) => request(`/api/roadmap?${new URLSearchParams({ goal, commitment })}`),
  createSession: body => request('/api/sessions', { method: 'POST', body: JSON.stringify(body) }),
  saveAnswer: (sessionId, body) => request(`/api/sessions/${sessionId}/answers`, { method: 'POST', body: JSON.stringify(body) }),
  createRoom: body => request('/api/live-rooms', { method: 'POST', body: JSON.stringify(body) }),
  report: body => request('/api/reports', { method: 'POST', body: JSON.stringify(body) })
};

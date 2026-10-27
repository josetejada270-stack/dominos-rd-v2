import axios from 'axios';

export const BACKEND_URL = 'https://dominos-rd-v2.onrender.com';
export const api = axios.create({ baseURL: BACKEND_URL + '/api' });

export async function setToken(t) {
  if (t) {
    localStorage.setItem('domino_token', t);
  } else {
    localStorage.removeItem('domino_token');
  }
}

export async function getToken() {
  return localStorage.getItem('domino_token');
}

api.interceptors.request.use(async (config) => {
  const t = await getToken();
  if (t) {
    config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});
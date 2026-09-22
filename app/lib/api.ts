import { supabase } from './supabase';
import { staleWhileRevalidateFetch } from './offlineCache';

const API = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!API) throw new Error('The app backend URL is not configured. Set EXPO_PUBLIC_API_URL for orders, auctions, payments and delivery.');
  const session = supabase ? (await supabase.auth.getSession()).data.session : null;
  const response = await staleWhileRevalidateFetch(API + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { Authorization: 'Bearer ' + session.access_token } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) throw new Error(String(body?.error || body?.message || body || 'Request failed.'));
  return body as T;
}

export const apiUrl = API;

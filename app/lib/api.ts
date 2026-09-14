import { supabase } from './supabase';

const API = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4100';

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const session = supabase ? (await supabase.auth.getSession()).data.session : null;
  const response = await fetch(API + path, {
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

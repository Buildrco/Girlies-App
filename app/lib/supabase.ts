import AsyncStorage from '@react-native-async-storage/async-storage';

type AuthUser = { id: string; email?: string; user_metadata?: Record<string, unknown> };
type AuthSession = { access_token: string; refresh_token: string; expires_in?: number; expires_at?: number; user: AuthUser };
type AuthError = { message: string };
type AuthResult<T> = { data: T; error: AuthError | null };

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://kmfkafncpwmjnraumiwq.supabase.co';
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const sessionKey = 'girlies.supabase.session';

async function readSession(): Promise<AuthSession | null> {
  const raw = await AsyncStorage.getItem(sessionKey);
  if (!raw) return null;
  try { return JSON.parse(raw) as AuthSession; } catch { await AsyncStorage.removeItem(sessionKey); return null; }
}

async function saveSession(session: AuthSession | null) {
  if (session) await AsyncStorage.setItem(sessionKey, JSON.stringify(session));
  else await AsyncStorage.removeItem(sessionKey);
}

function errorFrom(body: any, fallback: string): AuthError {
  return { message: String(body?.msg || body?.message || body?.error_description || body?.error || fallback) };
}

async function request(path: string, init: RequestInit = {}, token?: string): Promise<{ body: any; error: AuthError | null }> {
  if (!publishableKey) return { body: null, error: { message: 'Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to the Expo environment.' } };
  try {
    const response = await fetch(url + path, {
      ...init,
      headers: { apikey: publishableKey, 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(init.headers || {}) }
    });
    const text = await response.text();
    const body = text ? JSON.parse(text) : null;
    return response.ok ? { body, error: null } : { body: null, error: errorFrom(body, 'Supabase request failed.') };
  } catch { return { body: null, error: { message: 'Unable to reach Supabase.' } }; }
}

function withExpiry(session: AuthSession): AuthSession {
  return { ...session, expires_at: session.expires_at || (session.expires_in ? Math.floor(Date.now() / 1000) + session.expires_in - 60 : undefined) };
}

async function persistResponse(body: any): Promise<AuthSession | null> {
  if (!body?.access_token || !body?.refresh_token || !body?.user) return null;
  const session = withExpiry(body as AuthSession);
  await saveSession(session);
  return session;
}

const auth = {
  async signUp(email: string, password: string, options: { data?: Record<string, unknown> } = {}): Promise<AuthResult<{ user: AuthUser | null; session: AuthSession | null }>> {
    const result = await request('/auth/v1/signup', { method: 'POST', body: JSON.stringify({ email, password, data: options.data || {} }) });
    if (result.error) return { data: { user: null, session: null }, error: result.error };
    const session = await persistResponse(result.body);
    return { data: { user: result.body?.user || null, session }, error: null };
  },
  async signInWithPassword(email: string, password: string): Promise<AuthResult<{ user: AuthUser | null; session: AuthSession | null }>> {
    const result = await request('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password }) });
    if (result.error) return { data: { user: null, session: null }, error: result.error };
    const session = await persistResponse(result.body);
    return { data: { user: result.body?.user || null, session }, error: null };
  },
  async signOut(): Promise<{ error: AuthError | null }> {
    const session = await readSession();
    if (session) { const result = await request('/auth/v1/logout', { method: 'POST' }, session.access_token); if (result.error) { await saveSession(null); return { error: result.error }; } }
    await saveSession(null);
    return { error: null };
  },
  async getUser(): Promise<AuthResult<{ user: AuthUser | null }>> {
    let session = await readSession();
    if (!session) return { data: { user: null }, error: { message: 'Auth session missing!' } };
    if (session.expires_at && session.expires_at <= Math.floor(Date.now() / 1000) && session.refresh_token) {
      const refreshed = await request('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: session.refresh_token }) });
      if (refreshed.error) { await saveSession(null); return { data: { user: null }, error: { message: 'Auth session missing!' } }; }
      session = (await persistResponse(refreshed.body)) || session;
    }
    const result = await request('/auth/v1/user', {}, session.access_token);
    if (result.error) { await saveSession(null); return { data: { user: null }, error: result.error }; }
    return { data: { user: result.body as AuthUser }, error: null };
  }
};

export const supabase = url && publishableKey ? { auth } : null;

export function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to the Expo environment.');
  return supabase;
}

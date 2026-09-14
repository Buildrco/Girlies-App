import { requireSupabase } from './supabase';

export async function signUp(email: string, password: string, displayName?: string) {
  const { data, error } = await requireSupabase().auth.signUp({ email, password, options: { data: { display_name: displayName || '' } } });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await requireSupabase().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await requireSupabase().auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data, error } = await requireSupabase().auth.getUser();
  if (error && error.message !== 'Auth session missing!') throw error;
  return data.user;
}

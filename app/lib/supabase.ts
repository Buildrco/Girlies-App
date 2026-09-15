import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = (process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://kmfkafncpwmjnraumiwq.supabase.co').trim();
const publishableKey = (process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_RsX1yDwyp7C4jIkdCe0VqA_05tMgdHY').trim();

// This is the public client key intended for mobile apps. Never use service_role here.
export const supabase: SupabaseClient = createClient(url, publishableKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

export function requireSupabase(): SupabaseClient {
  return supabase;
}

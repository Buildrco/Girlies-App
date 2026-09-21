import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'girlies:offline:';

export async function readOffline<T>(key: string): Promise<T | null> {
  try {
    const value = await AsyncStorage.getItem(PREFIX + key);
    return value ? JSON.parse(value) as T : null;
  } catch {
    return null;
  }
}

export async function writeOffline(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Offline cache is best effort and must never block the live app.
  }
}
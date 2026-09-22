import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'girlies:offline:';
const nativeFetch = globalThis.fetch.bind(globalThis);

type CachedResponse = { body: string; status: number; headers: Record<string, string> };

function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(36);
}

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

/** Home-style stale-while-revalidate loading for every GET made by the app. */
export async function staleWhileRevalidateFetch(input: any, init?: RequestInit): Promise<Response> {
  const source = input && typeof input === 'object' ? input : null;
  const requestUrl = typeof input === 'string' ? input : source?.url || String(input);
  const method = String(init?.method || source?.method || 'GET').toUpperCase();
  if (method !== 'GET') return nativeFetch(input, init);

  const headers = new Headers(init?.headers || source?.headers);
  const key = 'network:' + hash(requestUrl + '|' + (headers.get('authorization') || 'public'));
  const cached = await readOffline<CachedResponse>(key);
  const network = nativeFetch(input, init);
  const save = async (response: Response) => {
    if (!response.ok) return;
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, name) => {
      if (name === 'content-type' || name === 'content-range' || name === 'x-total-count') responseHeaders[name] = value;
    });
    await writeOffline(key, { body: await response.clone().text(), status: response.status, headers: responseHeaders });
  };

  if (cached) {
    void network.then(save).catch(() => undefined);
    return new Response(cached.body, { status: cached.status || 200, headers: cached.headers || { 'content-type': 'application/json' } });
  }

  const response = await network;
  void save(response).catch(() => undefined);
  return response;
}

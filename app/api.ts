const API=process.env.EXPO_PUBLIC_API_URL||'http://localhost:4100';
export async function api<T>(path:string, options:RequestInit={}){const r=await fetch(API+path,{headers:{'Content-Type':'application/json',...(options.headers||{})},...options});if(!r.ok)throw new Error(await r.text());return r.json() as Promise<T>}
export const apiUrl=API;

import type { CategoryDefinition } from '../constants/categories';
import { supabase } from './supabase';

export type MediaItem = {
  uri: string;
  type: 'image' | 'video';
  name?: string | null;
  mimeType?: string | null;
};

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
  'video/mpeg': 'mpeg',
  'video/3gpp': '3gp',
};

export function normalizeImageUrls(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(item => normalizeImageUrls(item)).filter(Boolean);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed !== value) return normalizeImageUrls(parsed);
    } catch { /* plain URL */ }
    return [trimmed];
  }
  if (value && typeof value === 'object' && 'url' in value) return normalizeImageUrls((value as { url?: unknown }).url);
  return [];
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }
  return fallback;
}

function getMimeType(item: MediaItem) {
  if (item.mimeType?.includes('/')) return item.mimeType;
  const nameExtension = item.name?.split('.').pop()?.toLowerCase();
  if (nameExtension) {
    const matchingMime = Object.entries(MIME_EXTENSIONS).find(([, extension]) => extension === nameExtension)?.[0];
    if (matchingMime) return matchingMime;
  }
  return item.type === 'video' ? 'video/mp4' : 'image/jpeg';
}

function getExtension(item: MediaItem, mimeType: string) {
  if (MIME_EXTENSIONS[mimeType]) return MIME_EXTENSIONS[mimeType];
  const nameExtension = item.name?.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (nameExtension && nameExtension.length <= 8) return nameExtension;
  return item.type === 'video' ? 'mp4' : 'jpg';
}

export async function uploadMedia(userId: string, item: MediaItem, folder: 'posts' | 'stories' | 'products' | 'services' | 'avatars') {
  const mimeType = getMimeType(item);
  const extension = getExtension(item, mimeType);
  const uniqueName = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const path = `${userId}/${folder}/${uniqueName}.${extension}`;

  let response: Response;
  try {
    response = await fetch(item.uri);
  } catch (error) {
    throw new Error(`Could not read the selected ${item.type}: ${errorMessage(error, 'unknown local file error')}`);
  }
  if (!response.ok) {
    throw new Error(`Could not read the selected ${item.type} (${response.status}).`);
  }

  let arrayBuffer: ArrayBuffer;
  try {
    arrayBuffer = await response.arrayBuffer();
  } catch (error) {
    throw new Error(`Could not read the selected ${item.type}: ${errorMessage(error, 'invalid local file')}`);
  }
  if (arrayBuffer.byteLength === 0) throw new Error(`The selected ${item.type} is empty.`);

  const { error } = await supabase.storage.from('social-media').upload(path, arrayBuffer, {
    contentType: mimeType,
    upsert: false,
  });
  if (error) throw new Error(`Media upload failed: ${errorMessage(error, 'storage rejected the file')}`);

  const { data } = supabase.storage.from('social-media').getPublicUrl(path);
  if (!data.publicUrl) throw new Error('Media upload succeeded but no public URL was returned.');
  return { path, url: data.publicUrl };
}

async function removeUploadedMedia(paths: string[]) {
  if (!paths.length) return;
  const { error } = await supabase.storage.from('social-media').remove(paths);
  if (error) console.warn('Could not clean up uploaded media:', error.message);
}

export async function getSessionUser() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(`Could not restore your session: ${errorMessage(error, 'authentication failed')}`);
  return data.session?.user ?? null;
}

export type ProfileRecord = {
  id: string;
  display_name: string;
  handle: string;
  bio: string | null;
  avatar_url: string | null;
  verified: boolean;
  followers_count: number;
  following_count: number;
  created_at: string;
  country?: string | null;
  area?: string | null;
  location?: string | null;
  date_of_birth?: string | null;
  links?: string[] | null;
  video_autoplay?: boolean;
};

export type CountryOption = { name: string; iso2: string };

export const GHANA_CITIES = ['Accra', 'Kumasi', 'Tema', 'Takoradi', 'Cape Coast', 'Koforidua', 'Tamale', 'Sunyani', 'Ho', 'Wa', 'Bolgatanga'];
export const GHANA_AREAS = [
  'Ablekuma', 'Adabraka', 'Airport Residential', 'Awoshie', 'Cantonments', 'Dansoman',
  'East Legon', 'Kaneshie', 'Kasoa', 'Labadi', 'Labone', 'Lapaz', 'Madina', 'Nungua',
  'Osu', 'Spintex', 'Teshie', 'Dzorwulu', 'Achimota', 'Kwadaso', 'Bantama', 'Asokwa',
  'Ahodwo', 'Adum', 'Suame', 'Ejisu', 'Tanoso', 'Kokomlemle', 'Ridge', 'Tesano',
];

const PROFILE_BASE_SELECT = 'id,display_name,handle,bio,avatar_url,verified,followers_count,following_count,created_at';
const PROFILE_SELECT = `${PROFILE_BASE_SELECT},country,area,location,date_of_birth,links,video_autoplay`;

function isMissingProfileColumn(error: unknown) {
  const message = errorMessage(error, '').toLowerCase();
  return message.includes('column profiles.') && message.includes('does not exist');
}

async function selectProfile(userId: string): Promise<ProfileRecord | null> {
  const extended = await supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('id', userId)
    .maybeSingle();
  if (!extended.error) return extended.data as ProfileRecord | null;
  if (!isMissingProfileColumn(extended.error)) {
    throw new Error(`Could not load your profile: ${errorMessage(extended.error, 'Supabase rejected the request')}`);
  }

  // Older databases do not have the optional profile fields yet. Keep the
  // signed-in profile usable while the migration is being applied.
  const base = await supabase
    .from('profiles')
    .select(PROFILE_BASE_SELECT)
    .eq('id', userId)
    .maybeSingle();
  if (base.error) {
    throw new Error(`Could not load your profile: ${errorMessage(base.error, 'Supabase rejected the request')}`);
  }
  return base.data ? {
    ...(base.data as ProfileRecord),
    country: null,
    area: null,
    location: null,
    date_of_birth: null,
    links: [],
    video_autoplay: true,
  } : null;
}

export async function getCurrentProfile(): Promise<ProfileRecord | null> {
  const user = await getSessionUser();
  if (!user) return null;
  return selectProfile(user.id);
}

export function getProfile(userId: string) {
  return selectProfile(userId);
}

export async function updateCurrentProfile(input: {
  display_name: string;
  handle: string;
  bio: string;
  country: string;
  area: string;
  location: string;
  date_of_birth: string | null;
  links: string[];
  video_autoplay?: boolean;
  avatar_url?: string | null;
}) {
  const user = await getSessionUser();
  if (!user) throw new Error('Please sign in to edit your profile.');
  const handle = input.handle.trim().replace(/^@+/, '').toLowerCase();
  if (!/^[a-z0-9._-]{3,30}$/.test(handle)) {
    throw new Error('Username must be 3–30 characters using letters, numbers, dots, underscores or hyphens.');
  }
  const extendedUpdate = await supabase.from('profiles').update({
    display_name: input.display_name.trim(),
    handle,
    bio: input.bio.trim(),
    country: input.country.trim() || null,
    area: input.area.trim() || null,
    location: input.location.trim() || null,
    date_of_birth: input.date_of_birth || null,
    links: input.links.filter(Boolean),
    video_autoplay: input.video_autoplay ?? true,
    ...(input.avatar_url !== undefined ? { avatar_url: input.avatar_url } : {}),
  }).eq('id', user.id).select().single();

  if (!extendedUpdate.error) return extendedUpdate.data as ProfileRecord;
  if (!isMissingProfileColumn(extendedUpdate.error)) {
    throw new Error(`Profile update failed: ${errorMessage(extendedUpdate.error, 'Supabase rejected the profile')}`);
  }

  const baseUpdate = await supabase.from('profiles').update({
    display_name: input.display_name.trim(),
    handle,
    bio: input.bio.trim(),
    ...(input.avatar_url !== undefined ? { avatar_url: input.avatar_url } : {}),
  }).eq('id', user.id).select().single();
  if (baseUpdate.error) throw new Error(`Profile update failed: ${errorMessage(baseUpdate.error, 'Supabase rejected the profile')}`);
  return baseUpdate.data as ProfileRecord;
}

export async function updateVideoAutoplay(enabled: boolean) {
  const user = await getSessionUser();
  if (!user) throw new Error('Please sign in to update video preferences.');
  const { error } = await supabase.from('profiles').update({ video_autoplay: enabled }).eq('id', user.id);
  if (error) throw new Error(`Could not save video preference: ${errorMessage(error, 'Supabase rejected the preference')}`);
}

export async function getCountries(): Promise<CountryOption[]> {
  const response = await fetch('https://countriesnow.space/api/v0.1/countries/positions');
  if (!response.ok) throw new Error('Could not load countries.');
  const payload = await response.json();
  const countries = (payload.data || [])
    .map((country: any) => ({ name: String(country.name || ''), iso2: String(country.iso2 || '') }))
    .filter((country: CountryOption) => country.name)
    .sort((a: CountryOption, b: CountryOption) => a.name.localeCompare(b.name));
  if (!countries.some((country: CountryOption) => country.name.toLowerCase() === 'ghana')) countries.push({ name: 'Ghana', iso2: 'GH' });
  return countries.sort((a: CountryOption, b: CountryOption) => a.name.localeCompare(b.name));
}

export async function getAreas(country: string): Promise<string[]> {
  if (country.trim().toLowerCase() === 'ghana') return GHANA_AREAS;
  const response = await fetch('https://countriesnow.space/api/v0.1/countries/states', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ country }),
  });
  if (!response.ok) throw new Error('Could not load areas for this country.');
  const payload = await response.json();
  return (payload.data?.states || [])
    .map((area: any) => String(area.name || ''))
    .filter(Boolean)
    .sort((a: string, b: string) => a.localeCompare(b));
}

export async function getCities(country: string, state: string): Promise<string[]> {
  if (country.trim().toLowerCase() === 'ghana') return GHANA_CITIES;
  const response = await fetch('https://countriesnow.space/api/v0.1/countries/state/cities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ country, state }),
  });
  if (!response.ok) throw new Error('Could not load towns for this area.');
  const payload = await response.json();
  return (payload.data || []).map((town: unknown) => String(town || '')).filter(Boolean).sort((a: string, b: string) => a.localeCompare(b));
}

export async function createPost(body: string, media: MediaItem[]) {
  const user = await getSessionUser();
  if (!user) throw new Error('Please sign in to post.');
  const trimmedBody = body.trim();
  if (!trimmedBody && media.length === 0) throw new Error('Write something or add a photo/video.');
  const uploadedPaths: string[] = [];
  try {
    const media_urls: string[] = [];
    for (const item of media) {
      const uploaded = await uploadMedia(user.id, item, 'posts');
      uploadedPaths.push(uploaded.path);
      media_urls.push(uploaded.url);
    }
    const { data, error } = await supabase.from('posts').insert({
      author_id: user.id,
      body: trimmedBody,
      media_urls,
      visibility: 'public',
      metadata: { media_types: media.map(item => item.type) },
    }).select().single();
    if (error) throw new Error(`Post creation failed: ${errorMessage(error, 'Supabase rejected the post')}`);
    if (!data) throw new Error('Post creation succeeded but returned no post.');
    return data;
  } catch (error) {
    await removeUploadedMedia(uploadedPaths);
    throw error;
  }
}

export async function createStory(item: MediaItem, caption = '') {
  const user = await getSessionUser();
  if (!user) throw new Error('Please sign in to update your story.');
  let uploadedPath = '';
  try {
    const uploaded = await uploadMedia(user.id, item, 'stories');
    uploadedPath = uploaded.path;
    const { data, error } = await supabase.from('stories').insert({
      user_id: user.id,
      media_url: uploaded.url,
      media_type: item.type,
      caption: caption.trim(),
    }).select().single();
    if (error) throw new Error(`Story creation failed: ${errorMessage(error, 'Supabase rejected the story')}`);
    if (!data) throw new Error('Story creation succeeded but returned no story.');
    return data;
  } catch (error) {
    await removeUploadedMedia(uploadedPath ? [uploadedPath] : []);
    throw error;
  }
}

export async function setFollow(userId: string, shouldFollow: boolean) {
  const me = await getSessionUser();
  if (!me) throw new Error('Please sign in.');
  if (me.id === userId) return false;
  if (shouldFollow) {
    const { error } = await supabase.from('follows').insert(
      { follower_id: me.id, following_id: userId },
    );
    if (error) throw new Error(`Follow failed: ${errorMessage(error, 'Supabase rejected the follow')}`);
  } else {
    const { error } = await supabase.from('follows')
      .delete().eq('follower_id', me.id).eq('following_id', userId);
    if (error) throw new Error(`Unfollow failed: ${errorMessage(error, 'Supabase rejected the unfollow')}`);
  }
  const { data, error } = await supabase.from('follows')
    .select('following_id').eq('follower_id', me.id).eq('following_id', userId).maybeSingle();
  if (error) throw new Error(`Follow verification failed: ${errorMessage(error, 'could not verify the follow')}`);
  const verified = Boolean(data);
  if (verified !== shouldFollow) throw new Error('The follow change could not be verified. Please try again.');
  return verified;
}

export async function setPostLike(postId: string, shouldLike: boolean) {
  const me = await getSessionUser();
  if (!me) throw new Error('Please sign in to like posts.');
  if (shouldLike) {
    const { error } = await supabase.from('post_likes').insert(
      { post_id: postId, user_id: me.id },
    );
    if (error) throw new Error(`Like failed: ${errorMessage(error, 'Supabase rejected the like')}`);
  } else {
    const { error } = await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', me.id);
    if (error) throw new Error(`Unlike failed: ${errorMessage(error, 'Supabase rejected the unlike')}`);
  }
  const { data, error } = await supabase.from('post_likes')
    .select('post_id').eq('post_id', postId).eq('user_id', me.id).maybeSingle();
  if (error) throw new Error(`Like verification failed: ${errorMessage(error, 'could not verify the like')}`);
  const verified = Boolean(data);
  if (verified !== shouldLike) throw new Error('The like change could not be verified. Please try again.');
  return verified;
}

export async function reportPost(postId: string, reason = 'reported_from_viewer') {
  const me = await getSessionUser();
  if (!me) throw new Error('Please sign in to report a post.');
  const { error } = await supabase.from('post_reports').upsert(
    { post_id: postId, reporter_id: me.id, reason },
    { onConflict: 'post_id,reporter_id' },
  );
  if (error) throw new Error(`Report failed: ${errorMessage(error, 'Supabase rejected the report')}`);
}

export async function setPostPreference(postId: string, preference: 'not_interested', enabled: boolean) {
  const me = await getSessionUser();
  if (!me) throw new Error('Please sign in to update your preferences.');
  if (enabled) {
    const { error } = await supabase.from('post_preferences').upsert(
      { post_id: postId, user_id: me.id, preference },
      { onConflict: 'post_id,user_id,preference' },
    );
    if (error) throw new Error(`Preference failed: ${errorMessage(error, 'Supabase rejected the preference')}`);
  } else {
    const { error } = await supabase.from('post_preferences')
      .delete().eq('post_id', postId).eq('user_id', me.id).eq('preference', preference);
    if (error) throw new Error(`Preference failed: ${errorMessage(error, 'Supabase rejected the preference')}`);
  }
}

export async function getPostLikeState(postId: string) {
  const me = await getSessionUser();
  if (!me) return false;
  const { data, error } = await supabase.from('post_likes')
    .select('post_id').eq('post_id', postId).eq('user_id', me.id).maybeSingle();
  if (error) throw new Error(`Like status failed: ${errorMessage(error, 'could not load the like status')}`);
  return Boolean(data);
}

export async function getProductLikeState(productId: string) {
  const me = await getSessionUser();
  if (!me) return false;
  const { data, error } = await supabase.from('product_likes')
    .select('product_id').eq('product_id', productId).eq('user_id', me.id).maybeSingle();
  if (error) throw new Error(`Like status failed: ${errorMessage(error, 'could not load the like status')}`);
  return Boolean(data);
}

export async function setProductLike(productId: string, shouldLike: boolean) {
  const me = await getSessionUser();
  if (!me) throw new Error('Please sign in to like products.');
  if (shouldLike) {
    const { error } = await supabase.from('product_likes').upsert(
      { product_id: productId, user_id: me.id },
      { onConflict: 'product_id,user_id' },
    );
    if (error) throw new Error(`Like failed: ${errorMessage(error, 'Supabase rejected the like')}`);
  } else {
    const { error } = await supabase.from('product_likes').delete()
      .eq('product_id', productId).eq('user_id', me.id);
    if (error) throw new Error(`Unlike failed: ${errorMessage(error, 'Supabase rejected the unlike')}`);
  }
  const verified = await getProductLikeState(productId);
  if (verified !== shouldLike) throw new Error('The like change could not be verified. Please try again.');
  return verified;
}

export async function setBookmark(postId: string, shouldBookmark: boolean) {
  const me = await getSessionUser();
  if (!me) throw new Error('Please sign in.');
  if (shouldBookmark) {
    const { error } = await supabase.from('bookmarks').insert(
      { post_id: postId, user_id: me.id },
    );
    if (error) throw new Error(`Bookmark failed: ${errorMessage(error, 'Supabase rejected the bookmark')}`);
  } else {
    const { error } = await supabase.from('bookmarks').delete().eq('post_id', postId).eq('user_id', me.id);
    if (error) throw new Error(`Remove bookmark failed: ${errorMessage(error, 'Supabase rejected the removal')}`);
  }
  const { data, error } = await supabase.from('bookmarks')
    .select('post_id').eq('post_id', postId).eq('user_id', me.id).maybeSingle();
  if (error) throw new Error(`Bookmark verification failed: ${errorMessage(error, 'could not verify the bookmark')}`);
  const verified = Boolean(data);
  if (verified !== shouldBookmark) throw new Error('The bookmark change could not be verified. Please try again.');
  return verified;
}

export async function deletePost(postId: string) {
  const me = await getSessionUser();
  if (!me) throw new Error('Please sign in to delete a post.');
  const { data, error } = await supabase.from('posts').delete().eq('id', postId).eq('author_id', me.id).select('id').maybeSingle();
  if (error) throw new Error(`Post delete failed: ${errorMessage(error, 'Supabase rejected the deletion')}`);
  if (!data) throw new Error('Post not found or you do not own it.');
}

export async function addComment(postId: string, body: string) {
  const me = await getSessionUser();
  if (!me) throw new Error('Please sign in to comment.');
  const trimmedBody = body.trim();
  if (!trimmedBody) throw new Error('Write a comment before sending.');
  const { data, error } = await supabase.from('post_comments')
    .insert({ post_id: postId, user_id: me.id, body: trimmedBody }).select().single();
  if (error) throw new Error(`Comment failed: ${errorMessage(error, 'Supabase rejected the comment')}`);
  return data;
}

export async function addShare(postId: string) {
  const me = await getSessionUser();
  if (!me) throw new Error('Please sign in to share posts.');
  const { data, error } = await supabase.from('post_shares')
    .insert({ post_id: postId, user_id: me.id }).select().single();
  if (error) throw new Error(`Share failed: ${errorMessage(error, 'Supabase rejected the share')}`);
  if (!data) throw new Error('Share succeeded but returned no record.');
  return data;
}

export async function markStoryViewed(storyId: string) {
  try {
    const me = await getSessionUser();
    if (!me) return;
    const { error } = await supabase.from('story_views').upsert(
      { story_id: storyId, user_id: me.id },
      { onConflict: 'story_id,user_id' },
    );
    if (error) console.warn('Could not mark story as viewed:', error.message);
  } catch (error) {
    console.warn('Could not mark story as viewed:', errorMessage(error, 'unknown error'));
  }
}

export type ProductRecord = {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  currency: string;
  stock: number;
  fulfillment: string;
  estimated_arrival: string | null;
  image_urls: string[];
  attributes: Record<string, unknown>;
  stock_status?: 'in_stock' | 'out_of_stock';
  gender?: string | null;
  filters?: Record<string, unknown>;
  delivery_options?: string[];
  bid_min_price?: number | null;
  bid_ends_at?: string | null;
  created_at: string;
  store?: { id: string; name: string; owner_id: string; lat?: number | null; lng?: number | null } | null;
};

export async function createStore(input: { name: string; description: string; location?: string; categories?: string[]; bannerUrls?: string[] }) {
  const user = await getSessionUser();
  if (!user) throw new Error('Please sign in to create your shop.');
  const name = input.name.trim();
  if (!name) throw new Error('Add a shop name first.');
  const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'shop';
  const slug = `${baseSlug}-${user.id.replace(/-/g, '').slice(-6)}`;
  const { data, error } = await supabase.from('stores').insert({
    owner_id: user.id,
    name,
    slug,
    description: input.description.trim(),
    categories: input.categories || [],
    banner_urls: input.bannerUrls || [],
  }).select('id,owner_id,name,slug,description,categories,banner_urls,lat,lng,rating,verification_status,created_at').single();
  if (error) throw new Error(`Shop creation failed: ${errorMessage(error, 'Supabase rejected the shop')}`);
  return data;
}

export async function updateStore(storeId: string, input: { name: string; description: string; categories?: string[]; bannerUrls?: string[] }) {
  const user = await getSessionUser();
  if (!user) throw new Error('Please sign in to edit your shop.');
  const { data, error } = await supabase.from('stores').update({
    name: input.name.trim(),
    description: input.description.trim(),
    ...(input.categories ? { categories: input.categories } : {}),
    ...(input.bannerUrls ? { banner_urls: input.bannerUrls } : {}),
  }).eq('id', storeId).eq('owner_id', user.id).select().single();
  if (error) throw new Error(`Shop update failed: ${errorMessage(error, 'Supabase rejected the shop')}`);
  return data;
}

export type ServiceRecord = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  duration_minutes: number;
  delivery_options: string[];
  filters: Record<string, unknown>;
  image_urls: string[];
  created_at: string;
};

export async function createService(input: { name: string; description: string; category: string; price: number; durationMinutes: number; deliveryOptions: string[]; filters: Record<string, unknown>; media?: MediaItem[] }) {
  const user = await getSessionUser();
  if (!user) throw new Error('Please sign in to publish a service.');
  const uploadedPaths: string[] = [];
  try {
    const imageUrls: string[] = [];
    for (const item of input.media || []) {
      const uploaded = await uploadMedia(user.id, item, 'services');
      uploadedPaths.push(uploaded.path);
      imageUrls.push(uploaded.url);
    }
    const { data, error } = await supabase.from('services').insert({
      owner_id: user.id,
      name: input.name.trim(),
      description: input.description.trim(),
      category: input.category.trim(),
      price: input.price,
      duration_minutes: input.durationMinutes,
      delivery_options: input.deliveryOptions,
      filters: input.filters,
      image_urls: imageUrls,
    }).select().single();
    if (error) throw new Error(`Service publish failed: ${errorMessage(error, 'Supabase rejected the service')}`);
    return data as ServiceRecord;
  } catch (error) {
    await removeUploadedMedia(uploadedPaths);
    throw error;
  }
}


export async function updateService(serviceId: string, input: { name: string; description: string; category: string; price: number; durationMinutes: number; deliveryOptions: string[]; filters: Record<string, unknown>; media?: MediaItem[]; existingImageUrls?: string[] }) {
  const user = await getSessionUser();
  if (!user) throw new Error('Please sign in to edit a service.');
  const uploadedPaths: string[] = [];
  try {
    const imageUrls = [...(input.existingImageUrls || [])];
    for (const item of input.media || []) {
      const uploaded = await uploadMedia(user.id, item, 'services');
      uploadedPaths.push(uploaded.path); imageUrls.push(uploaded.url);
    }
    const { data, error } = await supabase.from('services').update({
      name: input.name.trim(), description: input.description.trim(), category: input.category.trim(),
      price: input.price, duration_minutes: input.durationMinutes, delivery_options: input.deliveryOptions,
      filters: input.filters, image_urls: imageUrls.slice(0, 4),
    }).eq('id', serviceId).eq('owner_id', user.id).select().single();
    if (error) throw new Error(`Service update failed: ${errorMessage(error, 'Supabase rejected the service')}`);
    return data as ServiceRecord;
  } catch (error) { await removeUploadedMedia(uploadedPaths); throw error; }
}


export async function getCategoryDefinitions(group?: 'main' | 'marketplace'): Promise<CategoryDefinition[]> {
  let query = supabase.from('marketplace_categories').select('slug,label,subtitle,icon,color,image,subcategories,category_group,sort_order').eq('active', true).order('sort_order', { ascending: true });
  if (group) query = query.eq('category_group', group);
  const { data, error } = await query;
  if (error) throw new Error('Could not load categories: ' + errorMessage(error, 'Supabase rejected the request'));
  return (data || []).map((row: any) => ({ slug: row.slug, label: row.label, subtitle: row.subtitle || '', icon: row.icon, color: row.color, image: row.image, subcategories: Array.isArray(row.subcategories) ? row.subcategories : [], })) as CategoryDefinition[];
}

export async function getServices(ownerId?: string) {
  let query = supabase.from('services').select('id,owner_id,name,description,category,price,duration_minutes,delivery_options,filters,image_urls,created_at').order('created_at', { ascending: false, nullsFirst: false }).limit(80);
  if (ownerId) query = query.eq('owner_id', ownerId);
  const { data, error } = await query;
  if (error) throw new Error(`Could not load services: ${errorMessage(error, 'Supabase rejected the request')}`);
  return (data || []).map((row: any) => ({
    ...row,
    image_urls: normalizeImageUrls(row.image_urls),
    filters: row.filters && typeof row.filters === 'object' ? row.filters : {},
  })) as ServiceRecord[];
}

export async function getService(serviceId: string) {
  const { data, error } = await supabase.from('services').select('id,owner_id,name,description,category,price,duration_minutes,delivery_options,filters,image_urls,created_at').eq('id', serviceId).maybeSingle();
  if (error) throw new Error(`Could not load service: ${errorMessage(error, 'Supabase rejected the request')}`);
  if (!data) return null;
  return { ...(data as any), image_urls: normalizeImageUrls((data as any).image_urls) } as ServiceRecord;
}

export async function createProduct(input: {
  storeId: string;
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  fulfillment: string;
  bidEnabled: boolean;
  bidPrice: number | null;
  media: MediaItem[];
  stockStatus?: 'in_stock' | 'out_of_stock';
  gender?: string;
  filters?: Record<string, unknown>;
  deliveryOptions?: string[];
  bidEndsAt?: string | null;
}) {
  const user = await getSessionUser();
  if (!user) throw new Error('Please sign in to publish a product.');
  if (!input.name.trim()) throw new Error('Add a product name.');
  if (!Number.isFinite(input.price) || input.price < 0) throw new Error('Add a valid price.');
  const uploadedPaths: string[] = [];
  try {
    const imageUrls: string[] = [];
    for (const item of input.media) {
      const uploaded = await uploadMedia(user.id, item, 'products');
      uploadedPaths.push(uploaded.path);
      imageUrls.push(uploaded.url);
    }
    const { data, error } = await supabase.from('products').insert({
      store_id: input.storeId,
      name: input.name.trim(),
      description: input.description.trim(),
      category: input.category.trim() || 'Beauty',
      price: input.price,
      stock: Math.max(0, Math.floor(input.stock)),
      stock_status: input.stockStatus || (input.stock > 0 ? 'in_stock' : 'out_of_stock'),
      fulfillment: input.fulfillment,
      gender: input.gender || 'all',
      filters: input.filters || {},
      delivery_options: input.deliveryOptions || [],
      bid_min_price: input.bidEnabled ? input.bidPrice : null,
      bid_ends_at: input.bidEnabled ? input.bidEndsAt || null : null,
      image_urls: imageUrls,
      attributes: {
        bid_enabled: input.bidEnabled,
        bid_price: input.bidEnabled ? input.bidPrice : null,
      },
    }).select().single();
    if (error) throw new Error(`Product publish failed: ${errorMessage(error, 'Supabase rejected the product')}`);
    return data as ProductRecord;
  } catch (error) {
    await removeUploadedMedia(uploadedPaths);
    throw error;
  }
}

export async function updateProduct(productId: string, input: {
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  stockStatus: 'in_stock' | 'out_of_stock';
  fulfillment: string;
  bidEnabled: boolean;
  bidPrice: number | null;
  bidEndsAt: string | null;
  gender: string;
  filters: Record<string, unknown>;
  deliveryOptions: string[];
  media: MediaItem[];
  existingImageUrls: string[];
}) {
  const user = await getSessionUser();
  if (!user) throw new Error('Please sign in to edit a product.');
  const uploadedPaths: string[] = [];
  try {
    const imageUrls = [...input.existingImageUrls];
    for (const item of input.media) {
      const uploaded = await uploadMedia(user.id, item, 'products');
      uploadedPaths.push(uploaded.path);
      imageUrls.push(uploaded.url);
    }
    const { data, error } = await supabase.from('products').update({
      name: input.name.trim(),
      description: input.description.trim(),
      category: input.category.trim() || 'Beauty',
      price: input.price,
      stock: Math.max(0, Math.floor(input.stock)),
      stock_status: input.stockStatus,
      fulfillment: input.fulfillment,
      gender: input.gender || 'all',
      filters: input.filters,
      delivery_options: input.deliveryOptions,
      bid_min_price: input.bidEnabled ? input.bidPrice : null,
      bid_ends_at: input.bidEnabled ? input.bidEndsAt : null,
      image_urls: imageUrls.slice(0, 4),
      attributes: { bid_enabled: input.bidEnabled, bid_price: input.bidEnabled ? input.bidPrice : null },
    }).eq('id', productId).select().single();
    if (error) throw new Error(`Product update failed: ${errorMessage(error, 'Supabase rejected the product')}`);
    return data as ProductRecord;
  } catch (error) {
    await removeUploadedMedia(uploadedPaths);
    throw error;
  }
}

export async function deleteProduct(productId: string) {
  const user = await getSessionUser();
  if (!user) throw new Error('Please sign in to delete a product.');
  const { data, error } = await supabase.from('products').delete().eq('id', productId).select('id').maybeSingle();
  if (error) throw new Error(`Product delete failed: ${errorMessage(error, 'Supabase rejected the deletion')}`);
  if (!data) throw new Error('Product not found or you do not own it.');
}

export async function deleteService(serviceId: string) {
  const user = await getSessionUser();
  if (!user) throw new Error('Please sign in to delete a service.');
  const { error } = await supabase.from('services').delete().eq('id', serviceId).eq('owner_id', user.id);
  if (error) throw new Error(`Service delete failed: ${errorMessage(error, 'Supabase rejected the deletion')}`);
}

export async function createMarketplaceAnnouncement(input: {
  productId?: string;
  serviceId?: string;
  body: string;
  imageUrls?: string[];
  storeName: string;
  storeSlug?: string;
}) {
  const user = await getSessionUser();
  if (!user) throw new Error('Please sign in to announce your listing.');
  if (!input.productId && !input.serviceId) throw new Error('Choose a product or service to announce.');
  const { data, error } = await supabase.from('posts').insert({
    author_id: user.id,
    body: input.body.trim(),
    media_urls: (input.imageUrls || []).slice(0, 4),
    visibility: 'public',
    product_id: input.productId || null,
    service_id: input.serviceId || null,
    metadata: {
      kind: 'marketplace_announcement',
      store_name: input.storeName,
      store_slug: input.storeSlug || null,
      product_id: input.productId || null,
      service_id: input.serviceId || null,
    },
  }).select().single();
  if (error) throw new Error(`Announcement failed: ${errorMessage(error, 'Supabase rejected the announcement')}`);
  return data;
}

export async function getProducts(
  limit = 50,
  options: { storeId?: string; category?: string; search?: string; productId?: string; includeOutOfStock?: boolean; minPrice?: number; maxPrice?: number; sort?: 'best_match' | 'price_low' | 'price_high' | 'ending_soon' | 'newest' } = {},
): Promise<ProductRecord[]> {
  let query = supabase
    .from('products')
    .select('id,store_id,name,description,category,price,currency,stock,stock_status,gender,filters,delivery_options,bid_min_price,bid_ends_at,fulfillment,estimated_arrival,image_urls,attributes,created_at,stores(id,name,owner_id,lat,lng)')
    .limit(Math.max(1, limit));
  if (options.storeId) query = query.eq('store_id', options.storeId);
  if (options.productId) query = query.eq('id', options.productId);
  if (!options.includeOutOfStock && !options.productId) query = query.neq('stock_status', 'out_of_stock');
  if (options.category) query = query.ilike('category', options.category);
  if (options.search?.trim()) query = query.ilike('name', `%${options.search.trim()}%`);
  if (options.minPrice !== undefined && Number.isFinite(options.minPrice)) query = query.gte('price', options.minPrice);
  if (options.maxPrice !== undefined && Number.isFinite(options.maxPrice)) query = query.lte('price', options.maxPrice);
  if (options.sort === 'price_low') query = query.order('price', { ascending: true });
  else if (options.sort === 'price_high') query = query.order('price', { ascending: false });
  else if (options.sort === 'ending_soon') query = query.order('bid_ends_at', { ascending: true, nullsFirst: false });
  else query = query.order('created_at', { ascending: false, nullsFirst: false });
  const { data, error } = await query;
  if (error) throw new Error(`Could not load products: ${errorMessage(error, 'Supabase rejected the request')}`);
  return (data || []).map((row: any) => ({
    ...row,
    image_urls: Array.isArray(row.image_urls) ? row.image_urls : [],
    attributes: row.attributes && typeof row.attributes === 'object' ? row.attributes : {},
    store: Array.isArray(row.stores) ? row.stores[0] || null : row.stores || null,
  })) as ProductRecord[];
}

export async function getStore(identifier: string) {
  if (!identifier) return null;
  let store: any = null;
  let storeError: unknown = null;
  if (identifier === 'me') {
    const user = await getSessionUser();
    if (!user) throw new Error('Please sign in to view your shop.');
    const result = await supabase
      .from('stores')
    .select('id,owner_id,name,slug,description,categories,banner_urls,lat,lng,rating,verification_status,created_at')
      .eq('owner_id', user.id)
      .maybeSingle();
    store = result.data;
    storeError = result.error;
  } else {
    const bySlug = await supabase
      .from('stores')
      .select('id,owner_id,name,slug,description,categories,banner_urls,lat,lng,rating,verification_status,created_at')
      .eq('slug', identifier)
      .maybeSingle();
    store = bySlug.data;
    storeError = bySlug.error;
    if (!store && !storeError) {
      const byId = await supabase
        .from('stores')
        .select('id,owner_id,name,slug,description,categories,banner_urls,lat,lng,rating,verification_status,created_at')
        .eq('id', identifier)
        .maybeSingle();
      store = byId.data;
      storeError = byId.error;
    }
    if (!store && !storeError) {
      const byOwner = await supabase
        .from('stores')
        .select('id,owner_id,name,slug,description,categories,banner_urls,lat,lng,rating,verification_status,created_at')
        .eq('owner_id', identifier)
        .maybeSingle();
      store = byOwner.data;
      storeError = byOwner.error;
    }
  }
  if (storeError) throw new Error(`Could not load store: ${errorMessage(storeError, 'Supabase rejected the request')}`);
  if (!store) return null;
  const { data: owner, error: ownerError } = await supabase
    .from('profiles')
      .select('id,display_name,handle,bio,avatar_url,verified,followers_count,following_count,created_at,country,area,location,date_of_birth,links,video_autoplay')
    .eq('id', store.owner_id)
    .maybeSingle();
  if (ownerError) throw new Error(`Could not load store owner: ${errorMessage(ownerError, 'Supabase rejected the request')}`);
  return { ...store, owner };
}


export type ChatSummary = {
  id: string;
  name: string;
  avatar_url: string | null;
  verified: boolean;
  preview: string;
  time: string;
  unread: number;
  otherUserId: string | null;
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  media: Record<string, unknown> | null;
  created_at: string;
  status: string | null;
};

async function requireConversationMember(conversationId: string, userId: string) {
  const { data, error } = await supabase
    .from('conversation_members')
    .select('conversation_id')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(`Could not verify conversation access: ${errorMessage(error, 'Supabase rejected the request')}`);
  if (!data) throw new Error('You are not a member of this conversation.');
}

export async function getMessages(conversationId: string): Promise<ChatMessage[]> {
  const me = await getSessionUser();
  if (!me) throw new Error('Please sign in.');
  await requireConversationMember(conversationId, me.id);
  const { data, error } = await supabase
    .from('messages')
    .select('id,conversation_id,sender_id,body,media,created_at,status')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`Could not load messages: ${errorMessage(error, 'Supabase rejected the request')}`);
  return (data || []) as ChatMessage[];
}

export async function getChatSummaries(): Promise<ChatSummary[]> {
  const me = await getSessionUser();
  if (!me) throw new Error('Please sign in to view messages.');

  const { data: memberships, error: membershipError } = await supabase
    .from('conversation_members')
    .select('conversation_id')
    .eq('user_id', me.id);
  if (membershipError) throw new Error(`Could not load conversations: ${errorMessage(membershipError, 'Supabase rejected the request')}`);

  const ids = (memberships || []).map((row: any) => row.conversation_id);
  if (!ids.length) return [];

  const { data: conversations, error: conversationError } = await supabase
    .from('conversations')
    .select('id,kind,title,created_at')
    .in('id', ids)
    .order('created_at', { ascending: false });
  if (conversationError) throw new Error(`Could not load conversations: ${errorMessage(conversationError, 'Supabase rejected the request')}`);

  const { data: members, error: membersError } = await supabase
    .from('conversation_members')
    .select('conversation_id,user_id')
    .in('conversation_id', ids);
  if (membersError) throw new Error(`Could not load conversation members: ${errorMessage(membersError, 'Supabase rejected the request')}`);

  const otherIds = [...new Set((members || []).filter((m: any) => m.user_id !== me.id).map((m: any) => m.user_id))];
  const { data: profiles, error: profilesError } = otherIds.length
    ? await supabase.from('profiles').select('id,display_name,avatar_url,verified').in('id', otherIds)
    : { data: [], error: null as any };
  if (profilesError) throw new Error(`Could not load chat profiles: ${errorMessage(profilesError, 'Supabase rejected the request')}`);

  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
  const otherByConversation = new Map<string, string>();
  (members || []).forEach((m: any) => {
    if (m.user_id !== me.id) otherByConversation.set(m.conversation_id, m.user_id);
  });

  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select('id,conversation_id,sender_id,body,created_at,status')
    .in('conversation_id', ids)
    .order('created_at', { ascending: false })
    .limit(200);
  if (messagesError) throw new Error(`Could not load messages: ${errorMessage(messagesError, 'Supabase rejected the request')}`);

  const latest = new Map<string, any>();
  (messages || []).forEach((m: any) => { if (!latest.has(m.conversation_id)) latest.set(m.conversation_id, m); });

  return (conversations || []).map((conversation: any) => {
    const otherId = otherByConversation.get(conversation.id) || null;
    const profile = otherId ? profileMap.get(otherId) : null;
    const last = latest.get(conversation.id);
    const preview = last?.body || (last?.media ? 'Media' : 'Start a conversation');
    const date = last?.created_at || conversation.created_at;
    return {
      id: conversation.id,
      name: profile?.display_name || conversation.title || 'Conversation',
      avatar_url: profile?.avatar_url || null,
      verified: Boolean(profile?.verified),
      preview,
      time: formatChatTime(date),
      unread: 0,
      otherUserId: otherId,
    };
  });
}

function formatChatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 60) return `${minutes || 1}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  if (hours < 48) return 'Yesterday';
  return date.toLocaleDateString();
}

export async function createDirectConversation(otherUserId: string) {
  const me = await getSessionUser();
  if (!me) throw new Error('Please sign in to start a conversation.');
  if (me.id === otherUserId) throw new Error('You cannot message yourself.');

  const { data: mine, error: mineError } = await supabase
    .from('conversation_members').select('conversation_id').eq('user_id', me.id);
  if (mineError) throw new Error(`Could not load your conversations: ${errorMessage(mineError, 'Supabase rejected the request')}`);
  const mineIds = (mine || []).map((row: any) => row.conversation_id);

  if (mineIds.length) {
    const { data: theirMemberships, error: theirError } = await supabase
      .from('conversation_members').select('conversation_id').eq('user_id', otherUserId).in('conversation_id', mineIds);
    if (theirError) throw new Error(`Could not check existing conversation: ${errorMessage(theirError, 'Supabase rejected the request')}`);
    if (theirMemberships?.length) {
      const candidateIds = theirMemberships.map((row: any) => row.conversation_id);
      const { data: members, error: membersError } = await supabase
        .from('conversation_members').select('conversation_id,user_id').in('conversation_id', candidateIds);
      if (membersError) throw new Error(`Could not verify conversation: ${errorMessage(membersError, 'Supabase rejected the request')}`);
      const direct = candidateIds.find((conversationId: string) => {
        const users = (members || []).filter((m: any) => m.conversation_id === conversationId).map((m: any) => m.user_id);
        return users.length === 2 && users.includes(me.id) && users.includes(otherUserId);
      });
      if (direct) return direct;
    }
  }

  const { data: conversation, error: createError } = await supabase
    .from('conversations').insert({ kind: 'direct' }).select('id').single();
  if (createError || !conversation) throw new Error(`Could not create conversation: ${errorMessage(createError, 'Supabase rejected the conversation')}`);

  const { error: memberInsertError } = await supabase.from('conversation_members').insert([
    { conversation_id: conversation.id, user_id: me.id },
    { conversation_id: conversation.id, user_id: otherUserId },
  ]);
  if (memberInsertError) {
    await supabase.from('conversations').delete().eq('id', conversation.id);
    throw new Error(`Could not add conversation members: ${errorMessage(memberInsertError, 'Supabase rejected the request')}`);
  }
  return conversation.id as string;
}

export async function getConversation(id: string) {
  const me = await getSessionUser();
  if (!me) throw new Error('Please sign in.');
  await requireConversationMember(id, me.id);

  const { data: members, error: membersError } = await supabase
    .from('conversation_members').select('user_id').eq('conversation_id', id);
  if (membersError) throw new Error(`Could not load conversation members: ${errorMessage(membersError, 'Supabase rejected the request')}`);
  const otherId = (members || []).map((m: any) => m.user_id).find((userId: string) => userId !== me.id) || null;
  let profile: any = null;
  if (otherId) {
    const result = await supabase.from('profiles').select('id,display_name,avatar_url,verified').eq('id', otherId).maybeSingle();
    if (result.error) throw new Error(`Could not load profile: ${errorMessage(result.error, 'Supabase rejected the request')}`);
    profile = result.data;
  }
  const messages = await getMessages(id);
  return { meId: me.id, otherId, other: profile, profile, messages };
}

export async function sendMessage(conversationId: string, body: string) {
  const me = await getSessionUser();
  if (!me) throw new Error('Please sign in to send a message.');
  const trimmed = body.trim();
  if (!trimmed) return null;
  const { data, error } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_id: me.id,
    body: trimmed,
    status: 'sent',
  }).select('id,sender_id,body,media,created_at,status').single();
  if (error) throw new Error(`Message failed: ${errorMessage(error, 'Supabase rejected the message')}`);
  return data as ChatMessage;
}


export type SellerStudioTransaction = { id: string; amount: number; status: string; fulfillment_status: string; created_at: string };
export type SellerStudioVisitor = { user_id: string; display_name: string; handle?: string | null; avatar_url?: string | null; last_seen: string; visits: number };
export type SellerStudioCustomer = { customer_id: string; display_name: string; handle?: string | null; avatar_url?: string | null; product_id?: string | null; product_name?: string | null; product_image?: string | null; quantity: number; purchased_at: string };
export type SellerStudioTrafficSource = { source: string; events: number };
export type SellerStudioMetrics = { products: number; services: number; orders: number; paid_orders: number; gross_revenue: number; pending_revenue: number; visitors: number; views: number; engagement: number; clicks: number; carts: number; checkouts: number; purchases: number; customers: number; favourites: number; withdrawn: number; transactions: SellerStudioTransaction[] };
export type SellerStudioSeriesPoint = { date: string; revenue: number; orders: number; visitors: number; views: number; purchases: number };
const EMPTY_SELLER_METRICS: SellerStudioMetrics = { products: 0, services: 0, orders: 0, paid_orders: 0, gross_revenue: 0, pending_revenue: 0, visitors: 0, views: 0, engagement: 0, clicks: 0, carts: 0, checkouts: 0, purchases: 0, customers: 0, favourites: 0, withdrawn: 0, transactions: [] };
export async function getSellerStudioMetrics(storeId: string, days = 30): Promise<SellerStudioMetrics> {
  const end = new Date();
  const start = new Date(end.getTime() - days * 86400000);
  const { data, error } = await supabase.rpc('get_seller_studio_metrics', { p_store_id: storeId, p_start: start.toISOString(), p_end: end.toISOString() });
  if (error) throw new Error(`Could not load seller analytics: ${errorMessage(error, 'Supabase rejected the request')}`);
  return { ...EMPTY_SELLER_METRICS, ...(data || {}) };
}
export async function getSellerStudioSeries(storeId: string, days = 30): Promise<SellerStudioSeriesPoint[]> {
  const end = new Date();
  const start = new Date(end.getTime() - days * 86400000);
  const { data, error } = await supabase.rpc('get_seller_studio_series', { p_store_id: storeId, p_start: start.toISOString(), p_end: end.toISOString() });
  if (error) { console.warn('Seller chart series unavailable:', error.message); return []; }
  return Array.isArray(data) ? data as SellerStudioSeriesPoint[] : [];
}
export async function getSellerStudioVisitors(storeId: string, days = 30): Promise<SellerStudioVisitor[]> {
  const end = new Date();
  const start = new Date(end.getTime() - days * 86400000);
  const { data, error } = await supabase.rpc('get_seller_studio_visitors', { p_store_id: storeId, p_start: start.toISOString(), p_end: end.toISOString() });
  if (error) throw new Error(`Could not load visitors: ${errorMessage(error, 'Supabase rejected the request')}`);
  return Array.isArray(data) ? data as SellerStudioVisitor[] : [];
}
export async function getSellerStudioTrafficSources(storeId: string, days = 30): Promise<SellerStudioTrafficSource[]> {
  const end = new Date();
  const start = new Date(end.getTime() - days * 86400000);
  const { data, error } = await supabase.rpc('get_seller_studio_traffic_sources', { p_store_id: storeId, p_start: start.toISOString(), p_end: end.toISOString() });
  if (error) throw new Error(`Could not load traffic sources: ${errorMessage(error, 'Supabase rejected the request')}`);
  return Array.isArray(data) ? data as SellerStudioTrafficSource[] : [];
}
export async function getSellerStudioCustomers(storeId: string): Promise<SellerStudioCustomer[]> {
  const { data, error } = await supabase.rpc('get_seller_studio_customers', { p_store_id: storeId });
  if (error) throw new Error(`Could not load customers: ${errorMessage(error, 'Supabase rejected the request')}`);
  return Array.isArray(data) ? data as SellerStudioCustomer[] : [];
}
export async function createSellerAnnouncement(storeId: string, title: string, body: string, publishToFeed: boolean) {
  const user = await getSessionUser();
  if (!user) throw new Error('Please sign in to publish an announcement.');
  const { data, error } = await supabase.from('seller_announcements').insert({ store_id: storeId, author_id: user.id, title: title.trim(), body: body.trim(), publish_to_feed: publishToFeed }).select().single();
  if (error) throw new Error(`Could not publish announcement: ${errorMessage(error, 'Supabase rejected the announcement')}`);
  if (publishToFeed) {
    const post = await supabase.from('posts').insert({ author_id: user.id, body: title.trim() + '\n\n' + body.trim(), media_urls: [], visibility: 'public', metadata: { type: 'seller_announcement', store_id: storeId, announcement_id: data.id } });
    if (post.error) throw new Error(`Announcement saved but feed post failed: ${errorMessage(post.error, 'Supabase rejected the post')}`);
  }
  return data;
}
export async function createSellerCampaign(storeId: string, name: string, message: string, audience: string) {
  const user = await getSessionUser();
  if (!user) throw new Error('Please sign in to create a campaign.');
  const { data, error } = await supabase.from('seller_campaigns').insert({ store_id: storeId, owner_id: user.id, name: name.trim(), message: message.trim(), audience }).select().single();
  if (error) throw new Error(`Could not save campaign: ${errorMessage(error, 'Supabase rejected the campaign')}`);
  return data;
}
export async function createSellerDiscount(storeId: string, title: string, code: string, percentOff: number) {
  const user = await getSessionUser();
  if (!user) throw new Error('Please sign in to create a discount.');
  const { data, error } = await supabase.from('seller_discounts').insert({ store_id: storeId, owner_id: user.id, title: title.trim(), code: code.trim() || null, percent_off: percentOff }).select().single();
  if (error) throw new Error(`Could not save discount: ${errorMessage(error, 'Supabase rejected the discount')}`);
  return data;
}
export async function getSellerAnnouncements(storeId: string) {
  const { data, error } = await supabase.from('seller_announcements').select('id,title,body,created_at').eq('store_id', storeId).eq('published', true).order('created_at', { ascending: false }).limit(5);
  if (error) throw new Error(`Could not load announcements: ${errorMessage(error, 'Supabase rejected the request')}`);
  return data || [];
}
export async function requestSellerPayout(storeId: string, amount: number) {
  const { data, error } = await supabase.rpc('request_seller_payout', { p_store_id: storeId, p_amount: amount });
  if (error) throw new Error(`Could not request withdrawal: ${errorMessage(error, 'Supabase rejected the request')}`);
  return data;
}

export type SellerEvent = { id:string; store_id:string; owner_id:string; name:string; description:string; banner_url?:string|null; event_mode:'online'|'physical'; location?:string|null; starts_at:string; ends_at?:string|null; ticket_price:number; ticket_quantity:number; tickets_sold:number; published:boolean; created_at:string };
export async function getSellerEvents(storeId:string):Promise<SellerEvent[]> { const {data,error}=await supabase.from('seller_planned_events').select('id,store_id,owner_id,name,description,banner_url,event_mode,location,starts_at,ends_at,ticket_price,ticket_quantity,tickets_sold,published,created_at').eq('store_id',storeId).order('starts_at',{ascending:true}); if(error) throw new Error('Could not load events: '+errorMessage(error,'Supabase rejected the request')); return (data||[]) as SellerEvent[]; }
export async function getPublishedEvents(): Promise<SellerEvent[]> {
  const { data, error } = await supabase.from('seller_planned_events').select('id,store_id,owner_id,name,description,banner_url,event_mode,location,starts_at,ends_at,ticket_price,ticket_quantity,tickets_sold,published,created_at').eq('published', true).order('starts_at', { ascending: true }).limit(50);
  if (error) throw new Error('Could not load events: ' + errorMessage(error, 'Supabase rejected the request'));
  return (data || []) as SellerEvent[];
}

export async function createSellerEvent(storeId:string,input:{name:string;description:string;bannerUrl:string;eventMode:'online'|'physical';location:string;startsAt:string;endsAt:string;ticketPrice:number;ticketQuantity:number}) { const user=await getSessionUser(); if(!user) throw new Error('Please sign in to create an event.'); const {data,error}=await supabase.from('seller_planned_events').insert({store_id:storeId,owner_id:user.id,name:input.name.trim(),description:input.description.trim(),banner_url:input.bannerUrl.trim()||null,event_mode:input.eventMode,location:input.eventMode==='physical'?input.location.trim()||null:null,starts_at:new Date(input.startsAt).toISOString(),ends_at:input.endsAt.trim()?new Date(input.endsAt).toISOString():null,ticket_price:input.ticketPrice,ticket_quantity:input.ticketQuantity}).select().single(); if(error) throw new Error('Could not launch event: '+errorMessage(error,'Supabase rejected the event')); return data as SellerEvent; }
export async function purchaseSellerEventTicket(eventId:string,quantity=1){const {data,error}=await supabase.rpc('purchase_seller_event_ticket',{p_event_id:eventId,p_quantity:quantity});if(error)throw new Error('Could not get ticket: '+errorMessage(error,'Supabase rejected the ticket request'));return data as string;}

export async function recordSellerEvent(input: { storeId: string; eventType: 'impression' | 'view' | 'engagement' | 'product_click' | 'cart' | 'checkout' | 'purchase'; source: string; productId?: string; sessionId?: string; metadata?: Record<string, unknown> }) {
  const user = await getSessionUser().catch(() => null);
  const { error } = await supabase.from('seller_events').insert({ store_id: input.storeId, product_id: input.productId || null, actor_id: user?.id || null, session_id: input.sessionId || null, event_type: input.eventType, source: input.source, metadata: input.metadata || {} });
  if (error) console.warn('Could not record seller event:', error.message);
}
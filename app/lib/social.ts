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

export async function uploadMedia(userId: string, item: MediaItem, folder: 'posts' | 'stories' | 'products' | 'avatars') {
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
};

export async function getCurrentProfile(): Promise<ProfileRecord | null> {
  const user = await getSessionUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id,display_name,handle,bio,avatar_url,verified,followers_count,following_count,created_at,country,area,location,date_of_birth,links')
    .eq('id', user.id)
    .maybeSingle();
  if (error) throw new Error(`Could not load your profile: ${errorMessage(error, 'Supabase rejected the request')}`);
  return data as ProfileRecord | null;
}

export async function updateCurrentProfile(input: {
  display_name: string;
  bio: string;
  country: string;
  area: string;
  location: string;
  date_of_birth: string | null;
  links: string[];
  avatar_url?: string | null;
}) {
  const user = await getSessionUser();
  if (!user) throw new Error('Please sign in to edit your profile.');
  const { data, error } = await supabase.from('profiles').update({
    display_name: input.display_name.trim(),
    bio: input.bio.trim(),
    country: input.country.trim() || null,
    area: input.area.trim() || null,
    location: input.location.trim() || null,
    date_of_birth: input.date_of_birth || null,
    links: input.links.filter(Boolean),
    ...(input.avatar_url !== undefined ? { avatar_url: input.avatar_url } : {}),
  }).eq('id', user.id).select().single();
  if (error) throw new Error(`Profile update failed: ${errorMessage(error, 'Supabase rejected the profile')}`);
  return data as ProfileRecord;
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
  created_at: string;
  store?: { id: string; name: string; owner_id: string } | null;
};

export async function createStore(input: { name: string; description: string; location?: string }) {
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
  }).select('id,owner_id,name,slug,description,lat,lng,rating,verification_status,created_at').single();
  if (error) throw new Error(`Shop creation failed: ${errorMessage(error, 'Supabase rejected the shop')}`);
  return data;
}

export async function updateStore(storeId: string, input: { name: string; description: string }) {
  const user = await getSessionUser();
  if (!user) throw new Error('Please sign in to edit your shop.');
  const { data, error } = await supabase.from('stores').update({
    name: input.name.trim(),
    description: input.description.trim(),
  }).eq('id', storeId).eq('owner_id', user.id).select().single();
  if (error) throw new Error(`Shop update failed: ${errorMessage(error, 'Supabase rejected the shop')}`);
  return data;
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
      fulfillment: input.fulfillment,
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

export async function getProducts(
  limit = 50,
  options: { storeId?: string; category?: string; search?: string; productId?: string } = {},
): Promise<ProductRecord[]> {
  let query = supabase
    .from('products')
    .select('id,store_id,name,description,category,price,currency,stock,fulfillment,estimated_arrival,image_urls,attributes,created_at,stores(id,name,owner_id)')
    .order('created_at', { ascending: false })
    .limit(Math.max(1, limit));
  if (options.storeId) query = query.eq('store_id', options.storeId);
  if (options.productId) query = query.eq('id', options.productId);
  if (options.category) query = query.ilike('category', options.category);
  if (options.search?.trim()) query = query.ilike('name', `%${options.search.trim()}%`);
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
    .select('id,owner_id,name,slug,description,lat,lng,rating,verification_status,created_at')
      .eq('owner_id', user.id)
      .maybeSingle();
    store = result.data;
    storeError = result.error;
  } else {
    const bySlug = await supabase
      .from('stores')
      .select('id,owner_id,name,slug,description,lat,lng,rating,verification_status,created_at')
      .eq('slug', identifier)
      .maybeSingle();
    store = bySlug.data;
    storeError = bySlug.error;
    if (!store && !storeError) {
      const byId = await supabase
        .from('stores')
        .select('id,owner_id,name,slug,description,lat,lng,rating,verification_status,created_at')
        .eq('id', identifier)
        .maybeSingle();
      store = byId.data;
      storeError = byId.error;
    }
    if (!store && !storeError) {
      const byOwner = await supabase
        .from('stores')
        .select('id,owner_id,name,slug,description,lat,lng,rating,verification_status,created_at')
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
      .select('id,display_name,handle,bio,avatar_url,verified,followers_count,following_count,created_at,country,area,location,date_of_birth,links')
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

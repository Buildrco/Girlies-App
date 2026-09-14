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

async function uploadMedia(userId: string, item: MediaItem, folder: 'posts' | 'stories') {
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

export async function createPost(body: string, media: MediaItem[]) {
  const user = await getSessionUser();
  if (!user) throw new Error('Please sign in to post.');
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
      body: body.trim(),
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
    const { error } = await supabase.from('follows').upsert(
      { follower_id: me.id, following_id: userId },
      { onConflict: 'follower_id,following_id' },
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
    const { error } = await supabase.from('post_likes').upsert(
      { post_id: postId, user_id: me.id },
      { onConflict: 'post_id,user_id' },
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

export async function setBookmark(postId: string, shouldBookmark: boolean) {
  const me = await getSessionUser();
  if (!me) throw new Error('Please sign in.');
  if (shouldBookmark) {
    const { error } = await supabase.from('bookmarks').upsert(
      { post_id: postId, user_id: me.id },
      { onConflict: 'post_id,user_id' },
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
  const { data, error } = await supabase.from('post_comments')
    .insert({ post_id: postId, user_id: me.id, body: body.trim() }).select().single();
  if (error) throw error;
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

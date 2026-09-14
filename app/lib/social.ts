import { supabase } from './supabase';

export type MediaItem = { uri: string; type: 'image' | 'video'; name?: string };

async function uploadMedia(userId: string, item: MediaItem, folder: 'posts' | 'stories') {
  const ext = item.name?.split('.').pop()?.toLowerCase() || (item.type === 'video' ? 'mp4' : 'jpg');
  const path = `${userId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const blob = await (await fetch(item.uri)).blob();
  const { error } = await supabase.storage.from('social-media').upload(path, blob, {
    contentType: item.type === 'video' ? 'video/mp4' : 'image/jpeg',
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('social-media').getPublicUrl(path);
  return data.publicUrl;
}

export async function getSessionUser() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
}

export async function createPost(body: string, media: MediaItem[]) {
  const user = await getSessionUser();
  if (!user) throw new Error('Please sign in to post.');
  const media_urls = [];
  for (const item of media) media_urls.push(await uploadMedia(user.id, item, 'posts'));
  const { data, error } = await supabase.from('posts').insert({
    author_id: user.id,
    body: body.trim(),
    media_urls,
    visibility: 'public',
  }).select().single();
  if (error) throw error;
  return data;
}

export async function createStory(item: MediaItem, caption = '') {
  const user = await getSessionUser();
  if (!user) throw new Error('Please sign in to update your story.');
  const media_url = await uploadMedia(user.id, item, 'stories');
  const { data, error } = await supabase.from('stories').insert({
    user_id: user.id,
    media_url,
    media_type: item.type,
    caption: caption.trim(),
  }).select().single();
  if (error) throw error;
  return data;
}

export async function toggleFollow(userId: string) {
  const me = await getSessionUser();
  if (!me) throw new Error('Please sign in.');
  if (me.id === userId) return;
  const { data: existing } = await supabase.from('follows')
    .select('follower_id,following_id').eq('follower_id', me.id).eq('following_id', userId).maybeSingle();
  if (existing) {
    const { error } = await supabase.from('follows').delete().eq('follower_id', me.id).eq('following_id', userId);
    if (error) throw error;
    return false;
  }
  const { error } = await supabase.from('follows').insert({ follower_id: me.id, following_id: userId });
  if (error) throw error;
  return true;
}

export async function togglePostLike(postId: string) {
  const me = await getSessionUser();
  if (!me) throw new Error('Please sign in to like posts.');
  const { data: existing } = await supabase.from('post_likes')
    .select('post_id').eq('post_id', postId).eq('user_id', me.id).maybeSingle();
  if (existing) {
    const { error } = await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', me.id);
    if (error) throw error;
    return false;
  }
  const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: me.id });
  if (error) throw error;
  return true;
}

export async function toggleBookmark(postId: string) {
  const me = await getSessionUser();
  if (!me) throw new Error('Please sign in.');
  const { data: existing } = await supabase.from('bookmarks')
    .select('post_id').eq('post_id', postId).eq('user_id', me.id).maybeSingle();
  if (existing) {
    const { error } = await supabase.from('bookmarks').delete().eq('post_id', postId).eq('user_id', me.id);
    if (error) throw error;
    return false;
  }
  const { error } = await supabase.from('bookmarks').insert({ post_id: postId, user_id: me.id });
  if (error) throw error;
  return true;
}

export async function addComment(postId: string, body: string) {
  const me = await getSessionUser();
  if (!me) throw new Error('Please sign in to comment.');
  const { data, error } = await supabase.from('post_comments')
    .insert({ post_id: postId, user_id: me.id, body: body.trim() }).select().single();
  if (error) throw error;
  return data;
}

export async function markStoryViewed(storyId: string) {
  const me = await getSessionUser();
  if (!me) return;
  await supabase.from('story_views').upsert({ story_id: storyId, user_id: me.id }, { onConflict: 'story_id,user_id' });
}

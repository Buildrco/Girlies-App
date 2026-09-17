update public.posts
set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
  'media_types',
  coalesce((
    select jsonb_agg(
      case
        when lower(media.url) ~ '\.(mp4|mov|m4v|webm|m3u8)(\?|$)' then 'video'::text
        else 'image'::text
      end
      order by media.ordinality
    )
    from unnest(coalesce(media_urls, '{}'::text[])) with ordinality as media(url, ordinality)
  ), '[]'::jsonb)
)
where coalesce(jsonb_typeof(coalesce(metadata, '{}'::jsonb)->'media_types'), 'null') <> 'array';

create or replace function match_client_notes(
  query_embedding  vector(1536),
  match_client_id  uuid,
  match_user_id    uuid,
  match_count      int default 5
)
returns table (
  id        uuid,
  content   text,
  similarity float
)
language sql stable
as $$
  select
    e.id,
    e.content,
    1 - (e.embedding <=> query_embedding) as similarity
  from embeddings e
  where e.client_id = match_client_id
    and e.user_id = match_user_id
  order by e.embedding <=> query_embedding
  limit match_count;
$$;

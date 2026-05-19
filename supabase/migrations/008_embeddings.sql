create table embeddings (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  client_id   uuid not null references clients(id) on delete cascade,
  note_id     uuid not null references client_notes(id) on delete cascade,
  content     text not null,
  embedding   vector(1536),
  created_at  timestamptz default now()
);

alter table embeddings enable row level security;

create policy "Users can only access own embeddings"
  on embeddings for all
  using (auth.uid() = user_id);

create index idx_embeddings_vector
  on embeddings
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index idx_embeddings_client_id on embeddings(client_id);

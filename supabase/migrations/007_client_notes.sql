create table client_notes (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  client_id   uuid not null references clients(id) on delete cascade,
  project_id  uuid references projects(id) on delete set null,
  content     text not null,
  source      text default 'manual'
    check (source in ('manual', 'proposal', 'call_summary', 'email')),
  embedded    boolean default false,
  created_at  timestamptz default now()
);

alter table client_notes enable row level security;

create policy "Users can only access own notes"
  on client_notes for all
  using (auth.uid() = user_id);

create index idx_client_notes_client_id on client_notes(client_id);

create table clients (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  email       text,
  company     text,
  timezone    text,
  notes       text,
  tags        text[],
  status      text default 'active'
    check (status in ('active', 'inactive', 'archived')),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table clients enable row level security;

create policy "Users can only access own clients"
  on clients for all
  using (auth.uid() = user_id);

create index idx_clients_user_id on clients(user_id);

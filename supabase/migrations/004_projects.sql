create table projects (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  client_id       uuid not null references clients(id) on delete cascade,
  name            text not null,
  description     text,
  status          text default 'active'
    check (status in ('active', 'completed', 'on_hold', 'cancelled')),
  budget          numeric(12,2),
  currency        text default 'NGN',
  start_date      date,
  end_date        date,
  original_scope  text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table projects enable row level security;

create policy "Users can only access own projects"
  on projects for all
  using (auth.uid() = user_id);

create index idx_projects_client_id on projects(client_id);
create index idx_projects_user_id on projects(user_id);

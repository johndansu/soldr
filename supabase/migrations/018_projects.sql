-- Projects table
create table if not exists projects (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  client_id   uuid references clients(id) on delete set null,
  name        text not null,
  status      text default 'active' check (status in ('active', 'completed', 'paused', 'cancelled')),
  budget      numeric(12,2),
  currency    text default 'NGN',
  start_date  date,
  end_date    date,
  notes       text,
  created_at  timestamptz default now()
);

alter table projects enable row level security;

create policy "users manage own projects" on projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index projects_user_id_idx on projects(user_id);
create index projects_client_id_idx on projects(client_id);

-- Link existing tables to projects
alter table proposals    add column if not exists project_id uuid references projects(id) on delete set null;
alter table invoices     add column if not exists project_id uuid references projects(id) on delete set null;
alter table scope_results add column if not exists project_id uuid references projects(id) on delete set null;

create index proposals_project_id_idx    on proposals(project_id);
create index invoices_project_id_idx     on invoices(project_id);
create index scope_results_project_id_idx on scope_results(project_id);

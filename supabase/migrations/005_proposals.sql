create table proposals (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  client_id       uuid references clients(id) on delete set null,
  project_id      uuid references projects(id) on delete set null,
  title           text,
  brief_input     text not null,
  content         text not null,
  status          text default 'draft'
    check (status in ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  prompt_version  text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table proposals enable row level security;

create policy "Users can only access own proposals"
  on proposals for all
  using (auth.uid() = user_id);

create index idx_proposals_client_id on proposals(client_id);
create index idx_proposals_user_id on proposals(user_id);

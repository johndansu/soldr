create table if not exists proposal_templates (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  content    text not null,
  created_at timestamptz not null default now()
);
alter table proposal_templates enable row level security;
create policy "proposal_templates_owner" on proposal_templates
  for all using (auth.uid() = user_id);

create table if not exists contract_templates (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  content    text not null,
  created_at timestamptz not null default now()
);
alter table contract_templates enable row level security;
create policy "contract_templates_owner" on contract_templates
  for all using (auth.uid() = user_id);

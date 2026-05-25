create table if not exists contracts (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  client_id    uuid references clients(id) on delete set null,
  proposal_id  uuid references proposals(id) on delete set null,
  title        text,
  content      text not null,
  status       text not null default 'draft' check (status in ('draft','sent','signed')),
  public_token uuid unique default uuid_generate_v4(),
  signed_at    timestamptz,
  created_at   timestamptz not null default now()
);

alter table contracts enable row level security;

create policy "contracts_owner" on contracts
  for all using (auth.uid() = user_id);

create policy "contracts_public_read" on contracts
  for select using (public_token is not null);

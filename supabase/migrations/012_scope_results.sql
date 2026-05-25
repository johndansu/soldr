create table scope_results (
  id                 uuid primary key default uuid_generate_v4(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  agreed_scope       text not null,
  client_message     text not null,
  verdict            text not null check (verdict in ('in_scope', 'out_of_scope', 'needs_clarification')),
  explanation        text not null,
  suggested_response text not null,
  created_at         timestamptz default now()
);

alter table scope_results enable row level security;

create policy "Users can only access own scope results"
  on scope_results for all
  using (auth.uid() = user_id);

create index idx_scope_results_user_id on scope_results(user_id);

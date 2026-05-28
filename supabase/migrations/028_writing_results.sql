create table if not exists writing_results (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  tool       text not null,
  title      text not null,
  output     text not null,
  created_at timestamptz not null default now()
);

alter table writing_results enable row level security;

create policy "writing_results_owner" on writing_results
  for all using (auth.uid() = user_id);

create index idx_writing_results_user_id on writing_results(user_id);

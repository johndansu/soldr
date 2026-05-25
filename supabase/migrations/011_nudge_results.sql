create table nudge_results (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  context    text not null,
  emails     jsonb not null,
  created_at timestamptz default now()
);

alter table nudge_results enable row level security;

create policy "Users can only access own nudge results"
  on nudge_results for all
  using (auth.uid() = user_id);

create index idx_nudge_results_user_id on nudge_results(user_id);

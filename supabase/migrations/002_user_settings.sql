create table user_settings (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  encrypted_api_key   text,
  api_key_set         boolean default false,
  subscription_status text default 'free'
    check (subscription_status in ('free', 'pro', 'cancelled')),
  subscription_id     text,
  tone_preference     text default 'professional'
    check (tone_preference in ('professional', 'friendly', 'direct')),
  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),
  unique (user_id)
);

alter table user_settings enable row level security;

create policy "Users can only access own settings"
  on user_settings for all
  using (auth.uid() = user_id);

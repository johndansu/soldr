create table if not exists time_entries (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  client_id   uuid references clients(id) on delete set null,
  date        date not null default current_date,
  hours       numeric(5,2) not null check (hours > 0),
  description text,
  rate        numeric(10,2) not null default 0,
  currency    text not null default 'NGN',
  invoiced    boolean not null default false,
  invoice_id  uuid references invoices(id) on delete set null,
  created_at  timestamptz not null default now()
);

alter table time_entries enable row level security;

create policy "time_entries_owner" on time_entries
  for all using (auth.uid() = user_id);

create index idx_time_entries_user_id  on time_entries(user_id);
create index idx_time_entries_client_id on time_entries(client_id);

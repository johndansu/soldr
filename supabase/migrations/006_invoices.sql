create table invoices (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  client_id       uuid not null references clients(id) on delete cascade,
  project_id      uuid references projects(id) on delete set null,
  amount          numeric(12,2) not null,
  currency        text default 'NGN',
  due_date        date not null,
  paid_date       date,
  status          text default 'unpaid'
    check (status in ('unpaid', 'paid', 'overdue', 'cancelled')),
  description     text,
  nudge_count     int default 0,
  last_nudge_at   timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table invoices enable row level security;

create policy "Users can only access own invoices"
  on invoices for all
  using (auth.uid() = user_id);

create index idx_invoices_client_id on invoices(client_id);
create index idx_invoices_status on invoices(status);
create index idx_invoices_due_date on invoices(due_date);

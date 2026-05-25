-- Link nudge results to a client
alter table nudge_results
  add column if not exists client_id uuid references clients(id) on delete set null;

create index if not exists idx_nudge_results_client_id on nudge_results(client_id);

-- Invoice payments (partial / instalment tracking)
create table invoice_payments (
  id          uuid primary key default uuid_generate_v4(),
  invoice_id  uuid not null references invoices(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  amount      numeric(12,2) not null,
  paid_date   date not null default current_date,
  notes       text,
  created_at  timestamptz default now()
);

alter table invoice_payments enable row level security;

create policy "Users can only access own invoice payments"
  on invoice_payments for all
  using (auth.uid() = user_id);

create index idx_invoice_payments_invoice_id on invoice_payments(invoice_id);
create index idx_invoice_payments_user_id   on invoice_payments(user_id);

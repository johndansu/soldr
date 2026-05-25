create table invoice_templates (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  client_id        uuid not null references clients(id) on delete cascade,
  name             text not null,
  frequency        text not null check (frequency in ('weekly', 'monthly', 'quarterly')),
  next_run_date    date not null,
  due_days_after   int  not null default 7,
  line_items       jsonb default '[]'::jsonb,
  tax_rate         numeric(5,2)  default 0,
  discount         numeric(10,2) default 0,
  discount_type    text default 'percentage' check (discount_type in ('percentage', 'fixed')),
  currency         text default 'NGN',
  notes            text,
  active           boolean default true,
  created_at       timestamptz default now()
);

alter table invoice_templates enable row level security;

create policy "Users can only access own invoice templates"
  on invoice_templates for all
  using (auth.uid() = user_id);

create index idx_invoice_templates_user_id  on invoice_templates(user_id);
create index idx_invoice_templates_next_run on invoice_templates(next_run_date) where active = true;

-- Track which invoices were auto-generated from a template
alter table invoices
  add column if not exists template_id uuid references invoice_templates(id) on delete set null;

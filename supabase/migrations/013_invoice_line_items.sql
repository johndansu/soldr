alter table invoices
  add column if not exists invoice_number  text,
  add column if not exists line_items      jsonb    default '[]'::jsonb,
  add column if not exists tax_rate        numeric(5,2) default 0,
  add column if not exists discount        numeric(10,2) default 0,
  add column if not exists discount_type   text default 'percentage'
    check (discount_type in ('percentage', 'fixed')),
  add column if not exists notes           text,
  add column if not exists public_token    uuid;

create unique index if not exists idx_invoices_public_token
  on invoices(public_token) where public_token is not null;

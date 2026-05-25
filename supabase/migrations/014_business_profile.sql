alter table user_settings
  add column if not exists business_name      text,
  add column if not exists business_email     text,
  add column if not exists business_address   text,
  add column if not exists business_phone     text,
  add column if not exists bank_details       text,
  add column if not exists default_tax_rate   numeric(5,2) default 0,
  add column if not exists default_currency   text default 'NGN',
  add column if not exists invoice_sequence   integer default 0;

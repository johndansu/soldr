alter table user_settings
  add column if not exists logo_url         text,
  add column if not exists email_signature  text,
  add column if not exists tax_aside_pct    numeric(5,2) default 0;

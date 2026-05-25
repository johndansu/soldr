alter table user_settings
  add column if not exists invoice_prefix text default 'INV';

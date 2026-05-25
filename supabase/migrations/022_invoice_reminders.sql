alter table invoices
  add column if not exists reminders_sent  integer     default 0,
  add column if not exists last_reminder_at timestamptz;

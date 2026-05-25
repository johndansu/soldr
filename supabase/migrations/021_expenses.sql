create table expenses (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  amount      numeric(12,2) not null,
  currency    text not null default 'NGN',
  category    text not null default 'other'
    check (category in ('software','hardware','marketing','travel','office','meals','professional_services','taxes','other')),
  description text,
  date        date not null default current_date,
  created_at  timestamptz default now()
);

alter table expenses enable row level security;

create policy "Users can only access own expenses"
  on expenses for all
  using (auth.uid() = user_id);

create index idx_expenses_user_id on expenses(user_id);
create index idx_expenses_date    on expenses(date);

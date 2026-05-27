alter table clients
  add column if not exists portal_token uuid default uuid_generate_v4() unique;

update clients set portal_token = uuid_generate_v4() where portal_token is null;

alter table clients alter column portal_token set not null;

-- Allow public read via portal_token (portal page is unauthenticated)
create policy "clients_public_portal_read" on clients
  for select using (portal_token is not null);

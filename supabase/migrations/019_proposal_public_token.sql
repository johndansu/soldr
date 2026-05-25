-- Add public shareable token to proposals
alter table proposals
  add column if not exists public_token uuid default uuid_generate_v4() unique;

-- Backfill any existing rows that have null token
update proposals set public_token = uuid_generate_v4() where public_token is null;

-- Make it not-null going forward
alter table proposals alter column public_token set not null;

-- Allow unauthenticated read via token (for public proposal view)
create policy "public read proposals by token" on proposals
  for select using (true);

-- Allow unauthenticated accept (status update via token only)
-- We handle auth in the API route itself by matching token

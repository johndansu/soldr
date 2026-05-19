create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_clients_updated_at
  before update on clients
  for each row execute function update_updated_at();

create trigger trg_projects_updated_at
  before update on projects
  for each row execute function update_updated_at();

create trigger trg_proposals_updated_at
  before update on proposals
  for each row execute function update_updated_at();

create trigger trg_invoices_updated_at
  before update on invoices
  for each row execute function update_updated_at();

create trigger trg_user_settings_updated_at
  before update on user_settings
  for each row execute function update_updated_at();

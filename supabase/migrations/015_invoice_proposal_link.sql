alter table invoices
  add column if not exists proposal_id uuid references proposals(id) on delete set null;

create index if not exists idx_invoices_proposal_id on invoices(proposal_id);

# Database Schema
## Soldr — AI-Powered Freelance Operating System

**Database:** PostgreSQL (Supabase)  
**Extensions required:** `pgvector`, `uuid-ossp`

---

## Enable Extensions

```sql
create extension if not exists "uuid-ossp";
create extension if not exists vector;
```

---

## Tables

### users
Managed by Supabase Auth. Extended via `user_settings`.

```sql
-- Supabase Auth creates auth.users automatically.
-- We reference it via foreign keys.
```

---

### user_settings

Stores per-user configuration including the encrypted BYOK API key.

```sql
create table user_settings (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  encrypted_api_key   text,                        -- AES-256-GCM encrypted Anthropic key
  api_key_set         boolean default false,        -- quick check without decrypting
  subscription_status text default 'free'           -- 'free' | 'pro' | 'cancelled'
    check (subscription_status in ('free', 'pro', 'cancelled')),
  subscription_id     text,                         -- Paystack subscription code
  tone_preference     text default 'professional'  -- default nudge email tone
    check (tone_preference in ('professional', 'friendly', 'direct')),
  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),
  unique (user_id)
);

alter table user_settings enable row level security;

create policy "Users can only access own settings"
  on user_settings for all
  using (auth.uid() = user_id);
```

---

### clients

```sql
create table clients (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  email       text,
  company     text,
  timezone    text,
  notes       text,                    -- general free-text notes
  tags        text[],                  -- e.g. ['retainer', 'design', 'recurring']
  status      text default 'active'
    check (status in ('active', 'inactive', 'archived')),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table clients enable row level security;

create policy "Users can only access own clients"
  on clients for all
  using (auth.uid() = user_id);

create index idx_clients_user_id on clients(user_id);
```

---

### projects

```sql
create table projects (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  client_id       uuid not null references clients(id) on delete cascade,
  name            text not null,
  description     text,
  status          text default 'active'
    check (status in ('active', 'completed', 'on_hold', 'cancelled')),
  budget          numeric(12,2),
  currency        text default 'NGN',
  start_date      date,
  end_date        date,
  original_scope  text,               -- stored at project start for scope creep detection
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table projects enable row level security;

create policy "Users can only access own projects"
  on projects for all
  using (auth.uid() = user_id);

create index idx_projects_client_id on projects(client_id);
create index idx_projects_user_id on projects(user_id);
```

---

### proposals

```sql
create table proposals (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  client_id       uuid references clients(id) on delete set null,
  project_id      uuid references projects(id) on delete set null,
  title           text,
  brief_input     text not null,       -- the raw brief pasted by the user
  content         text not null,       -- the AI-generated proposal markdown
  status          text default 'draft'
    check (status in ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  prompt_version  text,                -- which prompt version generated this
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table proposals enable row level security;

create policy "Users can only access own proposals"
  on proposals for all
  using (auth.uid() = user_id);

create index idx_proposals_client_id on proposals(client_id);
create index idx_proposals_user_id on proposals(user_id);
```

---

### invoices

```sql
create table invoices (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  client_id       uuid not null references clients(id) on delete cascade,
  project_id      uuid references projects(id) on delete set null,
  amount          numeric(12,2) not null,
  currency        text default 'NGN',
  due_date        date not null,
  paid_date       date,
  status          text default 'unpaid'
    check (status in ('unpaid', 'paid', 'overdue', 'cancelled')),
  description     text,
  nudge_count     int default 0,       -- how many follow-up emails sent
  last_nudge_at   timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table invoices enable row level security;

create policy "Users can only access own invoices"
  on invoices for all
  using (auth.uid() = user_id);

create index idx_invoices_client_id on invoices(client_id);
create index idx_invoices_status on invoices(status);
create index idx_invoices_due_date on invoices(due_date);
```

---

### client_notes

Notes saved manually or imported — each note is also embedded into the vector store for memory retrieval.

```sql
create table client_notes (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  client_id   uuid not null references clients(id) on delete cascade,
  project_id  uuid references projects(id) on delete set null,
  content     text not null,
  source      text default 'manual'
    check (source in ('manual', 'proposal', 'call_summary', 'email')),
  embedded    boolean default false,    -- whether vector has been created
  created_at  timestamptz default now()
);

alter table client_notes enable row level security;

create policy "Users can only access own notes"
  on client_notes for all
  using (auth.uid() = user_id);

create index idx_client_notes_client_id on client_notes(client_id);
```

---

### embeddings

Vector store for client memory RAG. Each row is the embedding of one `client_note`.

```sql
create table embeddings (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  client_id   uuid not null references clients(id) on delete cascade,
  note_id     uuid not null references client_notes(id) on delete cascade,
  content     text not null,            -- original text (for retrieval context)
  embedding   vector(1536),             -- text-embedding-3-small dimension
  created_at  timestamptz default now()
);

alter table embeddings enable row level security;

create policy "Users can only access own embeddings"
  on embeddings for all
  using (auth.uid() = user_id);

-- IVFFlat index for fast similarity search
create index idx_embeddings_vector
  on embeddings
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index idx_embeddings_client_id on embeddings(client_id);
```

---

## Helper Function: Similarity Search

```sql
create or replace function match_client_notes(
  query_embedding  vector(1536),
  match_client_id  uuid,
  match_user_id    uuid,
  match_count      int default 5
)
returns table (
  id        uuid,
  content   text,
  similarity float
)
language sql stable
as $$
  select
    e.id,
    e.content,
    1 - (e.embedding <=> query_embedding) as similarity
  from embeddings e
  where e.client_id = match_client_id
    and e.user_id = match_user_id
  order by e.embedding <=> query_embedding
  limit match_count;
$$;
```

---

## Triggers: Auto-update `updated_at`

```sql
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
```

---

## Entity Relationships

```
auth.users
    │
    ├── user_settings (1:1)
    ├── clients (1:many)
    │       ├── projects (1:many)
    │       │       └── proposals (1:many)
    │       ├── invoices (1:many)
    │       └── client_notes (1:many)
    │                   └── embeddings (1:1)
    └── proposals (also directly linked to user)
```

---

## Indexes Summary

| Table | Index | Purpose |
|---|---|---|
| clients | user_id | Filter all clients by user |
| projects | client_id, user_id | Filter projects by client or user |
| proposals | client_id, user_id | Filter proposals |
| invoices | client_id, status, due_date | Dashboard queries, overdue detection |
| client_notes | client_id | Notes per client |
| embeddings | vector (IVFFlat), client_id | Fast similarity search scoped to client |

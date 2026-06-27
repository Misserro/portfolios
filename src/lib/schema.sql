-- Products table
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  tagline text not null default '',
  status text not null default 'draft' check (status in ('draft', 'preview', 'published')),
  "order" integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Segments table
create table if not exists segments (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  type text not null check (type in ('hero', 'preview', 'features', 'how_it_works', 'stats', 'testimonials', 'cta')),
  content jsonb not null default '{}',
  visible boolean not null default true,
  "order" integer not null default 0,
  updated_at timestamptz not null default now()
);

-- AI sessions table
create table if not exists ai_sessions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  messages jsonb not null default '[]',
  status text not null default 'clarifying' check (status in ('clarifying', 'form_review', 'draft', 'approved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists products_status_order on products(status, "order");
create index if not exists segments_product_id on segments(product_id);
create index if not exists ai_sessions_product_id on ai_sessions(product_id);

-- Updated_at trigger
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger products_updated_at before update on products
  for each row execute function set_updated_at();

create trigger segments_updated_at before update on segments
  for each row execute function set_updated_at();

create trigger ai_sessions_updated_at before update on ai_sessions
  for each row execute function set_updated_at();

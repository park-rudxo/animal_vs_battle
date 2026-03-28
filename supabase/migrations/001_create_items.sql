-- recall-ai: items table
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  url text not null,
  title text,
  summary text,
  category text check (category in ('tech', 'news', 'shopping', 'event', 'other')),
  detected_date date,
  status text not null default 'pending' check (status in ('pending', 'processed', 'error')),
  saved_at timestamptz not null default now(),
  opened_at timestamptz,
  reminded_date_at timestamptz,
  reminded_nudge_at timestamptz,

  -- dedup: same user + same url = one item
  unique (user_id, url)
);

-- RLS (Row Level Security)
alter table public.items enable row level security;

create policy "Users can view own items"
  on public.items for select
  using (auth.uid() = user_id);

create policy "Users can insert own items"
  on public.items for insert
  with check (auth.uid() = user_id);

create policy "Users can update own items"
  on public.items for update
  using (auth.uid() = user_id);

create policy "Users can delete own items"
  on public.items for delete
  using (auth.uid() = user_id);

-- Service role can update any item (for /api/process worker)
create policy "Service role full access"
  on public.items for all
  using (auth.role() = 'service_role');

-- indexes
create index idx_items_user_id on public.items(user_id);
create index idx_items_status on public.items(status);
create index idx_items_remind on public.items(detected_date) where reminded_date_at is null;
create index idx_items_nudge on public.items(saved_at) where opened_at is null and reminded_nudge_at is null;

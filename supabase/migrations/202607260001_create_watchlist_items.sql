create table if not exists public.watchlist_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null check (char_length(symbol) between 1 and 20),
  created_at timestamptz not null default now(),
  primary key (user_id, symbol)
);

alter table public.watchlist_items enable row level security;

create policy "Users can read their own watchlist"
on public.watchlist_items
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can add to their own watchlist"
on public.watchlist_items
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can remove from their own watchlist"
on public.watchlist_items
for delete
to authenticated
using ((select auth.uid()) = user_id);

create index if not exists watchlist_items_user_created_idx
on public.watchlist_items (user_id, created_at);

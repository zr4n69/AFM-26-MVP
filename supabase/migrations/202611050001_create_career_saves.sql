create table if not exists public.career_saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slot_index smallint not null check (slot_index between 0 and 4),
  snapshot jsonb not null,
  saved_at timestamptz not null,
  updated_at timestamptz not null default now(),
  unique (user_id, slot_index)
);

create index if not exists career_saves_user_id_idx
  on public.career_saves using btree (user_id);

alter table public.career_saves enable row level security;

revoke all on table public.career_saves from anon, authenticated;
grant select, insert, update, delete on table public.career_saves to authenticated;

create policy "Users read their own career saves"
  on public.career_saves for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users create their own career saves"
  on public.career_saves for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users update their own career saves"
  on public.career_saves for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users delete their own career saves"
  on public.career_saves for delete
  to authenticated
  using ((select auth.uid()) = user_id);

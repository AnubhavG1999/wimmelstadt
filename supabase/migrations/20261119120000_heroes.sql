-- Heroes: the models made from the collector's diecasts, and who may see them.
--
-- The collection sits behind a PIN. The PIN is the password of one shared
-- account, the viewer: whoever knows it signs in as that account, and can see
-- the heroes and nothing else. Nothing can be changed with the PIN. Heroes are
-- added from the collector's desk, with the project's secret key.
--
-- Anyone at all can make an account on a Supabase project unless sign-ups are
-- turned off, so having an account is not enough to see anything here: an
-- account has to be listed in `viewers` as well.

-- Who may see the collection. The viewer account is listed here once it exists.
create table public.viewers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  added_at timestamptz not null default now()
);
alter table public.viewers enable row level security;
-- No policy: nobody reads or writes this table through the API.

-- Whether whoever is asking may see the collection.
create function public.may_view() returns boolean
  language sql stable security definer set search_path = ''
  as $$ select exists (select 1 from public.viewers where user_id = (select auth.uid())) $$;
revoke all on function public.may_view() from public, anon;
grant execute on function public.may_view() to authenticated;

create table public.heroes (
  id uuid primary key default gen_random_uuid(),
  -- Whose diecast it is. There is one collector today, and every record says so anyway.
  owner uuid references auth.users (id) on delete set null,
  -- The name of its capture, which is also the name of its party trick in the app.
  capture text not null unique,
  name text not null,
  -- The toy's length in centimetres, which is its length in the city.
  length numeric not null check (length > 0),
  -- Quarter turns that bring the model's nose to the front.
  turn integer not null default 0,
  triangles integer not null default 0,
  -- Where its model is, in the bucket `heroes`.
  model_path text not null,
  -- Taken out of the city for a while, and able to come back.
  rested boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.heroes enable row level security;
create policy "Viewers can see the heroes" on public.heroes
  for select to authenticated using ((select public.may_view()));

-- The models themselves, in a bucket that is not public.
insert into storage.buckets (id, name, public) values ('heroes', 'heroes', false);
create policy "Viewers can fetch the models of the heroes" on storage.objects
  for select to authenticated using (bucket_id = 'heroes' and (select public.may_view()));

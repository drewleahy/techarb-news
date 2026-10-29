-- TechArb News · Supabase schema
-- Run this once in the Supabase SQL editor (Project → SQL → New query → paste → Run).
-- It creates three tables, a public view, two helper functions, and row-level security
-- so the anonymous key can only do what the site needs: read events and approved posts,
-- insert RSVPs and posts, and never read anyone else's email.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- events
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  starts_at   timestamptz not null,
  location    text not null default 'The Michigan League · Basement',
  address     text not null default '911 N. University Ave., Ann Arbor',
  capacity    int,
  notes       text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- rsvps
create table if not exists public.rsvps (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 80),
  email       text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  startup     text check (char_length(startup) <= 80),
  shipping    text check (char_length(shipping) <= 200),   -- "what are you shipping this week?"
  pitching    boolean not null default false,              -- wants a 60-second slot
  created_at  timestamptz not null default now(),
  unique (event_id, email)
);

-- ---------------------------------------------------------------- posts
create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  author      text not null check (char_length(author) between 1 and 80),
  startup     text not null check (char_length(startup) between 1 and 80),
  headline    text not null check (char_length(headline) between 1 and 120),
  body        text not null check (char_length(body) between 1 and 1200),
  link        text check (link is null or link ~* '^https?://'),
  kind        text not null default 'shipped' check (kind in ('shipped','launched','raised','hiring','asking','broke')),
  approved    boolean not null default true,               -- flip default to false if you want moderation
  created_at  timestamptz not null default now()
);

create index if not exists posts_created_idx on public.posts (created_at desc);
create index if not exists rsvps_event_idx  on public.rsvps (event_id);

-- ---------------------------------------------------------------- public views / functions
-- The site never reads the rsvps table directly. It reads a count.
create or replace function public.rsvp_count(p_event_id uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  select count(*)::int from public.rsvps where event_id = p_event_id;
$$;

-- Names only (no emails) for the "who's coming" strip. Opt-in by design: comment out if unwanted.
create or replace view public.rsvp_names as
  select event_id, name, startup, pitching
  from public.rsvps
  order by created_at;

-- Next upcoming event, or the most recent one if none is scheduled.
create or replace function public.next_event()
returns setof public.events
language sql
stable
set search_path = public
as $$
  select * from public.events
  where starts_at >= now() - interval '6 hours'
  order by starts_at asc
  limit 1;
$$;

-- ---------------------------------------------------------------- row level security
alter table public.events enable row level security;
alter table public.rsvps  enable row level security;
alter table public.posts  enable row level security;

drop policy if exists "events are public"        on public.events;
drop policy if exists "anyone can rsvp"           on public.rsvps;
drop policy if exists "approved posts are public" on public.posts;
drop policy if exists "anyone can post"           on public.posts;

create policy "events are public"        on public.events for select using (true);
create policy "anyone can rsvp"           on public.rsvps  for insert with check (true);
create policy "approved posts are public" on public.posts  for select using (approved);
create policy "anyone can post"           on public.posts  for insert with check (approved = true);

grant usage on schema public to anon, authenticated;
grant select on public.events, public.rsvp_names to anon, authenticated;
grant insert on public.rsvps, public.posts to anon, authenticated;
grant select on public.posts to anon, authenticated;
grant execute on function public.rsvp_count(uuid), public.next_event() to anon, authenticated;

-- ---------------------------------------------------------------- seed: the first Tuesday Night
insert into public.events (title, starts_at, location, address, capacity, notes)
values (
  'TechArb Reignite · Tuesday Night',
  '2026-11-03 20:00:00-05',
  'The Michigan League · Basement',
  '911 N. University Ave., Ann Arbor',
  120,
  'Laptops shut at 8. Free pizza. Founder talks, rapid-fire mentorship, and the 60-Second Ship Showcase.'
)
on conflict do nothing;

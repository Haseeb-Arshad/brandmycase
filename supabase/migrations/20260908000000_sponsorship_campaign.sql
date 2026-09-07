-- Brand the Case — sponsorship campaign.
--
-- Turns the inquiry table into the full life of a sponsorship: a company sends
-- an inquiry, the owner talks to them, invoices them, and only then marks the
-- row CONFIRMED. The public site reads CONFIRMED rows and nothing else, so
-- every number on the homepage traces back to money that was actually agreed.
--
--   INTERESTED -> CONTACTED -> INVOICED -> CONFIRMED
--                                       -> DECLINED / CANCELLED
--
-- The table still holds other companies' contact details, so it stays
-- server-only: RLS on with no permissive policy, no grants to anon or
-- authenticated, service_role only. The public read path in
-- `src/lib/funding.ts` selects display columns exclusively — contact_email,
-- message and social_url never leave the database on a page render.
--
-- Written to be safe on a database that has already had the previous
-- migration applied AND on one that has not: every step is idempotent.

-- --------------------------------------------------------------------------
-- The table, for a project where the earlier migration was never applied.
-- --------------------------------------------------------------------------

create table if not exists public.sponsorship_requests (
  id uuid primary key default gen_random_uuid(),
  placement_id text,
  company text not null check (length(btrim(company)) between 2 and 120),
  contact_name text check (contact_name is null or length(contact_name) <= 120),
  contact_email text not null check (
    length(contact_email) <= 200 and position('@' in contact_email) > 1
  ),
  website_url text check (website_url is null or length(website_url) <= 200),
  message text check (message is null or length(message) <= 2000),
  status text not null default 'INTERESTED',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- --------------------------------------------------------------------------
-- Sponsorship columns.
-- --------------------------------------------------------------------------

alter table public.sponsorship_requests
  add column if not exists tier text,
  add column if not exists company_url text,
  add column if not exists social_url text,
  add column if not exists amount_usd integer,
  add column if not exists display_name text,
  add column if not exists display_logo_url text,
  add column if not exists display_permission boolean not null default false,
  add column if not exists confirmed_at timestamptz;

comment on column public.sponsorship_requests.tier is
  'ANCHOR | PARTNER | SUPPORTER. The package the company asked for.';
comment on column public.sponsorship_requests.amount_usd is
  'Whole US dollars actually agreed. Set by the owner when an invoice is paid, never by the form. Only counted while status = CONFIRMED.';
comment on column public.sponsorship_requests.display_permission is
  'False until the sponsor has agreed to be named publicly. Nothing about a sponsor is rendered without it.';

-- A tier can be sponsored without picking a panel, so placement_id is optional.
alter table public.sponsorship_requests alter column placement_id drop not null;

-- Budget bands belonged to the earlier inquiry form. The column is left in
-- place so existing rows keep their answers; nothing writes it any more.

-- --------------------------------------------------------------------------
-- Status: migrate the old vocabulary, then constrain the new one.
-- --------------------------------------------------------------------------

update public.sponsorship_requests set status = 'INTERESTED' where status = 'NEW';
update public.sponsorship_requests set status = 'CONTACTED'  where status = 'QUALIFIED';
update public.sponsorship_requests set status = 'CONFIRMED'  where status = 'AGREED';

alter table public.sponsorship_requests
  drop constraint if exists sponsorship_requests_status_check;

alter table public.sponsorship_requests
  add constraint sponsorship_requests_status_check check (
    status in ('INTERESTED', 'CONTACTED', 'INVOICED', 'CONFIRMED', 'DECLINED', 'CANCELLED')
  );

alter table public.sponsorship_requests alter column status set default 'INTERESTED';

alter table public.sponsorship_requests
  drop constraint if exists sponsorship_requests_tier_check;

alter table public.sponsorship_requests
  add constraint sponsorship_requests_tier_check check (
    tier is null or tier in ('ANCHOR', 'PARTNER', 'SUPPORTER')
  );

alter table public.sponsorship_requests
  drop constraint if exists sponsorship_requests_amount_check;

alter table public.sponsorship_requests
  add constraint sponsorship_requests_amount_check check (
    amount_usd is null or (amount_usd > 0 and amount_usd <= 1000000)
  );

alter table public.sponsorship_requests
  drop constraint if exists sponsorship_requests_url_length_check;

alter table public.sponsorship_requests
  add constraint sponsorship_requests_url_length_check check (
    (company_url is null or length(company_url) <= 200)
    and (social_url is null or length(social_url) <= 200)
    and (display_logo_url is null or length(display_logo_url) <= 500)
    and (display_name is null or length(display_name) <= 120)
  );

-- A confirmed sponsorship is a claim on the homepage's funding bar, so the
-- database refuses to hold one that could not be rendered honestly: it must
-- name its tier and the amount that was actually agreed.
alter table public.sponsorship_requests
  drop constraint if exists sponsorship_requests_confirmed_complete_check;

alter table public.sponsorship_requests
  add constraint sponsorship_requests_confirmed_complete_check check (
    status <> 'CONFIRMED'
    or (tier is not null and amount_usd is not null and amount_usd > 0)
  );

-- --------------------------------------------------------------------------
-- One panel, one sponsor.
--
-- The application checks availability before accepting an inquiry, but an
-- inquiry is not a claim and the owner confirms rows by hand. This index is
-- what actually makes double-selling a panel impossible: a second CONFIRMED
-- row on the same placement is rejected by the database.
-- --------------------------------------------------------------------------

create unique index if not exists sponsorship_requests_confirmed_placement_key
  on public.sponsorship_requests (placement_id)
  where status = 'CONFIRMED' and placement_id is not null;

create index if not exists sponsorship_requests_status_created_at_idx
  on public.sponsorship_requests (status, created_at desc);

create index if not exists sponsorship_requests_placement_id_idx
  on public.sponsorship_requests (placement_id, created_at desc);

create index if not exists sponsorship_requests_contact_email_created_at_idx
  on public.sponsorship_requests (contact_email, created_at desc);

-- --------------------------------------------------------------------------
-- updated_at, and the access rules restated so a fresh project is correct
-- whether or not the earlier migrations ran.
-- --------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

drop trigger if exists sponsorship_requests_set_updated_at on public.sponsorship_requests;
create trigger sponsorship_requests_set_updated_at
before update on public.sponsorship_requests
for each row execute function public.set_updated_at();

-- Stamp confirmed_at the moment a row becomes CONFIRMED, so the sponsor list
-- can be ordered by when support actually arrived rather than when the
-- inquiry did.
create or replace function public.stamp_sponsorship_confirmed_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'CONFIRMED' and new.confirmed_at is null then
    new.confirmed_at = timezone('utc', now());
  end if;
  if new.status <> 'CONFIRMED' then
    new.confirmed_at = null;
  end if;
  return new;
end;
$$;

revoke all on function public.stamp_sponsorship_confirmed_at() from public, anon, authenticated;

drop trigger if exists sponsorship_requests_stamp_confirmed_at on public.sponsorship_requests;
create trigger sponsorship_requests_stamp_confirmed_at
before insert or update on public.sponsorship_requests
for each row execute function public.stamp_sponsorship_confirmed_at();

-- No policies, on purpose. With RLS enabled and no policy, every non-service
-- role reads zero rows even if a grant were added by mistake.
alter table public.sponsorship_requests enable row level security;

revoke all on table public.sponsorship_requests from public, anon, authenticated;
grant all on table public.sponsorship_requests to service_role;

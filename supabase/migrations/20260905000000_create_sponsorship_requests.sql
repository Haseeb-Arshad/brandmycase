-- CODEC ONE — Founding Edition sponsorship inquiries.
--
-- These rows are placement requests, not orders. Nothing here is a purchase,
-- a reservation or a payment: the Founding Edition takes no money on the
-- website, and placement availability is maintained in application
-- configuration, never derived from this table.
--
-- The table holds other companies' contact details and budget signals, so it
-- is server-only by construction: RLS is enabled with no permissive policy,
-- and anon/authenticated hold no grants. Only the service role — used by the
-- Next.js server through SUPABASE_SECRET_KEY — can read or write it.

create table if not exists public.sponsorship_requests (
  id uuid primary key default gen_random_uuid(),
  placement_id text not null,
  company text not null check (length(btrim(company)) between 2 and 120),
  contact_name text check (contact_name is null or length(contact_name) <= 120),
  contact_email text not null check (
    length(contact_email) <= 200 and position('@' in contact_email) > 1
  ),
  website_url text check (website_url is null or length(website_url) <= 200),
  budget_range text check (
    budget_range is null or budget_range in (
      'UNDECIDED', 'UNDER_1K', '1K_2_5K', '2_5K_5K', '5K_10K', 'OVER_10K'
    )
  ),
  message text check (message is null or length(message) <= 2000),
  status text not null default 'NEW' check (
    status in ('NEW', 'CONTACTED', 'QUALIFIED', 'DECLINED', 'AGREED')
  ),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- The operator's working views: what is new, what came in for which placement,
-- and the per-email window the server checks before accepting a new request.
create index if not exists sponsorship_requests_status_created_at_idx
  on public.sponsorship_requests (status, created_at desc);

create index if not exists sponsorship_requests_placement_id_idx
  on public.sponsorship_requests (placement_id, created_at desc);

create index if not exists sponsorship_requests_contact_email_created_at_idx
  on public.sponsorship_requests (contact_email, created_at desc);

-- set_updated_at() is created by 20260831000000_create_bids.sql. Recreate it
-- here idempotently so this migration can be applied to a fresh project that
-- has had the dormant auction schema skipped.
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

-- No policies are created on purpose. With RLS enabled and no policy, every
-- non-service role sees zero rows even if a grant were added by mistake.
alter table public.sponsorship_requests enable row level security;

revoke all on table public.sponsorship_requests from public, anon, authenticated;
grant all on table public.sponsorship_requests to service_role;

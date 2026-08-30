create table if not exists public.bids (
  id text primary key,
  placement_id text not null,
  company text not null,
  contact_email text not null,
  website_url text,
  message text,
  amount_usd integer not null check (amount_usd > 0),
  deposit_usd integer not null check (deposit_usd >= 0),
  status text not null default 'PENDING' check (
    status in ('PENDING', 'DEPOSIT_PAID', 'OUTBID', 'WON', 'REFUNDED', 'REJECTED')
  ),
  payment_provider text not null default 'mock',
  payment_ref text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists bids_placement_id_idx
  on public.bids (placement_id);

create index if not exists bids_placement_id_amount_usd_idx
  on public.bids (placement_id, amount_usd);

create index if not exists bids_status_idx
  on public.bids (status);

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

drop trigger if exists bids_set_updated_at on public.bids;
create trigger bids_set_updated_at
before update on public.bids
for each row execute function public.set_updated_at();

revoke all on function public.set_updated_at() from public, anon, authenticated;

alter table public.bids enable row level security;

create or replace function public.settle_bid(p_bid_id text, p_payment_ref text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  pending_bid public.bids%rowtype;
begin
  select * into pending_bid
  from public.bids
  where id = p_bid_id
  for update;

  if not found or pending_bid.status <> 'PENDING' then
    return;
  end if;

  update public.bids
  set status = 'OUTBID'
  where placement_id = pending_bid.placement_id
    and status in ('DEPOSIT_PAID', 'WON')
    and amount_usd <= pending_bid.amount_usd
    and id <> pending_bid.id;

  update public.bids
  set status = 'DEPOSIT_PAID', payment_ref = p_payment_ref
  where id = pending_bid.id;
end;
$$;

revoke all on function public.settle_bid(text, text) from public, anon, authenticated;
grant execute on function public.settle_bid(text, text) to service_role;

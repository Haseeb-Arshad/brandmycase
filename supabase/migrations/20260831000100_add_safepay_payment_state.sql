-- Safepay payment metadata and durable webhook/refund state.

alter table public.bids
  add column if not exists payment_currency text not null default 'USD',
  add column if not exists payment_amount_minor integer,
  add column if not exists payment_captured_at timestamptz,
  add column if not exists refund_status text not null default 'NOT_REQUESTED',
  add column if not exists refund_ref text,
  add column if not exists refund_amount_minor integer not null default 0,
  add column if not exists refund_requested_at timestamptz,
  add column if not exists refunded_at timestamptz,
  add column if not exists refund_error text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'bids_payment_amount_minor_check'
  ) then
    alter table public.bids
      add constraint bids_payment_amount_minor_check
      check (payment_amount_minor is null or payment_amount_minor > 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'bids_refund_status_check'
  ) then
    alter table public.bids
      add constraint bids_refund_status_check
      check (refund_status in ('NOT_REQUESTED', 'PENDING', 'PROCESSING', 'PARTIAL', 'SUCCEEDED', 'FAILED'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'bids_refund_amount_minor_check'
  ) then
    alter table public.bids
      add constraint bids_refund_amount_minor_check
      check (refund_amount_minor >= 0);
  end if;
end $$;

create unique index if not exists bids_payment_ref_unique_idx
  on public.bids (payment_ref)
  where payment_ref is not null;

create index if not exists bids_refund_status_idx
  on public.bids (status, refund_status, updated_at);

create table if not exists public.payment_webhook_events (
  provider text not null,
  event_id text not null,
  event_type text not null,
  payload jsonb not null,
  status text not null default 'RECEIVED' check (status in ('RECEIVED', 'PROCESSED', 'FAILED')),
  error_message text,
  received_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz,
  primary key (provider, event_id)
);

create index if not exists payment_webhook_events_status_idx
  on public.payment_webhook_events (provider, status, received_at);

alter table public.payment_webhook_events enable row level security;
revoke all on table public.payment_webhook_events from public, anon, authenticated;
grant all on table public.payment_webhook_events to service_role;

-- The settlement RPC returns the bids it demoted so the server can issue their
-- refunds after the database transaction commits. It remains idempotent.
drop function if exists public.settle_bid(text, text);

create or replace function public.settle_bid(p_bid_id text, p_payment_ref text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  pending_bid public.bids%rowtype;
  outbid_bids jsonb;
begin
  if nullif(trim(p_payment_ref), '') is null then
    raise exception 'A provider payment reference is required.';
  end if;

  select * into pending_bid
  from public.bids
  where id = p_bid_id
  for update;

  if not found or pending_bid.status <> 'PENDING' then
    return '[]'::jsonb;
  end if;

  -- Serialize settlements for one panel so two paid webhooks cannot both
  -- observe the same previous leader.
  perform pg_advisory_xact_lock(hashtext('codec-panel:' || pending_bid.placement_id)::bigint);

  with demoted as (
    update public.bids
    set status = 'OUTBID',
        refund_status = case when payment_ref is null then 'FAILED' else 'PENDING' end,
        refund_error = case when payment_ref is null then 'Missing payment reference.' else null end
    where placement_id = pending_bid.placement_id
      and status in ('DEPOSIT_PAID', 'WON')
      and amount_usd <= pending_bid.amount_usd
      and id <> pending_bid.id
    returning id, payment_ref
  )
  select coalesce(
    jsonb_agg(jsonb_build_object('id', id, 'paymentRef', payment_ref)),
    '[]'::jsonb
  )
  into outbid_bids
  from demoted;

  update public.bids
  set status = 'DEPOSIT_PAID',
      payment_ref = p_payment_ref
  where id = pending_bid.id;

  return outbid_bids;
end;
$$;

revoke all on function public.settle_bid(text, text) from public, anon, authenticated;
grant execute on function public.settle_bid(text, text) to service_role;

-- Brand the Case — let a sponsor offer more than the tier price.
--
-- A company can say "the Supporter placement is $250 but we'll do $500", or
-- cover the whole trip. That figure is an INTENT, stated in a form by someone
-- who has not been invoiced yet and has paid nothing.
--
-- It therefore gets its own column, deliberately separate from amount_usd:
--
--   proposed_amount_usd  what the company said they would like to contribute.
--                        Written by the public form. Counts toward NOTHING.
--
--   amount_usd           what was actually agreed and paid, set by the owner
--                        when an invoice clears. The only figure the funding
--                        bar has ever summed.
--
-- Collapsing these two into one column would let a stranger with a fetch call
-- move the number on the homepage. That is the whole reason for two columns.

alter table public.sponsorship_requests
  add column if not exists proposed_amount_usd integer;

comment on column public.sponsorship_requests.proposed_amount_usd is
  'What the company offered in the inquiry form. A stated intention, not money. Never counted as funding — only amount_usd on a CONFIRMED row is.';

alter table public.sponsorship_requests
  drop constraint if exists sponsorship_requests_proposed_amount_check;

-- Bounded so a typo or a bot cannot store an absurd figure. The lower bound is
-- deliberately loose: the tier minimum is enforced in the application, where
-- the tier prices actually live.
alter table public.sponsorship_requests
  add constraint sponsorship_requests_proposed_amount_check check (
    proposed_amount_usd is null
    or (proposed_amount_usd > 0 and proposed_amount_usd <= 1000000)
  );

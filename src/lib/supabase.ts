import { createAdminClient } from "@supabase/server/core";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The server-only Supabase boundary.
 *
 * `sponsorship_requests` is the campaign's only live table. `bids`,
 * `payment_webhook_events` and `settle_bid` belong to the dormant auction
 * phase; their types are kept so that code compiles, not because anything on
 * the public site reads them.
 *
 * SUPABASE_SECRET_KEY is consumed here and nowhere else, and this module is
 * never imported from a client component.
 */

export type BidRow = Record<string, unknown> & {
  id: string;
  placement_id: string;
  company: string;
  contact_email: string;
  website_url: string | null;
  message: string | null;
  amount_usd: number;
  deposit_usd: number;
  status: string;
  payment_provider: string;
  payment_ref: string | null;
  payment_currency: string;
  payment_amount_minor: number | null;
  payment_captured_at: string | null;
  refund_status: string;
  refund_ref: string | null;
  refund_amount_minor: number;
  refund_requested_at: string | null;
  refunded_at: string | null;
  refund_error: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * A sponsorship, at every stage of its life.
 *
 * One row is created when a company sends an inquiry (status INTERESTED) and
 * is moved forward by hand as the conversation progresses. Only CONFIRMED
 * rows count toward funding or occupy a panel.
 *
 * The `display_*` columns are the publishing switch: nothing about a sponsor
 * is shown on the site unless `display_permission` is true and a display name
 * has been entered deliberately.
 */
export type SponsorshipRequestRow = {
  id: string;
  placement_id: string | null;
  tier: string | null;
  company: string;
  contact_name: string | null;
  contact_email: string;
  website_url: string | null;
  company_url: string | null;
  social_url: string | null;
  budget_range: string | null;
  message: string | null;
  status: string;
  /** What the company offered in the form. Never counted as funding. */
  proposed_amount_usd: number | null;
  /** What was agreed and paid. Set by the owner. The only figure that counts. */
  amount_usd: number | null;
  display_name: string | null;
  display_logo_url: string | null;
  display_permission: boolean;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
};

export type PaymentWebhookEventRow = {
  provider: string;
  event_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  status: string;
  error_message: string | null;
  received_at: string;
  processed_at: string | null;
};

export interface Database {
  public: {
    Tables: {
      sponsorship_requests: {
        Row: SponsorshipRequestRow;
        Insert: {
          id?: string;
          placement_id?: string | null;
          tier?: string | null;
          company: string;
          contact_name?: string | null;
          contact_email: string;
          website_url?: string | null;
          company_url?: string | null;
          social_url?: string | null;
          budget_range?: string | null;
          message?: string | null;
          status?: string;
          proposed_amount_usd?: number | null;
          amount_usd?: number | null;
          display_name?: string | null;
          display_logo_url?: string | null;
          display_permission?: boolean;
          created_at?: string;
          updated_at?: string;
          confirmed_at?: string | null;
        };
        Update: Partial<Omit<SponsorshipRequestRow, "id">>;
        Relationships: [];
      };
      bids: {
        Row: BidRow;
        Insert: Record<string, unknown> & {
          id?: string;
          placement_id: string;
          company: string;
          contact_email: string;
          website_url?: string | null;
          message?: string | null;
          amount_usd: number;
          deposit_usd: number;
          status?: string;
          payment_provider?: string;
          payment_ref?: string | null;
          payment_currency?: string;
          payment_amount_minor?: number | null;
          payment_captured_at?: string | null;
          refund_status?: string;
          refund_ref?: string | null;
          refund_amount_minor?: number;
          refund_requested_at?: string | null;
          refunded_at?: string | null;
          refund_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Record<string, unknown> & Partial<{
          placement_id: string;
          company: string;
          contact_email: string;
          website_url: string | null;
          message: string | null;
          amount_usd: number;
          deposit_usd: number;
          status: string;
          payment_provider: string;
          payment_ref: string | null;
          payment_currency: string;
          payment_amount_minor: number | null;
          payment_captured_at: string | null;
          refund_status: string;
          refund_ref: string | null;
          refund_amount_minor: number;
          refund_requested_at: string | null;
          refunded_at: string | null;
          refund_error: string | null;
          created_at: string;
          updated_at: string;
        }>;
        Relationships: [];
      };
      payment_webhook_events: {
        Row: PaymentWebhookEventRow;
        Insert: {
          provider: string;
          event_id: string;
          event_type: string;
          payload: Record<string, unknown>;
          status?: string;
          error_message?: string | null;
          received_at?: string;
          processed_at?: string | null;
        };
        Update: Partial<{
          provider: string;
          event_id: string;
          event_type: string;
          payload: Record<string, unknown>;
          status: string;
          error_message: string | null;
          received_at: string;
          processed_at: string | null;
        }>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      settle_bid: {
        Args: {
          [key: string]: unknown;
          p_bid_id: string;
          p_payment_ref: string;
        };
        Returns: unknown;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

const globalForSupabase = globalThis as unknown as {
  supabaseAdmin?: SupabaseClient<Database>;
};

/**
 * Is there a database to talk to at all?
 *
 * Called before every read on a page path so the site renders — honestly, as
 * an unfunded campaign with every panel open — on a machine with no
 * credentials. Writes do not use this: the inquiry endpoint must fail loudly
 * rather than accept a company's details and drop them.
 */
export function supabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SECRET_KEY?.trim());
}

/** Lazily create one server-only client per process. */
export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (!globalForSupabase.supabaseAdmin) {
    globalForSupabase.supabaseAdmin = createAdminClient<Database>();
  }
  return globalForSupabase.supabaseAdmin;
}

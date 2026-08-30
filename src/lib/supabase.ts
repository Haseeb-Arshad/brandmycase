import { createAdminClient } from "@supabase/server/core";
import type { SupabaseClient } from "@supabase/supabase-js";

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
  created_at: string;
  updated_at: string;
};

export interface Database {
  public: {
    Tables: {
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
          created_at: string;
          updated_at: string;
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
        Returns: null;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

const globalForSupabase = globalThis as unknown as {
  supabaseAdmin?: SupabaseClient<Database>;
};

/** Lazily create one server-only client per process. */
export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (!globalForSupabase.supabaseAdmin) {
    globalForSupabase.supabaseAdmin = createAdminClient<Database>();
  }
  return globalForSupabase.supabaseAdmin;
}

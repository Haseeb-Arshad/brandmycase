"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { PlacementBoard, PlacementState, TierAvailability } from "@/lib/placement-board";
import type { FundingState, PublicSponsor } from "@/lib/funding";
import type { TierId } from "@/data/sponsorship";
import { track } from "@/lib/analytics";
import { SponsorshipModal } from "@/components/SponsorshipModal";

/**
 * Shared campaign state.
 *
 * The server reads the board and the funding figures once per request and
 * hands them down here, so the case, the package cards, the panel grid and
 * the form all render from the same snapshot and cannot disagree about what
 * is available.
 *
 * This provider also hosts the single sponsorship form. Every route into it —
 * a hero button, a package card, a panel on the 3D case, a card in the grid —
 * opens the same dialog, so there is one submission path rather than four
 * that drift apart.
 *
 * `lastTrigger` holds the element that opened the dialog so focus can be
 * returned to it on close: the part of a modal that is easy to forget and
 * immediately obvious to anyone using a keyboard.
 */

export interface SponsorFormRequest {
  tier?: TierId | null;
  placement?: PlacementState | null;
  /** Where the click came from. Analytics only; never stored. */
  source: string;
}

interface CampaignContextValue {
  placements: PlacementState[];
  tiers: TierAvailability[];
  stats: PlacementBoard["stats"];
  funding: FundingState;
  sponsors: PublicSponsor[];
  openSponsorForm: (request: SponsorFormRequest) => void;
}

const CampaignContext = createContext<CampaignContextValue | null>(null);

export function useCampaign(): CampaignContextValue {
  const ctx = useContext(CampaignContext);
  if (!ctx) throw new Error("useCampaign must be used inside <CampaignProvider>.");
  return ctx;
}

/**
 * The same context, for components that legitimately render outside it.
 *
 * The nav appears on the legal pages, which have no board and no funding
 * figures to provide. Its sponsor button degrades there into a link back to
 * the campaign rather than throwing, so /terms and /privacy stay statically
 * renderable and the button still does the obvious thing.
 */
export function useOptionalCampaign(): CampaignContextValue | null {
  return useContext(CampaignContext);
}

interface OpenState {
  tier: TierId | null;
  placement: PlacementState | null;
}

export function CampaignProvider({
  board,
  funding,
  sponsors,
  children,
}: {
  board: PlacementBoard;
  funding: FundingState;
  sponsors: PublicSponsor[];
  children: ReactNode;
}) {
  const [open, setOpen] = useState<OpenState | null>(null);
  const lastTrigger = useRef<HTMLElement | null>(null);

  // One page view, once, however many components mount underneath.
  useEffect(() => {
    track("view_campaign", { sponsors_confirmed: funding.confirmedCount });
  }, [funding.confirmedCount]);

  const openSponsorForm = useCallback((request: SponsorFormRequest) => {
    lastTrigger.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const tier = request.placement?.tier ?? request.tier ?? null;
    track("open_sponsor_form", {
      source: request.source,
      ...(tier ? { tier } : {}),
      ...(request.placement ? { panel: request.placement.id } : {}),
    });

    setOpen({ tier, placement: request.placement ?? null });
  }, []);

  const close = useCallback(() => {
    setOpen(null);
    lastTrigger.current?.focus();
    lastTrigger.current = null;
  }, []);

  const value = useMemo<CampaignContextValue>(
    () => ({
      placements: board.placements,
      tiers: board.tiers,
      stats: board.stats,
      funding,
      sponsors,
      openSponsorForm,
    }),
    [board, funding, sponsors, openSponsorForm],
  );

  return (
    <CampaignContext.Provider value={value}>
      {children}
      {open && (
        <SponsorshipModal
          tiers={board.tiers}
          placements={board.placements}
          initialTier={open.tier}
          initialPlacement={open.placement}
          onClose={close}
        />
      )}
    </CampaignContext.Provider>
  );
}

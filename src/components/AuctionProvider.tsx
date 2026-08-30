"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuctionBoard, PanelState } from "@/lib/auction";
import { BidModal } from "@/components/BidModal";

/**
 * Shared auction state.
 *
 * The 3D case, the inventory table, the funding bar and the bid ticker all read
 * the same board object, so one refetch after a bid updates every one of them
 * at once. The board is seeded from the server render, so the first paint has
 * real numbers rather than a loading state.
 */

interface AuctionContextValue {
  panels: PanelState[];
  stats: AuctionBoard["stats"];
  recent: AuctionBoard["recent"];
  selectPanel: (panel: PanelState) => void;
  refresh: () => Promise<void>;
}

const AuctionContext = createContext<AuctionContextValue | null>(null);

export function useAuction(): AuctionContextValue {
  const ctx = useContext(AuctionContext);
  if (!ctx) throw new Error("useAuction must be used inside <AuctionProvider>.");
  return ctx;
}

export function AuctionProvider({
  initialBoard,
  children,
}: {
  initialBoard: AuctionBoard;
  children: ReactNode;
}) {
  const [board, setBoard] = useState(initialBoard);
  const [selected, setSelected] = useState<PanelState | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/board", { cache: "no-store" });
      if (!res.ok) return;
      setBoard((await res.json()) as AuctionBoard);
    } catch {
      // A failed refresh is not worth interrupting the user for; the board they
      // are looking at is still valid, just a few seconds stale.
    }
  }, []);

  const selectPanel = useCallback((panel: PanelState) => setSelected(panel), []);

  const value = useMemo<AuctionContextValue>(
    () => ({
      panels: board.panels,
      stats: board.stats,
      recent: board.recent,
      selectPanel,
      refresh,
    }),
    [board, selectPanel, refresh],
  );

  return (
    <AuctionContext.Provider value={value}>
      {children}
      {selected && (
        <BidModal
          panel={selected}
          onClose={() => setSelected(null)}
          onBidPlaced={refresh}
        />
      )}
    </AuctionContext.Provider>
  );
}

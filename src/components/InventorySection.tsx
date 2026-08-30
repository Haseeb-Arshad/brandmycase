"use client";

import { useMemo, useState } from "react";
import { useAuction } from "@/components/AuctionProvider";
import { formatUsd } from "@/lib/money";
import { FACE_LABELS, ROTATABLE_FACES, type Face } from "@/data/placements";

/**
 * The live inventory — the same twenty panels as the 3D case, as cards you can
 * scan and filter. Clicking a card opens the identical bid modal the case
 * opens, so there is one bidding path rather than two that can drift apart.
 */

type Filter = "all" | "open" | Face;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All 20" },
  { key: "open", label: "Available" },
  ...ROTATABLE_FACES.map((f) => ({ key: f as Filter, label: FACE_LABELS[f] })),
  { key: "top" as Filter, label: FACE_LABELS.top },
];

export function InventorySection() {
  const { panels, selectPanel } = useAuction();
  const [filter, setFilter] = useState<Filter>("all");

  const rows = useMemo(() => {
    if (filter === "all") return panels;
    if (filter === "open") return panels.filter((p) => !p.taken);
    return panels.filter((p) => p.face === filter);
  }, [panels, filter]);

  const openCount = panels.filter((p) => !p.taken).length;

  return (
    <section className="section" id="inventory" style={{ background: "var(--surface)" }}>
      <div className="wrap">
        <div className="section-head">
          <p className="section-kicker">Live inventory</p>
          <h2 className="h2" style={{ marginTop: 10 }}>
            Twenty panels. {openCount} still open.
          </h2>
          <p className="lede">
            Every panel is a real, measured area on the shell. Tap one to place a bid
            — or outbid a panel that is already taken.
          </p>
        </div>

        <div className="inventory-bar">
          <div className="segmented" role="group" aria-label="Filter panels">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                aria-pressed={filter === f.key}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="inventory-grid">
          {rows.map((panel) => (
            <button
              key={panel.id}
              className="panel-card"
              data-open={!panel.taken}
              onClick={() => selectPanel(panel)}
              aria-label={`Bid on panel ${panel.id}, ${panel.name}`}
            >
              <div className="panel-card-top">
                <span className="panel-no tnum">{panel.id}</span>
                <span className="panel-face">
                  {FACE_LABELS[panel.face]} · {panel.sizeLabel}
                </span>
              </div>

              <strong>{panel.name}</strong>
              <span className="panel-desc">{panel.description}</span>

              <div className="panel-card-foot">
                <span className="panel-price tnum">
                  {formatUsd(panel.currentBidUsd ?? panel.openingBidUsd)}
                </span>
                {panel.taken ? (
                  <span className="panel-status">
                    {panel.sponsor} · {panel.bidCount} bid
                    {panel.bidCount === 1 ? "" : "s"}
                  </span>
                ) : (
                  <span className="panel-status open">Opening bid · available</span>
                )}
              </div>
            </button>
          ))}
        </div>

        {rows.length === 0 && (
          <p
            style={{
              padding: "40px 0",
              textAlign: "center",
              color: "var(--ink-2)",
              fontSize: 15,
            }}
          >
            Every panel on this face is taken. Try another face, or outbid one.
          </p>
        )}
      </div>
    </section>
  );
}

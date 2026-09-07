"use client";

import { useMemo, useState } from "react";
import { useCampaign } from "@/components/CampaignProvider";
import { CaseStage } from "@/components/CaseStage";
import { FACE_LABELS } from "@/data/placements";
import { formatUsd, TIER_IDS, type TierId } from "@/data/sponsorship";
import { track } from "@/lib/analytics";

/**
 * The case, and the same twenty placements as plain cards underneath it.
 *
 * The 3D is the good part, and it is also the part that cannot be relied on:
 * WebGL fails, pointers are imprecise, and some people navigate entirely by
 * keyboard. So every panel on the case is also a button in this grid, opening
 * the identical form. Nothing here is reachable only by rotating a 3D object.
 *
 * The filter is by tier rather than by face, because the choice a sponsor is
 * actually making is a price.
 */

type Filter = "all" | TierId;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All 20" },
  ...TIER_IDS.map((id) => ({ key: id as Filter, label: id[0] + id.slice(1).toLowerCase() })),
];

export function CaseSection() {
  const { placements, stats, openSponsorForm } = useCampaign();
  const [filter, setFilter] = useState<Filter>("all");

  const rows = useMemo(
    () => (filter === "all" ? placements : placements.filter((p) => p.tier === filter)),
    [placements, filter],
  );

  return (
    <section className="section case-section" id="case" style={{ background: "var(--surface)" }}>
      <div className="wrap">
        <div className="section-head">
          <p className="section-kicker">The case</p>
          <h2 className="h2" style={{ marginTop: 10 }}>
            Twenty real places to put a logo.
          </h2>
          <p className="lede">
            This is the actual case, measured. Spin it, pick the panel you want, and
            I&rsquo;ll confirm whether it&rsquo;s still free. {stats.available} of{" "}
            {stats.total} are open right now.
          </p>
        </div>

        <CaseStage />

        <div className="inventory-bar">
          <div className="segmented" role="group" aria-label="Filter placements by tier">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                aria-pressed={filter === f.key}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="inventory-grid">
          {rows.map((placement) => {
            const label = `${placement.name}, ${placement.tierLabel} sponsorship, ${formatUsd(
              placement.priceUsd,
            )}, ${placement.statusLabel}`;

            const body = (
              <>
                <div className="panel-card-top">
                  <span className="panel-no tnum">{placement.id}</span>
                  <span className="panel-face">
                    {FACE_LABELS[placement.face]} · {placement.sizeLabel}
                  </span>
                </div>

                <strong>{placement.name}</strong>
                <span className="panel-desc">{placement.description}</span>

                <div className="panel-card-foot">
                  <span className="panel-tier">
                    {placement.tierLabel} · {formatUsd(placement.priceUsd)}
                  </span>
                  <span className="panel-status" data-status={placement.status}>
                    {placement.available
                      ? "Sponsor this ›"
                      : placement.sponsor
                        ? placement.sponsor.name
                        : placement.status === "SPONSORED"
                          ? "Reserved"
                          : placement.statusLabel}
                  </span>
                </div>
              </>
            );

            // Taken panels are not buttons. Nothing opens, nothing is offered,
            // and the sponsor's name is shown only where they allowed it.
            return placement.available ? (
              <button
                key={placement.id}
                type="button"
                className="panel-card"
                data-open="true"
                data-tier={placement.tier}
                onClick={() => {
                  track("select_panel", {
                    panel: placement.id,
                    tier: placement.tier,
                    available: true,
                    source: "grid",
                  });
                  openSponsorForm({ source: "grid", placement });
                }}
                aria-label={`Sponsor ${label}`}
              >
                {body}
              </button>
            ) : (
              <div
                key={placement.id}
                className="panel-card"
                data-open="false"
                data-tier={placement.tier}
                aria-label={label}
              >
                {body}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

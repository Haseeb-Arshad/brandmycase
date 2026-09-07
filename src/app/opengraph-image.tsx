import { ImageResponse } from "next/og";
import { TIER_BY_ID, formatUsd } from "@/data/sponsorship";

/**
 * The share card.
 *
 * Typography only. There is deliberately no logo, no badge, no sponsor mark
 * and nothing resembling event branding on it — a share card is the easiest
 * place in a project like this to imply a relationship that does not exist,
 * and it is the one image most people will see before they read a word.
 *
 * Everything on it is a fact stated elsewhere on the page.
 */

export const runtime = "nodejs";
export const alt =
  "Brand the Case — sponsor a developer's trip from Pakistan to OpenAI DevDay. An independent project.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#ffffff",
          color: "#1d1d1f",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#86868b",
            }}
          >
            Brand the Case · by Haseeb Arshad
          </div>
          <div style={{ display: "flex", fontSize: 96, fontWeight: 700, lineHeight: 1.05 }}>
            Your brand, on my case.
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", fontSize: 32, color: "#56565c" }}>
            Twenty measured placements on one travelling case. San Francisco, for
            OpenAI DevDay. Sponsorship from{" "}
            {formatUsd(TIER_BY_ID.SUPPORTER.priceUsd)} to{" "}
            {formatUsd(TIER_BY_ID.ANCHOR.priceUsd)}.
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#86868b" }}>
            Independent project · Not affiliated with, sponsored by or endorsed by
            OpenAI
          </div>
        </div>
      </div>
    ),
    size,
  );
}

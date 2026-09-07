/**
 * Regenerates the placement table in the sponsor kit.
 *
 *   npx tsx scripts/gen-panel-table.mts
 *
 * Prices come from the tier configuration rather than from anywhere in this
 * script, so a document a sponsor reads cannot disagree with the website.
 */
import { PLACEMENTS, FACE_LABELS, CASE } from "../src/data/placements";
import { formatUsd, tierForPanel } from "../src/data/sponsorship";

console.log("| # | Code | Placement | Face | Print size | Tier | Price |");
console.log("| --- | --- | --- | --- | --- | --- | --- |");
for (const p of PLACEMENTS) {
  const tier = tierForPanel(p.id);
  console.log(
    `| ${p.id} | \`${p.code}\` | ${p.name} | ${FACE_LABELS[p.face]} | ${p.sizeLabel} | ` +
      `${tier?.label ?? "—"} | ${tier ? formatUsd(tier.priceUsd) : "—"} |`,
  );
}
console.log("");
console.log(
  "SHELL=" +
    Math.round(CASE.width * 100) +
    "x" +
    Math.round(CASE.height * 100) +
    "x" +
    Math.round(CASE.depth * 100),
);

import { PLACEMENTS, FACE_LABELS, RESERVE_FLOOR_USD, GOAL_USD, CASE } from "../src/data/placements";
const usd = (n: number) => "$" + n.toLocaleString("en-US");
console.log("| # | Code | Panel | Face | Print size | Opening bid |");
console.log("| --- | --- | --- | --- | --- | --- |");
for (const p of PLACEMENTS) {
  console.log(`| ${p.id} | \`${p.code}\` | ${p.name} | ${FACE_LABELS[p.face]} | ${p.sizeLabel} | ${usd(p.openingBidUsd)} |`);
}
console.log("");
console.log("RESERVE=" + RESERVE_FLOOR_USD + " GOAL=" + GOAL_USD);
console.log("SHELL=" + Math.round(CASE.width*100) + "x" + Math.round(CASE.height*100) + "x" + Math.round(CASE.depth*100));

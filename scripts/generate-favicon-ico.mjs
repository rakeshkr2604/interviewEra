/**
 * Builds `public/favicon.ico` from canonical brand PNGs (16 + 32px).
 * Source: InterviewEra.com Brand Icons/assets/favicons/
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pngToIco from "png-to-ico";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const sources = [
  path.join(root, "InterviewEra.com Brand Icons", "assets", "favicons", "favicon-16x16.png"),
  path.join(root, "InterviewEra.com Brand Icons", "assets", "favicons", "favicon-32x32.png"),
];
const out = path.join(root, "public", "favicon.ico");

for (const p of sources) {
  if (!fs.existsSync(p)) throw new Error(`Missing source PNG: ${p}`);
}

const buf = await pngToIco(sources);
fs.writeFileSync(out, buf);
console.log("wrote", out, `(${buf.length} bytes)`);

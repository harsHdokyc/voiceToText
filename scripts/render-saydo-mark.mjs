/**
 * Renders assets/brand/saydo-mark.svg into Expo + Landing favicon/icon PNGs.
 * Usage: node scripts/render-saydo-mark.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(join(root, "assets/brand/saydo-mark.svg"));
const mono = readFileSync(join(root, "assets/brand/saydo-mark-mono.svg"));

function render(svgBuffer, size) {
  return new Resvg(svgBuffer, {
    fitTo: { mode: "width", value: size },
    background: "rgba(0,0,0,0)",
  })
    .render()
    .asPng();
}

const outs = [
  { file: "assets/brand/saydo-mark.png", size: 512, src: svg },
  { file: "assets/brand/saydo-mark-64.png", size: 64, src: svg },
  { file: "assets/images/icon.png", size: 1024, src: svg },
  { file: "assets/images/favicon.png", size: 48, src: svg },
  { file: "assets/images/splash-icon.png", size: 512, src: svg },
  { file: "assets/images/android-icon-foreground.png", size: 1024, src: svg },
  { file: "assets/images/android-icon-monochrome.png", size: 1024, src: mono },
  { file: "LandingPage/public/favicon.png", size: 48, src: svg },
  { file: "LandingPage/public/saydo-mark.png", size: 512, src: svg },
  { file: "LandingPage/public/apple-touch-icon.png", size: 180, src: svg },
];

// Solid lime adaptive background
const bgSvg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#dfff5a"/></svg>`,
);

for (const out of outs) {
  const abs = join(root, out.file);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, render(out.src, out.size));
  console.log("wrote", out.file, out.size);
}

{
  const abs = join(root, "assets/images/android-icon-background.png");
  writeFileSync(abs, render(bgSvg, 1024));
  console.log("wrote assets/images/android-icon-background.png");
}

// Copy SVG favicons
writeFileSync(join(root, "LandingPage/public/favicon.svg"), svg);
writeFileSync(join(root, "LandingPage/public/saydo-mark.svg"), svg);
console.log("wrote LandingPage/public favicon.svg + saydo-mark.svg");

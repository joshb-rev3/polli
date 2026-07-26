/**
 * Brand assets from the EXACT polli logo PNG — never redraws letterforms.
 *
 * - Knocks out the black plate → transparent wordmark
 * - Optional light wordmark (green → cream) for dark surfaces
 * - Icons crop the real "p" glyph and add the bee-head accent
 * - OG composites the exact wordmark on paper
 */
const { Resvg } = require("@resvg/resvg-js");
const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const root = path.resolve(__dirname, "..");
const GREEN = { r: 0x1b, g: 0x4d, b: 0x3e };
const PAPER = { r: 0xff, g: 0xfb, b: 0xf5 };
const PAPER_HEX = "#FFFBF5";
const MARIGOLD = "#F5B800";
const CORAL = "#F2553D";
const INK = "#19191B";

const SOURCE = path.join(root, "assets/polli-logo-source.png");

function readPng(file) {
  return PNG.sync.read(fs.readFileSync(file));
}

function writePng(file, png) {
  fs.writeFileSync(file, PNG.sync.write(png));
  console.log("Wrote", path.relative(root, file), `${png.width}x${png.height}`);
}

function isNearBlack(r, g, b, a) {
  return a < 8 || (r < 18 && g < 18 && b < 18);
}

function isNearGreen(r, g, b) {
  // Brand green in the source logo
  return g > r + 20 && g > b + 10 && r < 80 && g > 40 && g < 120 && b < 90;
}

function isNearYellow(r, g, b) {
  return r > 180 && g > 120 && b < 80 && r > b + 80;
}

/** Exact logo with black plate removed (pixel-identical green + yellow). */
function makeTransparentWordmark(src) {
  const out = new PNG({ width: src.width, height: src.height });
  for (let i = 0; i < src.data.length; i += 4) {
    const r = src.data[i];
    const g = src.data[i + 1];
    const b = src.data[i + 2];
    const a = src.data[i + 3];
    if (isNearBlack(r, g, b, a)) {
      out.data[i] = out.data[i + 1] = out.data[i + 2] = out.data[i + 3] = 0;
    } else {
      out.data[i] = r;
      out.data[i + 1] = g;
      out.data[i + 2] = b;
      out.data[i + 3] = a;
    }
  }
  return out;
}

/** Same geometry; green ink → paper cream for dark UI surfaces. */
function makeLightWordmark(transparent) {
  const out = new PNG({ width: transparent.width, height: transparent.height });
  for (let i = 0; i < transparent.data.length; i += 4) {
    const r = transparent.data[i];
    const g = transparent.data[i + 1];
    const b = transparent.data[i + 2];
    const a = transparent.data[i + 3];
    out.data[i + 3] = a;
    if (a < 8) {
      out.data[i] = out.data[i + 1] = out.data[i + 2] = 0;
    } else if (isNearGreen(r, g, b)) {
      out.data[i] = PAPER.r;
      out.data[i + 1] = PAPER.g;
      out.data[i + 2] = PAPER.b;
    } else {
      // keep yellow i-dot (and any other accents) exactly
      out.data[i] = r;
      out.data[i + 1] = g;
      out.data[i + 2] = b;
    }
  }
  return out;
}

function contentBounds(png, pred) {
  let minX = png.width;
  let minY = png.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const i = (png.width * y + x) << 2;
      const a = png.data[i + 3];
      if (a < 8) continue;
      const r = png.data[i];
      const g = png.data[i + 1];
      const b = png.data[i + 2];
      if (pred && !pred(r, g, b, a)) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) throw new Error("No content pixels found");
  return { minX, minY, maxX, maxY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/**
 * Crop the branded "p" from the exact wordmark by taking the left letter
 * before the first vertical gap after the p's bowl.
 */
function cropExactP(transparent) {
  const full = contentBounds(transparent);
  // Scan vertical ink density to find letter gaps inside the word bbox
  const colInk = new Array(full.w).fill(0);
  for (let y = full.minY; y <= full.maxY; y++) {
    for (let x = full.minX; x <= full.maxX; x++) {
      const i = (transparent.width * y + x) << 2;
      if (transparent.data[i + 3] > 8) colInk[x - full.minX]++;
    }
  }

  // Skip leading ink, then find first thin gap after a solid run (end of p)
  let i = 0;
  while (i < colInk.length && colInk[i] < 2) i++;
  while (i < colInk.length && colInk[i] >= 2) i++;
  // gap
  let gapStart = i;
  while (i < colInk.length && colInk[i] < 2) i++;
  const gapEnd = i;
  // p ends mid-gap
  const cut = full.minX + Math.floor((gapStart + gapEnd) / 2);

  const pBounds = {
    minX: full.minX,
    minY: full.minY,
    maxX: cut - 1,
    maxY: full.maxY,
  };
  pBounds.w = pBounds.maxX - pBounds.minX + 1;
  pBounds.h = pBounds.maxY - pBounds.minY + 1;

  const out = new PNG({ width: pBounds.w, height: pBounds.h });
  for (let y = 0; y < pBounds.h; y++) {
    for (let x = 0; x < pBounds.w; x++) {
      const si = (transparent.width * (pBounds.minY + y) + (pBounds.minX + x)) << 2;
      const di = (pBounds.w * y + x) << 2;
      out.data[di] = transparent.data[si];
      out.data[di + 1] = transparent.data[si + 1];
      out.data[di + 2] = transparent.data[si + 2];
      out.data[di + 3] = transparent.data[si + 3];
    }
  }
  return { png: out, bounds: pBounds, full };
}

function encodePngBase64(png) {
  return PNG.sync.write(png).toString("base64");
}

function beeSvg(scale = 1) {
  return `<g transform="scale(${scale})">
  <path d="M78 78 C52 42 34 18 42 0" fill="none" stroke="${INK}" stroke-width="14" stroke-linecap="round"/>
  <path d="M162 78 C188 42 206 18 198 0" fill="none" stroke="${INK}" stroke-width="14" stroke-linecap="round"/>
  <circle cx="40" cy="2" r="18" fill="${CORAL}"/>
  <circle cx="200" cy="2" r="18" fill="${CORAL}"/>
  <circle cx="120" cy="148" r="100" fill="${MARIGOLD}"/>
  <circle cx="82" cy="136" r="26" fill="${INK}"/>
  <circle cx="158" cy="136" r="26" fill="${INK}"/>
  <circle cx="72" cy="124" r="8" fill="${PAPER_HEX}"/>
  <circle cx="148" cy="124" r="8" fill="${PAPER_HEX}"/>
  <ellipse cx="58" cy="172" rx="18" ry="11" fill="${CORAL}" opacity="0.45"/>
  <ellipse cx="182" cy="172" rx="18" ry="11" fill="${CORAL}" opacity="0.45"/>
  <path d="M86 188 Q120 214 154 188" fill="none" stroke="${INK}" stroke-width="12" stroke-linecap="round"/>
</g>`;
}

function buildIconSvg(pPng, size) {
  const b64 = encodePngBase64(pPng);
  // Fit exact p into safe square with padding; bee on upper-right of bowl
  const pad = size * 0.14;
  const maxW = size - pad * 2;
  const maxH = size - pad * 2.2;
  const scale = Math.min(maxW / pPng.width, maxH / pPng.height);
  const drawW = pPng.width * scale;
  const drawH = pPng.height * scale;
  const x = (size - drawW) / 2 - size * 0.04;
  const y = (size - drawH) / 2 + size * 0.04;
  const beeS = size / 1024;
  const beeX = x + drawW * 0.72;
  const beeY = y - size * 0.02;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
  viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="${PAPER_HEX}"/>
  <image x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${drawW.toFixed(1)}" height="${drawH.toFixed(1)}"
    href="data:image/png;base64,${b64}" xlink:href="data:image/png;base64,${b64}"/>
  <g transform="translate(${beeX.toFixed(1)} ${beeY.toFixed(1)})">${beeSvg(beeS)}</g>
</svg>`;
}

function buildOgSvg(wordmarkPng) {
  const b64 = encodePngBase64(wordmarkPng);
  const width = 1200;
  const height = 630;
  const logoW = 720;
  const logoH = (wordmarkPng.height / wordmarkPng.width) * logoW;
  const lx = (width - logoW) / 2;
  const ly = (height - logoH) / 2 - 36;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
  viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" fill="${PAPER_HEX}"/>
  <image x="${lx}" y="${ly}" width="${logoW}" height="${logoH.toFixed(1)}"
    href="data:image/png;base64,${b64}" xlink:href="data:image/png;base64,${b64}"/>
  <text x="600" y="480" text-anchor="middle" font-family="Fraunces" font-style="italic" font-size="34"
    fill="#1B4D3E" opacity="0.82">Share $1 and endless good…</text>
</svg>`;
}

function rasterSvg(svg, file, width) {
  const fontItalic = path.join(
    root,
    "node_modules/@expo-google-fonts/fraunces/400Regular_Italic/Fraunces_400Regular_Italic.ttf",
  );
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    background: PAPER_HEX,
    font: {
      fontFiles: fs.existsSync(fontItalic) ? [fontItalic] : [],
      loadSystemFonts: false,
      defaultFontFamily: "Fraunces",
    },
  });
  fs.writeFileSync(path.join(root, file), resvg.render().asPng());
  console.log("Wrote", file);
}

// --- run ---
if (!fs.existsSync(SOURCE)) {
  console.error("Missing exact logo at", SOURCE);
  process.exit(1);
}

const source = readPng(SOURCE);
const transparent = makeTransparentWordmark(source);
const light = makeLightWordmark(transparent);
writePng(path.join(root, "assets/polli logo.png"), transparent);
writePng(path.join(root, "assets/polli logo light.png"), light);

const { png: exactP } = cropExactP(transparent);
writePng(path.join(root, "assets/polli-p.png"), exactP);

const masterSvg = buildIconSvg(exactP, 1024);
const faviconSvg = buildIconSvg(exactP, 32);
fs.writeFileSync(path.join(root, "assets/brand-mark.svg"), masterSvg);
fs.writeFileSync(path.join(root, "public/favicon.svg"), faviconSvg);

for (const { file, size } of [
  { file: "assets/icon.png", size: 1024 },
  { file: "assets/adaptive-icon.png", size: 1024 },
  { file: "assets/splash-icon.png", size: 1024 },
  { file: "assets/favicon.png", size: 1024 },
  { file: "public/favicon.png", size: 48 },
  { file: "public/favicon-32.png", size: 32 },
  { file: "public/apple-touch-icon.png", size: 180 },
  { file: "public/icon-192.png", size: 192 },
  { file: "public/icon-512.png", size: 512 },
]) {
  rasterSvg(size <= 48 ? faviconSvg : masterSvg, file, size);
}

const ogSvg = buildOgSvg(transparent);
fs.writeFileSync(path.join(root, "assets/og-image.svg"), ogSvg);
rasterSvg(ogSvg, "assets/og-image.png", 1200);
rasterSvg(ogSvg, "public/og-image.png", 1200);

// Remove generated faux wordmarks if present
for (const f of ["assets/polli-wordmark.svg", "assets/polli-wordmark-light.svg"]) {
  const p = path.join(root, f);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

console.log("Done — logo pixels preserved from polli-logo-source.png");

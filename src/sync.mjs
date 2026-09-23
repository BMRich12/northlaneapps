// Pull the apps from Jarvis's Dashboards into the site: name, one-liner, icon, screens,
// App Store id, and a panel colour taken from the icon. Writes site/apps.json and
// site/assets/<slug>/. Hand-written copy in site/overrides.json always wins.
//
//   node src/sync.mjs            (reads ~/jarvis-memory and ~/.jarvis)
//
// Nothing here is published by itself: `npm run build` renders the site, and a push publishes it.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const HOME = os.homedir();
const MEMORY = process.env.JARVIS_MEMORY ?? path.join(HOME, "jarvis-memory");
const DASHBOARDS = path.join(MEMORY, "forge", "dashboards");
const FILES = path.join(HOME, ".jarvis", "forge", "dashboards");
const ROOT = path.resolve(import.meta.dirname, "..");
const SITE = path.join(ROOT, "site");

const read = (f) => { try { return readFileSync(f, "utf8"); } catch { return ""; } };
const front = (md) => Object.fromEntries((/^---\n([\s\S]*?)\n---/.exec(md)?.[1] ?? "").split("\n").map((l) => /^([a-z_]+):\s*(.*)$/.exec(l)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]));
const section = (md, h) => (new RegExp(`(?:^|\\n)## ${h}\\n([\\s\\S]*?)(?=\\n## |$)`).exec(md)?.[1] ?? "").trim();
const rows = (md) => md.split("\n").filter((l) => l.startsWith("| ") && !/^\| (File|---)/.test(l)).map((l) => l.split("|").map((c) => c.trim()));

/** The icon's colour: its saturated pixels averaged (weighted to the strongest), then darkened until white text on it passes 4.5:1. An override pins it. */
function panelColour(icon) {
  const raw = execFileSync("ffmpeg", ["-v", "error", "-i", icon, "-vf", "scale=24:24", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]);
  const picks = [];
  for (let i = 0; i < raw.length; i += 3) {
    const [r, g, b] = [raw[i], raw[i + 1], raw[i + 2]];
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 510, s = max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255));
    if (s > 0.25 && l > 0.15 && l < 0.85) picks.push([r, g, b, s * s]);
  }
  // Weighted by saturation squared, so the icon's strongest colour leads rather than a mix of its tones.
  const w = picks.reduce((a, p) => a + p[3], 0);
  let c = picks.length ? [0, 1, 2].map((k) => picks.reduce((a, p) => a + p[k] * p[3], 0) / w) : [60, 70, 90];
  const lum = (v) => { const [r, g, b] = v.map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  while (1.05 / (lum(c) + 0.05) < 4.6) c = c.map((x) => x * 0.94);
  return `#${c.map((x) => Math.round(x).toString(16).padStart(2, "0")).join("")}`;
}

/** Bare app screens beat finished store shots: the site frames its own phones. */
function screensFor(slug, dash, hero) {
  const shots = rows(read(path.join(dash, "screenshots.md")));
  const raw = shots.filter((c) => c[3] === "raw").map((c) => path.join(FILES, slug, c[1]));
  if (raw.length) return raw;
  const build = path.join(MEMORY, "apps", slug, "build", "shots");
  const bare = existsSync(build) ? readdirSync(build).filter((f) => /17-Pro-Max\.png$/.test(f)).map((f) => path.join(build, f)) : [];
  if (bare.length) return bare.sort((a, b) => Number(!!hero && b.includes(hero)) - Number(!!hero && a.includes(hero)));
  return shots.map((c) => path.join(FILES, slug, c[1]));
}

const overrides = JSON.parse(read(path.join(SITE, "overrides.json")) || "{}");
const apps = [];
for (const slug of readdirSync(DASHBOARDS).filter((s) => existsSync(path.join(DASHBOARDS, s, "app.md"))).sort()) {
  const dash = path.join(DASHBOARDS, slug);
  const o = overrides[slug] ?? {};
  if (o.hidden) continue;
  const meta = front(read(path.join(dash, "app.md")));
  const listing = read(path.join(dash, "listing.md"));
  const icon = path.join(FILES, slug, "icon.png");
  if (!existsSync(icon)) { console.warn(`skip ${slug}: no icon`); continue; }
  const out = path.join(SITE, "assets", slug);
  mkdirSync(out, { recursive: true });
  execFileSync("sips", ["-Z", "512", icon, "--out", path.join(out, "icon.png")], { stdio: "ignore" });
  const screens = screensFor(slug, dash, o.hero).filter((f) => existsSync(f)).slice(0, 3);
  screens.forEach((f, i) => execFileSync("sips", ["-Z", "1100", f, "--out", path.join(out, `screen-${i + 1}.png`)], { stdio: "ignore" }));
  // The app's remote config (maintenance message, kill switches): the app fetches <site>/<slug>/config.json.
  const config = path.join(MEMORY, "docs", slug, "config.json");
  if (existsSync(config)) { mkdirSync(path.join(SITE, "config"), { recursive: true }); writeFileSync(path.join(SITE, "config", `${slug}.json`), readFileSync(config, "utf8")); }
  const appStoreId = /^\d+$/.test(meta.app_store_id ?? "") ? Number(meta.app_store_id) : null;
  apps.push({
    slug,
    name: o.name ?? (section(listing, "Name") || meta.name || slug).split(/ [-–—:] /)[0],
    tagline: o.tagline ?? section(listing, "Subtitle"),
    promise: o.promise ?? section(listing, "Description").split("\n")[0],
    privacy: o.privacy ?? "",
    colour: o.colour ?? panelColour(icon),
    appStoreId,
    screens: screens.map((_, i) => `screen-${i + 1}.png`),
  });
}
writeFileSync(path.join(SITE, "apps.json"), `${JSON.stringify(apps, null, 2)}\n`);
console.log(`synced ${apps.length} app${apps.length === 1 ? "" : "s"}: ${apps.map((a) => `${a.name} ${a.colour}`).join(", ")}`);

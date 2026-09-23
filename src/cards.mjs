// Draw the link-preview pictures (what iMessage, Reddit and X show when a page is shared):
// one for the home page and one per app, 1200×630, into site/cards/. Build copies them to docs/.
//
//   node src/cards.mjs            (after `npm run sync`, when an app's name, colour or screens change)
//
// Drawn by the Mac's own WebKit through Jarvis's snap tool, so no browser is needed. The pictures
// are committed, so building the site never needs the tool.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SITE = path.join(ROOT, "site");
const OUT = path.join(SITE, "cards");
const SNAP = process.env.SNAP_TOOL ?? path.join(os.homedir(), ".jarvis", "forge", "workplaces", "tools", "snap");
const W = 1200, H = 630;
const site = JSON.parse(readFileSync(path.join(SITE, "site.json"), "utf8"));
const apps = JSON.parse(readFileSync(path.join(SITE, "apps.json"), "utf8"));

if (!existsSync(SNAP)) { console.error(`no snap tool at ${SNAP}: open a Forge workplace's Design tab once to build it, or set SNAP_TOOL`); process.exit(1); }

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// The snap tool may only read its own folder, so pictures travel inside the page.
const inline = (f) => `data:image/png;base64,${readFileSync(f).toString("base64")}`;
const asset = (slug, name) => path.join(SITE, "assets", slug, name);

const head = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&amp;family=Inter:wght@400;600;700&amp;display=swap" rel="stylesheet">
<style>
* { box-sizing: border-box; margin: 0; }
html, body { width: ${W}px; height: ${H}px; overflow: hidden; }
body { font-family: "Inter", system-ui, sans-serif; }
.display { font-family: "DM Sans", "Helvetica Neue", sans-serif; font-weight: 700; }
.phone { background: #171714; overflow: hidden; }
.phone img { width: 100%; display: block; object-fit: cover; object-position: top; }
</style></head><body>`;

function appCard(a) {
  const shot = a.screens[0] ? `<div class="phone" style="position:absolute; right:88px; top:92px; width:330px; height:560px; border-radius:48px 48px 0 0; padding:11px 11px 0;"><img src="${inline(asset(a.slug, a.screens[0]))}" style="height:716px; border-radius:38px 38px 0 0;"></div>` : "";
  return `${head}<div style="position:relative; width:${W}px; height:${H}px; background:${a.colour}; color:#fff; padding:72px 80px; overflow:hidden;">
  <img src="${inline(asset(a.slug, "icon.png"))}" style="width:104px; height:104px; border-radius:24px; box-shadow:0 0 0 3px rgba(255,255,255,.35);">
  <h1 class="display" style="margin-top:36px; max-width:600px; font-size:${a.name.length > 16 ? 70 : 82}px; line-height:.98;">${esc(a.name)}</h1>
  <p style="margin-top:22px; max-width:560px; font-size:30px; line-height:1.35;">${esc(a.tagline)}</p>
  <p style="position:absolute; left:80px; bottom:60px; font-size:22px; font-weight:600; opacity:.85;">${esc(site.domain)}</p>
  ${shot}
</div></body></html>`;
}

function homeCard() {
  const lanes = apps.slice(0, 3).map((a) => `<div style="flex:1; background:${a.colour}; border-radius:28px; display:flex; align-items:center; justify-content:center;"><img src="${inline(asset(a.slug, "icon.png"))}" style="width:112px; height:112px; border-radius:26px; box-shadow:0 0 0 3px rgba(255,255,255,.35);"></div>`).join("");
  return `${head}<div style="position:relative; width:${W}px; height:${H}px; background:#F3EFE7; color:#171714; padding:72px 80px; display:flex; gap:56px;">
  <div style="flex:1.25; display:flex; flex-direction:column;">
    <h1 class="display" style="font-weight:400; font-size:84px; line-height:.96;">Small apps.<br>Clearer days.</h1>
    <p style="margin-top:32px; font-size:28px; line-height:1.4;">${esc(site.tagline)}</p>
    <p style="margin-top:auto; font-size:22px; font-weight:600; color:#5D5A53;">${esc(site.domain)}</p>
  </div>
  <div style="flex:1; display:flex; flex-direction:column; gap:20px;">${lanes}</div>
</div></body></html>`;
}

function draw(name, html) {
  const tmp = path.join(os.tmpdir(), `northlane-card-${process.pid}`);
  mkdirSync(tmp, { recursive: true });
  const file = path.join(tmp, `${name}.html`), png = path.join(OUT, `${name}.png`);
  writeFileSync(file, html);
  execFileSync(SNAP, [file, png, String(W), String(H)], { timeout: 60_000 });
  // A Retina Mac draws at 2×: bring it back to the size the page declares.
  execFileSync("sips", ["-z", String(H), String(W), png], { stdio: "ignore" });
  rmSync(tmp, { recursive: true, force: true });
  console.log(`drew site/cards/${name}.png`);
}

mkdirSync(OUT, { recursive: true });
draw("home", homeCard());
for (const a of apps) draw(a.slug, appCard(a));

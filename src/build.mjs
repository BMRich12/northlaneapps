// Render the site into docs/, which GitHub Pages serves at northlaneapps.dev.
//
//   node src/build.mjs
//
// Pages: the home page, one page per app, each app's privacy, support and terms pages
// (Apple asks for the first two in every listing), the website's own privacy page, and a 404.
// Link previews come from site/cards/ (drawn by `npm run cards`). Visitor counts use Cloudflare
// Web Analytics only when site.json has an analyticsToken. An app appears only when
// all three of its legal pages exist in site/legal/: nothing goes live without its policy.

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SITE = path.join(ROOT, "site");
const OUT = path.join(ROOT, "docs");
const site = JSON.parse(readFileSync(path.join(SITE, "site.json"), "utf8"));
const all = JSON.parse(readFileSync(path.join(SITE, "apps.json"), "utf8"));
const LEGAL = ["privacy", "support", "terms"];
const LEGAL_TITLE = { privacy: "Privacy policy", support: "Support", terms: "Terms of use" };
const legalFile = (slug, kind) => path.join(SITE, "legal", `${slug}.${kind}.md`);

const apps = all.filter((a) => {
  const missing = LEGAL.filter((k) => !existsSync(legalFile(a.slug, k)));
  if (missing.length) console.warn(`left out ${a.name}: write site/legal/${a.slug}.{${missing.join(",")}}.md first`);
  return missing.length === 0;
});

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** The small Markdown the legal pages use: ## headings, paragraphs, [links](url). */
const md = (text) => text.trim().split(/\n{2,}/).map((block) => {
  const inline = (s) => esc(s).replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => `<a href="${u}">${t}</a>`);
  const lines = block.split("\n");
  return lines.map((l) => (l.startsWith("## ") ? `<h2>${inline(l.slice(3))}</h2>` : `<p>${inline(l)}</p>`)).join("\n");
}).join("\n");

const storeUrl = (a) => (a.appStoreId ? `https://apps.apple.com/app/id${a.appStoreId}` : null);
const year = new Date().getFullYear();

const cardFor = (name) => (existsSync(path.join(SITE, "cards", `${name}.png`)) ? `https://${site.domain}/cards/${name}.png` : null);
const analytics = site.analyticsToken ? `\n<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='${JSON.stringify({ token: site.analyticsToken })}'></script>` : "";

function page({ title, description, path: at, body, card = "home" }) {
  const url = `https://${site.domain}${at}`;
  const image = cardFor(card);
  const preview = image
    ? `\n<meta property="og:image" content="${image}">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<meta property="og:image:alt" content="${esc(title)}">\n<meta name="twitter:card" content="summary_large_image">`
    : `\n<meta name="twitter:card" content="summary">`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="${esc(site.name)}">${preview}
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@100..125,500..800&amp;family=Geist:wght@400;500;600&amp;display=swap" rel="stylesheet">
<link rel="stylesheet" href="/style.css">${analytics}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="wrap top">
  <a class="brand" href="/">${esc(site.name)}</a>
  <nav class="nav" aria-label="Main"><a href="/#apps">Apps</a><a href="/#about">About</a><a href="mailto:${esc(site.email)}">Contact</a></nav>
</header>
<main id="main" class="wrap">
${body}
</main>
<footer class="wrap foot">
  <span>© ${year} ${esc(site.name)}</span>
  <nav aria-label="Footer">${apps.map((a) => `<a href="/${a.slug}/support/">${esc(a.name)} support</a>`).join("")}<a href="/privacy/">Website privacy</a><a href="mailto:${esc(site.email)}">${esc(site.email)}</a></nav>
</footer>
</body>
</html>
`;
}

const phone = (a, cls = "") => (a.screens[0] ? `<div class="phone ${cls}"><img src="/assets/${a.slug}/${a.screens[0]}" alt="${esc(a.name)} on iPhone" loading="lazy"></div>` : "");
const status = (a) => (storeUrl(a) ? `<span class="badge">On the App Store</span>` : `<span class="badge">Coming soon</span>`);

function home() {
  const panels = apps.map((a) => `<a class="panel" href="/${a.slug}/" style="background: ${esc(a.colour)}">
    <div class="panel-head"><img class="panel-icon" src="/assets/${a.slug}/icon.png" alt="">${status(a)}</div>
    <h2 class="panel-name">${esc(a.name)}</h2>
    <p>${esc(a.tagline)}</p>
    <div class="rise">${phone(a)}</div>
  </a>`).join("\n");
  return page({
    title: `${site.name} · ${site.tagline}`,
    description: `${site.tagline} Made by ${site.owner}.`,
    path: "/",
    body: `<section class="hero">
  <h1>NorthLane<br>Apps</h1>
  <div class="hero-row"><p>${esc(site.tagline.replace(/\.$/, ""))}, made by ${esc(site.owner)}.</p><a class="button" href="#apps">See the apps</a></div>
</section>
<section id="apps" class="apps" aria-label="Apps">
${panels}
</section>
<section id="about" class="about">
  <h2>Hi, I'm ${esc(site.owner.split(" ")[0])}.</h2>
  <p>${esc(site.about)}</p>
</section>`,
  });
}

function appPage(a) {
  const cta = storeUrl(a) ? `<a class="button" href="${storeUrl(a)}">Get it on the App Store</a>` : `<span class="soon">Coming soon to the App Store</span>`;
  const screens = a.screens.map((s, i) => `<div class="phone"><img src="/assets/${a.slug}/${s}" alt="${esc(a.name)} screen ${i + 1}" loading="lazy"></div>`).join("");
  return page({
    title: `${a.name} · ${a.tagline.replace(/\.$/, "")} · ${site.name}`,
    description: `${a.tagline} ${a.promise}`,
    path: `/${a.slug}/`,
    card: a.slug,
    body: `<section class="app-hero" style="background: ${esc(a.colour)}">
  <div class="text">
    <img class="panel-icon" src="/assets/${a.slug}/icon.png" alt="">
    <h1>${esc(a.name)}</h1>
    <p class="tagline">${esc(a.tagline)}</p>
    <p class="promise">${esc(a.promise)}</p>
    <div class="cta">${cta}</div>
  </div>
  <div class="rise">${phone(a)}</div>
</section>
${a.screens.length > 1 ? `<section class="screens" aria-label="Screens">${screens}</section>` : ""}
<section class="facts">
  <div><h2>Private by design</h2><p>${esc(a.privacy || "Nothing you put into the app leaves your iPhone.")}</p></div>
  <div><h2>Help and the fine print</h2><ul><li><a href="/${a.slug}/support/">Support</a></li><li><a href="/${a.slug}/privacy/">Privacy policy</a></li><li><a href="/${a.slug}/terms/">Terms of use</a></li></ul></div>
</section>`,
  });
}

function legalPage(a, kind) {
  return page({
    title: `${LEGAL_TITLE[kind]} · ${a.name}`,
    description: `${LEGAL_TITLE[kind]} for ${a.name}, an iPhone app from ${site.name}.`,
    path: `/${a.slug}/${kind}/`,
    card: a.slug,
    body: `<article class="doc">
  <p class="crumb"><a href="/${a.slug}/">${esc(a.name)}</a></p>
  <h1>${esc(a.name)}: ${LEGAL_TITLE[kind].toLowerCase()}</h1>
  ${md(readFileSync(legalFile(a.slug, kind), "utf8"))}
</article>`,
  });
}

/** The website's own privacy page. It covers the site, not the apps: each app has its own policy. */
function sitePrivacy() {
  const counting = site.analyticsToken
    ? `## Visitor counts\n\nThis website counts visits with Cloudflare Web Analytics, so I can see which pages people read and where they came from. It sets no cookies, does not build a profile of you and does not follow you to other websites. Cloudflare sees the request your browser makes, as any web host does; its privacy policy is at [cloudflare.com/privacypolicy](https://www.cloudflare.com/privacypolicy/).`
    : `## Visitor counts\n\nThis website does not count or track its visitors.`;
  const text = `This page covers the ${site.name} website (${site.domain}). Each app has its own privacy policy, linked from its page.

## Cookies

This website sets no cookies and has no accounts, forms or ads.

${counting}

## Hosting

The website is hosted on GitHub Pages. Like any web host, GitHub receives your IP address and browser details when your browser asks for a page; its privacy statement is at [docs.github.com](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement). The pages load their fonts from Google Fonts.

## Email

If you email ${site.email}, I use your address and message only to reply to you.

## Contact

Questions about this page: [${site.email}](mailto:${site.email}).`;
  return page({
    title: `Website privacy · ${site.name}`,
    description: `How the ${site.name} website handles your visit.`,
    path: "/privacy/",
    body: `<article class="doc">
  <h1>Website privacy</h1>
  ${md(text)}
</article>`,
  });
}

const notFound = () => page({ title: `Not found · ${site.name}`, description: "This page does not exist.", path: "/404.html", body: `<section class="lost"><h1>Not here.</h1><p>That page does not exist. <a href="/">Back to ${esc(site.name)}</a>.</p></section>` });

// Write everything fresh.
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const write = (rel, text) => { const f = path.join(OUT, rel); mkdirSync(path.dirname(f), { recursive: true }); writeFileSync(f, text); };
write("index.html", home());
for (const a of apps) {
  write(`${a.slug}/index.html`, appPage(a));
  for (const k of LEGAL) write(`${a.slug}/${k}/index.html`, legalPage(a, k));
  cpSync(path.join(SITE, "assets", a.slug), path.join(OUT, "assets", a.slug), { recursive: true });
  // Its remote config, where the app looks for it (Helix points App/RemoteConfig.swift at <site>/<slug>/config.json).
  const config = path.join(SITE, "config", `${a.slug}.json`);
  if (existsSync(config)) write(`${a.slug}/config.json`, readFileSync(config, "utf8"));
}
write("privacy/index.html", sitePrivacy());
write("404.html", notFound());
if (existsSync(path.join(SITE, "cards"))) cpSync(path.join(SITE, "cards"), path.join(OUT, "cards"), { recursive: true });
cpSync(path.join(ROOT, "src", "style.css"), path.join(OUT, "style.css"));
write("favicon.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#16181A"/><path d="M16 5 L22 26 L16 21 L10 26 Z" fill="#FBFAF7"/></svg>\n`);
write("CNAME", `${site.domain}\n`);
write(".nojekyll", "");
write("robots.txt", `User-agent: *\nAllow: /\nSitemap: https://${site.domain}/sitemap.xml\n`);
const urls = ["/", "/privacy/", ...apps.flatMap((a) => [`/${a.slug}/`, ...LEGAL.map((k) => `/${a.slug}/${k}/`)])];
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>https://${site.domain}${u}</loc></url>`).join("\n")}\n</urlset>\n`);
console.log(`built ${urls.length + 1} pages for ${apps.length} app${apps.length === 1 ? "" : "s"} into docs/`);

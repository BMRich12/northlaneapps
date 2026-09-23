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

const home = JSON.parse(readFileSync(path.join(SITE, "home.json"), "utf8"));
const COUNT = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
/** Home copy may say {Count}; it becomes the number of apps as a word. */
const counted = (t) => t.replace("{Count}", COUNT[apps.length] ?? String(apps.length));
/** The studio's mark: the lane symbol in a dark circle (Figma "Lane mark"). */
const mark = `<span class="mark"><img src="/assets/home/waves-ladder.svg" width="18" height="18" alt=""></span>`;
const updates = `mailto:${site.email}?subject=${encodeURIComponent("Launch list")}`;
const arrow = `<span class="arrow" aria-hidden="true">↗</span>`;

const storeUrl = (a) => (a.appStoreId ? `https://apps.apple.com/app/id${a.appStoreId}` : null);
const year = new Date().getFullYear();

const cardFor = (name) => (existsSync(path.join(SITE, "cards", `${name}.png`)) ? `https://${site.domain}/cards/${name}.png` : null);
const analytics = site.analyticsToken ? `\n<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='${JSON.stringify({ token: site.analyticsToken })}'></script>` : "";

function page({ title, description, path: at, body, card = "home", bleed = false }) {
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
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&amp;family=Inter:wght@400;600;700&amp;display=swap" rel="stylesheet">
<link rel="stylesheet" href="/style.css">${analytics}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="wrap top">
  <a class="brand" href="/">${mark}${esc(site.name)}</a>
  <nav class="nav" aria-label="Main"><a href="/#apps">Apps</a><a href="/#about">About</a><a href="/privacy/">Privacy</a><a class="button" href="${esc(updates)}">Get updates ${arrow}</a></nav>
</header>
<main id="main"${bleed ? "" : ` class="wrap"`}>
${body}
</main>
<footer class="foot">
  <div class="wrap foot-nav">
    <div class="foot-brand"><a class="brand" href="/">${mark}${esc(site.name)}</a><p>${esc(site.tagline)}</p></div>
    <div class="foot-links">
      <nav aria-label="Apps"><h2>Apps</h2>${apps.map((a) => `<a href="/${a.slug}/">${esc(a.name)}</a>`).join("")}</nav>
      <nav aria-label="Help"><h2>Help</h2><a href="mailto:${esc(site.email)}?subject=Support">Support</a><a href="/privacy/">Privacy</a><a href="mailto:${esc(site.email)}">Contact</a></nav>
    </div>
  </div>
  <div class="wrap"><div class="foot-base"><span>© ${year} ${esc(site.name)}.</span><span>${esc(home.footerNote)}</span></div></div>
</footer>
<script src="/motion.js" defer></script>
</body>
</html>
`;
}

const phone = (a, cls = "") => (a.screens[0] ? `<div class="phone ${cls}"><img src="/assets/${a.slug}/${a.screens[0]}" alt="${esc(a.name)} on iPhone" loading="lazy"></div>` : "");
const lines = (arr) => arr.map((l) => esc(counted(l))).join("<br>");
const availability = (a) => `<span class="availability"><span class="dot"></span>${storeUrl(a) ? "On the App Store" : "Coming soon"}</span>`;

/** One app's showcase: a drawn screen from site/showcase/<slug>.html, or its first real screenshot. */
function showcase(a, i) {
  const sc = a.showcase ?? {};
  const drawn = path.join(SITE, "showcase", `${a.slug}.html`);
  const screen = existsSync(drawn)
    ? `<div class="device"><div class="screen" style="background-color: ${esc(sc.screen ?? "#F3EFE7")}"><div class="scr-status"><b>9:41</b><span>● ᯤ ▰</span></div>${readFileSync(drawn, "utf8")}</div></div>`
    : phone(a, "device device-shot");
  const art = sc.art ? `<img class="art art-${esc(sc.art.place)}" src="/assets/home/${esc(sc.art.file)}" alt="">` : "";
  const label = `${String(i + 1).padStart(2, "0")}${sc.label ? ` / ${esc(sc.label)}` : ""}`;
  return `<section class="showcase${i % 2 ? " flip" : ""}" style="--app: ${esc(a.colour)}; z-index: ${apps.length - i}" aria-label="${esc(a.name)}">
  <div class="wrap showcase-inner">
    <div class="stage">${art}${screen}</div>
    <div class="story">
      <p class="label">${label}</p>
      <h3><a href="/${a.slug}/">${esc(a.name)}</a></h3>
      <p class="quote">“${esc(a.tagline)}”</p>
      <p class="blurb">${esc(sc.blurb ?? a.promise)}</p>
      ${availability(a)}
    </div>
  </div>
</section>`;
}

function homePage() {
  const soon = apps.filter((a) => !storeUrl(a)).map((a) => a.name);
  const soonList = soon.length > 1 ? `${soon.slice(0, -1).join(", ")} and ${soon.at(-1)}` : soon[0];
  const closing = soon.length ? `<section class="closing">
  <img class="closing-art" src="/assets/home/arrows.svg" width="520" height="400" alt="">
  <div class="wrap closing-inner">
    <h2>${esc(home.closingTitle)}</h2>
    <p>${esc(home.closingText.replace("{apps}", soonList).replace("{are}", soon.length > 1 ? "are" : "is"))}</p>
    <a class="button button-light" href="${esc(updates)}">${esc(home.closingButton)} ${arrow}</a>
  </div>
</section>` : "";
  return page({
    title: `${site.name} · ${site.tagline}`,
    description: `${site.tagline} Made by ${site.owner}.`,
    path: "/",
    bleed: true,
    body: `<section class="wrap hero">
  <div class="hero-copy">
    <p class="label label-dot">${esc(home.label)}</p>
    <h1>${lines(home.title)}</h1>
    <p class="lede">${esc(home.lede)}</p>
    <div class="hero-actions"><a class="button" href="#apps">${esc(home.cta)} ${arrow}</a><span>${esc(counted(home.note))}</span></div>
  </div>
  <div class="arch" aria-hidden="true">
    <img class="road" src="/assets/home/road.svg" width="420" height="590" alt="">
    <span class="seal"><span>${home.badge.map(esc).join("<br>")}</span></span>
  </div>
</section>
<section class="wrap intro" id="apps">
  <div><p class="label">${esc(home.appsLabel)}</p><h2>${lines(home.appsTitle)}</h2></div>
  <p>${esc(home.appsNote)}</p>
</section>
${apps.map(showcase).join("\n")}
<section class="philosophy" id="about">
  <div class="wrap">
    <div class="philosophy-head"><p class="label">${esc(home.philosophyLabel)}</p><h2>${lines(home.philosophyTitle)}</h2></div>
    <div class="benefits">${home.benefits.map(([t, d]) => `<div class="benefit"><img src="/assets/home/check-circle.svg" width="30" height="30" alt=""><h3>${esc(t)}</h3><p>${esc(d)}</p></div>`).join("")}</div>
    <div class="promise"><strong>${esc(home.promise)}</strong><span>${esc(home.promiseNote)}</span></div>
  </div>
</section>
${closing}`,
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
    body: `<section class="app-hero" style="background-color: ${esc(a.colour)}">
  <div class="text">
    <img class="panel-icon" src="/assets/${a.slug}/icon.png" alt="">
    <h1>${esc(a.name)}</h1>
    <p class="tagline">${esc(a.tagline)}</p>
    <p class="promise-text">${esc(a.promise)}</p>
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
write("index.html", homePage());
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
cpSync(path.join(SITE, "assets", "home"), path.join(OUT, "assets", "home"), { recursive: true });
if (existsSync(path.join(SITE, "cards"))) cpSync(path.join(SITE, "cards"), path.join(OUT, "cards"), { recursive: true });
cpSync(path.join(ROOT, "src", "style.css"), path.join(OUT, "style.css"));
cpSync(path.join(ROOT, "src", "motion.js"), path.join(OUT, "motion.js"));
write("favicon.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#16181A"/><path d="M16 5 L22 26 L16 21 L10 26 Z" fill="#FBFAF7"/></svg>\n`);
write("CNAME", `${site.domain}\n`);
write(".nojekyll", "");
write("robots.txt", `User-agent: *\nAllow: /\nSitemap: https://${site.domain}/sitemap.xml\n`);
const urls = ["/", "/privacy/", ...apps.flatMap((a) => [`/${a.slug}/`, ...LEGAL.map((k) => `/${a.slug}/${k}/`)])];
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>https://${site.domain}${u}</loc></url>`).join("\n")}\n</urlset>\n`);
console.log(`built ${urls.length + 1} pages for ${apps.length} app${apps.length === 1 ? "" : "s"} into docs/`);

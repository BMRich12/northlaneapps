# NorthLane Apps

The site at https://northlaneapps.dev: a home page, one page per app, each app's privacy, support and terms pages, and the website's own privacy page at `/privacy/`.

- `site/home.json` — the homepage's words (headings, the three promises, the closing line). `{Count}` becomes the number of apps.
- `site/showcase/<slug>.html` — the drawn phone screen for each app on the homepage; its label, blurb, screen colour and decoration live under `showcase` in `site/overrides.json`. An app without one shows its first real screenshot.
- `site/assets/home/` — the homepage's drawings and photo, from the Figma design.
- `site/site.json` — the studio's name, owner, email, tagline and about line. `analyticsToken` is the Cloudflare Web Analytics token: set it and every page counts visits (and `/privacy/` says so); leave it empty and nothing is counted.
- `site/overrides.json` — hand-written copy per app (always wins over what Dashboards has).
- `site/legal/<slug>.{privacy,support,terms}.md` — the legal pages. An app only appears once all three exist.
- `site/config/<slug>.json` — the app's remote config (maintenance message, kill switches), copied from Jarvis and served at `/<slug>/config.json`, where the app looks for it.
- `site/cards/` — the link-preview pictures (1200×630) that iMessage, Reddit and X show when a page is shared.
- `src/style.css` — the whole look, from the Figma "NorthLane Apps homepage"; the values at the top restyle every page.
- `src/motion.js` — each app's phone rising into place as you scroll to it (off with Reduce Motion).
- `src/sync.mjs` — pulls apps from Jarvis's Dashboards (name, one-liner, icon, screens, App Store id, panel colour).
- `src/cards.mjs` — draws `site/cards/` with the Mac's own WebKit (Jarvis's snap tool). Rerun after `sync` when a name, colour or screen changes.
- `src/build.mjs` — renders everything into `docs/`, which GitHub Pages serves.

```
npm run sync      # refresh apps from Dashboards
npm run cards     # redraw the link previews
npm run build     # render docs/
npm run preview   # http://localhost:4488
```

Publishing is a push: GitHub Pages serves `docs/` on `main`.

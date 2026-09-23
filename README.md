# NorthLane Apps

The site at https://northlaneapps.dev: a home page, one page per app, and each app's privacy, support and terms pages.

- `site/site.json` — the studio's name, owner, email, tagline and about line.
- `site/overrides.json` — hand-written copy per app (always wins over what Dashboards has).
- `site/legal/<slug>.{privacy,support,terms}.md` — the legal pages. An app only appears once all three exist.
- `site/config/<slug>.json` — the app's remote config (maintenance message, kill switches), copied from Jarvis and served at `/<slug>/config.json`, where the app looks for it.
- `src/style.css` — the whole look; the values at the top restyle every page.
- `src/sync.mjs` — pulls apps from Jarvis's Dashboards (name, one-liner, icon, screens, App Store id, panel colour).
- `src/build.mjs` — renders everything into `docs/`, which GitHub Pages serves.

```
npm run sync      # refresh apps from Dashboards
npm run build     # render docs/
npm run preview   # http://localhost:4488
```

Publishing is a push: GitHub Pages serves `docs/` on `main`.

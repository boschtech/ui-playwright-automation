# Portfolio Site

A single-file static landing page that ties together the architecture docs, the three repos, the quality gates, and a recorded demo.

- Zero build step — plain HTML + CSS + one ES-module `<script>` that loads Mermaid from a CDN.
- Responsive, with automatic dark/light mode that follows `prefers-color-scheme`.
- Renders the C4 context diagram and the CI pipeline diagram inline via Mermaid.

## Preview locally

```bash
# from the repo root
cd docs/portfolio
python3 -m http.server 4000
# open http://localhost:4000
```

## Embed your demo recording

Open `index.html` and find the `<div class="demo">` block under `#demo`. Replace the placeholder with **one** of:

```html
<!-- Loom -->
<iframe src="https://www.loom.com/embed/YOUR_LOOM_ID" allowfullscreen></iframe>

<!-- YouTube -->
<iframe src="https://www.youtube.com/embed/YOUR_VIDEO_ID" allowfullscreen></iframe>

<!-- Self-hosted -->
<video controls poster="poster.jpg">
  <source src="demo.mp4" type="video/mp4" />
</video>
```

## Deploy options

### 1. GitHub Pages from `/docs`

Push this file on `main`, then in repo **Settings → Pages**, set:
- Source: `Deploy from a branch`
- Branch: `main`, folder: `/docs`

The site will appear at `https://<owner>.github.io/<repo>/portfolio/`.

> Note: the existing `gh-pages` branch in `ui-playwright-automation` serves the Playwright report via a different publish job — the two don't conflict.

### 2. Netlify / Vercel

Drag-and-drop the `portfolio/` folder. No build command required; the site is a single HTML file.

### 3. Render static site

Add a second entry to a `render.yaml`:

```yaml
- type: web
  runtime: static
  name: portfolio
  staticPublishPath: ./docs/portfolio
```

### 4. Any static host

`rsync docs/portfolio/ user@server:/var/www/portfolio/` — it's truly portable.

## Customising

- **Colours**: change the `:root` CSS variables at the top of `index.html`.
- **Links**: search for `boschtech` and update the GitHub / Render URLs.
- **Copy**: every section is in plain HTML — edit the `<h2>` / `<p>` blocks directly.
- **KPIs**: the four hero-stat tiles live in `<div class="kpis">`.

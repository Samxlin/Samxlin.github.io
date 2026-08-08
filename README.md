# Sam X. Lin — Luminous Field

Source for [samxlin.github.io](https://samxlin.github.io/), a static personal site built with Astro 7, TypeScript, Markdown/MDX, and Astro Content Collections. The site keeps the approved Luminous Field visual language and preserves the standalone Gomoku app at `/gomoku/`.

## Requirements

- Node.js 24 (see `.nvmrc`)
- pnpm 11.16.0 (pinned by `packageManager` in `package.json`)

Install and start the development server:

```powershell
git clone https://github.com/Samxlin/Samxlin.github.io.git
cd Samxlin.github.io
pnpm install --frozen-lockfile
pnpm dev
```

Open the local URL printed by Astro. Useful Astro routes include `/` and `/notes/`. Vite serves the standalone public app as `/gomoku/index.html` during development; the production build and GitHub Pages expose its intended `/gomoku/` URL.

Before opening a pull request or pushing `master`, run:

```powershell
pnpm check
pnpm build
pnpm preview
```

`dist/` is generated output and is not committed.

## Content authoring

Profile details and technical interests are centralized in `src/data/profile.ts`. Keep unknown personal details as explicit placeholders; do not invent employers, degrees, dates, publication claims, or contact URLs.

### Add a Technical Note

1. Create an `.md` or `.mdx` file under `src/content/notes/`. Its filename becomes the route slug.
2. Add frontmatter that satisfies the schema in `src/content.config.ts`.
3. Set `draft: true` while writing; only non-draft notes are published.
4. Use `.mdx` only when the note needs an Astro component. Markdown supports math, highlighted code, tables, figures, captions, blockquotes, references, and footnotes.
5. Run `pnpm check` and `pnpm build`, then inspect the note and `/notes/` locally.

Example:

```yaml
---
title: "Planar Transformer Stackup: MMF, Leakage Field and Electric Field"
description: "A field-oriented method for understanding multilayer PCB transformer winding arrangements."
date: 2026-08-08
category: "Power Magnetics"
tags:
  - Planar Transformer
  - PCB Winding
  - Leakage Inductance
type: "Deep Dive"
featured: true
draft: true
authors:
  - Sam X. Lin
references: []
visual: "transformer-stack"
---
```

Allowed categories, note types, and card visuals are defined by the collection schema; use those values rather than introducing near-duplicates. The current `visual` choices are `architecture-flow`, `transformer-stack`, `control-bandwidth`, and `zvs-orbit`. Public notes must remain first-principles or public-domain engineering discussion and must not include confidential specifications, customer data, internal schematics, unreleased products, or private test results.

### Add a publication

Add only verified metadata to the typed array in `src/data/publications.ts`:

```ts
{
  year: 2026,
  title: 'Verified publication title',
  authors: ['Author One', 'Sam X. Lin'],
  venue: 'Verified venue',
  selected: true,
  doi: 'https://doi.org/...',
  pdf: 'https://...',
  bibtex: 'https://...',
  code: 'https://...',
  note: 'Optional short context',
}
```

`volume`, `issue`, `pages`, DOI, PDF, BibTeX, code, and note are optional. Leave a field out when it is unavailable; do not publish guessed citation data.

## Gomoku

The existing no-build game is kept in `public/gomoku/`. Astro copies that directory unchanged to `dist/gomoku/`, so it remains available at `/gomoku/`. Its Supabase schema and RPC maintenance script are intentionally outside the public tree at `tools/supabase/gomoku.sql`.

See [docs/GOMOKU_MAINTENANCE.md](docs/GOMOKU_MAINTENANCE.md) before changing the game or its backend.

## Deployment

The repository is a GitHub user site, so Astro uses `site: 'https://samxlin.github.io'` with no project `base` path. A push to `master` runs `.github/workflows/deploy.yml`, which installs the locked pnpm dependencies, builds the static Astro site, uploads `dist/` as the Pages artifact, and deploys it.

One-time repository setup:

1. Open **Settings → Pages** in GitHub.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Push or manually run **Deploy to GitHub Pages** from the Actions tab.

Normal release:

```powershell
pnpm check
pnpm build
git status
git add .
git commit -m "Describe the site change"
git push origin master
```

After the workflow succeeds, verify `/`, `/notes/`, one note route, `/publications/`, `/contact/`, and `/gomoku/` on the production domain. Do not commit `dist/` or place operational SQL under `public/`.

## Directory structure

```text
.github/workflows/deploy.yml   GitHub Pages build and deployment
design-reference/              Approved prototype and screenshot (source only)
docs/                          Maintenance documentation
public/                        Files copied verbatim to the static build
  gomoku/                      Standalone Gomoku client
src/
  components/                  Reusable Astro UI and technical visuals
  content/notes/               Markdown and MDX Technical Notes
  data/                        Typed profile and publication data
  layouts/                     Site and note layouts
  pages/                       File-based routes
  scripts/                     Minimal browser-side TypeScript
  styles/                      Tokens, global styles, and article styles
  content.config.ts            Technical Notes collection schema
tools/supabase/gomoku.sql      Operational maintenance source; not deployed
astro.config.mjs               Static site, sitemap, MDX, and Markdown setup
```

## Backup and rollback

The pre-migration site is preserved by the pushed `legacy-site-before-astro` tag; `gomoku-stable-2026-06-12` is a second recovery point at the same legacy commit. Never delete or move these tags.

To inspect the legacy tree without rewriting `master`:

```powershell
git switch -c inspect-legacy legacy-site-before-astro
python -m http.server 8765 --bind 127.0.0.1
```

For a production rollback, create and push a dedicated recovery branch from the tag, review it, then temporarily configure Pages to deploy that branch from `/ (root)`. Prefer a reviewed restoration change over force-pushing or resetting `master`.

Migration details and file history are documented in `MIGRATION_PLAN.md`; the extracted visual system is documented in `DESIGN_NOTES.md`.

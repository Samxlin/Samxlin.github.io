# Astro migration plan

## 1. Current architecture

The `master` branch currently contains a deployed static snapshot rather than the
source of the original Hexo project. The root `index.html`, dated archive pages,
`css/`, `js/`, `lib/`, and most of `images/` are generated Hexo 3 / NexT 5.1.4
output. There is no Hexo configuration, theme source, package manifest, or
content-source directory to retain.

Two hand-maintained systems sit beside that generated snapshot:

- `gomoku/`: a standalone HTML/CSS/JavaScript Gomoku application. It supports
  local play and Supabase-backed anonymous multiplayer rooms.
- `supabase/gomoku.sql`: database schema, RLS policies, realtime publication,
  and RPC functions used by Gomoku.

The repository has one deployment branch, `master`. Before migration, GitHub
Pages publishes the branch contents directly. There was no Actions workflow.

The only legacy post is Hexo's default “Hello World” sample. It is not personal
content and should not be migrated into the technical-notes collection.

## 2. Legacy files to remove

After the backup point is verified, remove the generated Hexo/NexT output:

- root `index.html`
- `2018/`
- `archives/`
- `css/`
- `js/`
- `lib/`
- NexT placeholder assets under `images/`

The former `/2018/12/16/hello-world/` URL will become a small static redirect to
`/notes/`, preserving a useful response without carrying the old theme runtime.

Generated Astro output (`dist/`) and dependency directories are not committed.

## 3. Files to preserve

- The complete Git history.
- The `legacy-site-before-astro` annotated tag at legacy commit
  `b596a8e6ee8a309a307e306d12f177724ae0dcc5`.
- `design-reference/luminous-field.html` and
  `design-reference/luminous-field-preview.png` as non-deployed design sources.
- All three Gomoku client files, unchanged unless a path-only compatibility fix
  is required.
- The Supabase schema/RPC script and Gomoku maintenance knowledge.
- The existing public GitHub profile URL (`https://github.com/Samxlin`).

## 4. Files to move

| Current | Destination | Reason |
| --- | --- | --- |
| `gomoku/` | `public/gomoku/` | Astro copies it verbatim to `dist/gomoku/`. |
| `supabase/gomoku.sql` | `tools/supabase/gomoku.sql` | Keep maintenance SQL out of the public build. |
| `docs/MAINTENANCE.md` | `docs/GOMOKU_MAINTENANCE.md` | Make the document's scope explicit. |

The existing Gomoku Supabase publishable key remains client-side by design;
service-role or secret keys must never be added.

## 5. Gomoku migration strategy

1. Baseline-test the legacy page through a local HTTP server.
2. Confirm all local CSS/JS references are relative (`./style.css`,
   `./game.js`) and the Supabase client is loaded from its existing HTTPS CDN.
3. Move the directory intact to `public/gomoku/`; do not rewrite the game.
4. Confirm Astro copies the files byte-for-byte into `dist/gomoku/`.
5. Regression-test `/gomoku/` for lobby load, local play, canvas input, undo,
   query-string room links, resource requests, and critical console errors.
6. Treat live two-browser multiplayer as an external integration check. Do not
   alter the database schema unless a real regression requires it.

## 6. Supabase file handling

The SQL file is operational documentation, not a public asset. It moves to
`tools/supabase/` and is referenced from the Gomoku maintenance guide. Astro
must not copy `tools/` to `dist/`. The file remains manually applicable in the
Supabase SQL editor and no database mutation is part of this migration.

## 7. Astro structure

The new site will use Astro, TypeScript, Markdown/MDX, the current Content Layer
API, and static generation. No UI framework or animation library is required.

```text
.github/workflows/deploy.yml
public/
  favicon.svg
  robots.txt
  gomoku/
src/
  components/
    home/
    notes/
    visuals/
  content/notes/
  data/profile.ts
  data/publications.ts
  layouts/BaseLayout.astro
  layouts/NoteLayout.astro
  pages/
    index.astro
    about.astro
    notes/index.astro
    notes/[...slug].astro
    publications.astro
    contact.astro
  scripts/
  styles/
    tokens.css
    global.css
    technical.css
  content.config.ts
tools/supabase/gomoku.sql
```

Content schemas centralize note metadata and reject invalid frontmatter. Profile
and publication facts live in typed data modules so missing personal details can
remain explicit placeholders instead of being duplicated or invented.

## 8. Deployment strategy

- Build a static site for `https://samxlin.github.io` with no `base` path.
- Use consistent `trailingSlash: 'always'` URLs.
- Commit the package-manager lockfile.
- Deploy `master` through GitHub Actions using Astro's maintained Pages action
  and GitHub's official Pages deployment action.
- Keep `dist/` out of Git.
- Configure the repository's Pages source as **GitHub Actions**.
- Verify the completed workflow and production routes, including `/gomoku/`.

## 9. Rollback strategy

The immutable recovery point is the pushed `legacy-site-before-astro` tag. To
restore the legacy site, create a recovery branch from that tag and deploy that
branch or reset `master` to the tagged commit through a reviewed change. The
existing `gomoku-stable-2026-06-12` tag is a second Gomoku-specific recovery
point at the same legacy commit.

Do not delete either tag during or after migration.

## 10. Implementation phases

1. **Audit and design extraction** — repository inventory, backup tag,
   `MIGRATION_PLAN.md`, and `DESIGN_NOTES.md`.
2. **Astro foundation** — package setup, configuration, tokens, global shell,
   header, footer, SEO primitives, and responsive navigation.
3. **Homepage** — faithful Luminous Field hero, canvas field, technical
   diagrams, notes/publications previews, and closing contact panel.
4. **Content architecture** — notes collection, Markdown/MDX, math, code,
   figures, TOC, tags, related and adjacent notes.
5. **Secondary pages** — About, Publications, Contact, 404, robots, sitemap,
   and legacy sample-post redirect.
6. **Gomoku migration** — verbatim public asset move and regression checks.
7. **Deployment** — GitHub Actions, Pages source switch, push, and production
   verification.
8. **Quality pass** — production build, Astro checks, route/link checks,
   responsive visual comparison, accessibility basics, console review, and
   performance sanity checks.


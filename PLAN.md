# Personal IndieWeb Site — Initial Implementation

## Context

Greenfield build of a personal website that follows IndieWeb principles: identity owned on your domain, content marked up with microformats2 so machines can parse it, Micropub support so third-party clients (Quill) can publish posts, and POSSE so each post syndicates to Mastodon and Bluesky. The site is mostly static for speed, durability, and cost; only the Micropub endpoint is dynamic.

Aesthetic goal: mid-2000s MySpace / Web 2.0 — royal blue chrome, glossy buttons, rounded white content panels, drop shadows.

**Out of scope (deferred to a follow-up):** webmentions and websub.

## Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Static site generator | **Eleventy (11ty)** | Heavy IndieWeb community use; Nunjucks templates + markdown posts; no client JS by default |
| Hosting | **Cloudflare Pages** | Git-based deploys; Pages Functions available for the Micropub handler |
| Micropub endpoint | **Cloudflare Pages Function** | Small handler that verifies IndieAuth tokens and commits markdown via GitHub Contents API |
| IndieAuth | **Delegated to indieauth.com / tokens.indieauth.com** | `rel="authorization_endpoint"` + `rel="token_endpoint"` point at the shared service — no custom auth code |
| POSSE | **GitHub Action on push** | Detects new posts, posts to Mastodon + Bluesky APIs, writes `syndication` URLs back into frontmatter |
| Authoring | **Markdown-in-repo + Quill/Micropub** | Long-form as `.md` files; notes and replies via Quill |

## Site structure

- `/` — Home: h-card (name, avatar, short bio, rel=me links), latest 3–5 h-entries, a "Top 8"-style Web 2.0 sidebar panel
- `/blog/` — h-feed of posts, reverse chronological
- `/blog/{slug}/` — individual h-entry
- `/about/` — expanded h-card + bio
- `/contact/` — contact info + rel=me links

## IndieWeb markup

- **h-card** on `/` and `/about/`: p-name, u-photo, p-note, u-url, optional u-email, and rel="me" to GitHub + Mastodon
- **h-entry** on every post: p-name, e-content, dt-published, u-url, optional p-summary, u-syndication rendered from frontmatter
- **h-feed** wrapping entries on `/blog/`
- `<head>` includes:
  - `<link rel="authorization_endpoint" href="https://indieauth.com/auth">`
  - `<link rel="token_endpoint" href="https://tokens.indieauth.com/token">`
  - `<link rel="micropub" href="/api/micropub">`
  - `<link rel="me" href="https://github.com/...">` and Mastodon profile

## Micropub endpoint design

Single Cloudflare Pages Function at `functions/api/micropub.js`:

1. Accept `POST` (form-encoded + JSON) and `GET ?q=config|source`.
2. Read `Authorization: Bearer <token>` header.
3. Verify token by calling `GET https://tokens.indieauth.com/token` with it; confirm response `me` matches your domain.
4. Parse Micropub properties → construct Eleventy frontmatter (title, date, tags, categories, syndication placeholders) + markdown body.
5. Commit to the repo via GitHub Contents API (secret: `GITHUB_TOKEN`) at `src/blog/notes/{yyyy-mm-dd-hhmmss}-{slug}.md`.
6. Return `201 Created` with `Location` set to the post's eventual permalink.

Cloudflare Pages env secrets: `GITHUB_TOKEN`, `GITHUB_REPO`, `SITE_URL`, `TOKEN_ENDPOINT` (default `https://tokens.indieauth.com/token`).

## POSSE flow

`.github/workflows/posse.yml`, triggered on push to `main`:

1. Diff `HEAD` vs previous commit; find newly added files under `src/blog/` with no `syndication:` frontmatter.
2. For each, POST summary + permalink to:
   - **Mastodon**: `POST /api/v1/statuses` using `MASTODON_INSTANCE` + `MASTODON_TOKEN` secrets
   - **Bluesky**: `com.atproto.repo.createRecord` with `BSKY_HANDLE` + `BSKY_APP_PASSWORD` secrets
3. Write returned syndication URLs back into the post's frontmatter `syndication:` array.
4. Bot-commit the update; the next build renders `u-syndication` links automatically.

## Theme — MySpace blue + Web 2.0 gloss

- Primary chrome: `#003399` (MySpace royal blue) — header, nav background
- Chrome gradient accent: `#36648B`
- Accent/CTA: `#FF6600` (MySpace orange)
- Surface: `#FFFFFF` panels with soft drop shadow and 6–8px rounded corners
- Body text: `#333333` on white; Verdana / Tahoma / Arial stack for nostalgia
- Gloss recipe: top-to-middle lighter linear gradient, 1px top highlight border, soft drop shadow on panels and buttons
- Layout: fixed-width centered column (~960px); home page uses sidebar (h-card + Top 8) + main (recent entries), mirroring the classic MySpace profile layout

## Repo structure

```
/
├── .eleventy.js
├── package.json
├── src/
│   ├── _includes/
│   │   ├── layouts/
│   │   │   ├── base.njk          # head: rel=me, rel=micropub, theme CSS
│   │   │   ├── home.njk
│   │   │   └── post.njk          # h-entry wrapper
│   │   └── partials/
│   │       ├── h-card.njk
│   │       ├── nav.njk            # Home / Blog / About / Contact
│   │       └── footer.njk
│   ├── assets/
│   │   ├── css/theme.css          # MySpace blue + glossy Web 2.0
│   │   └── img/
│   ├── index.njk                  # Home
│   ├── blog/
│   │   ├── index.njk              # h-feed
│   │   └── *.md                   # posts with frontmatter
│   ├── about.njk
│   └── contact.njk
├── functions/
│   └── api/
│       └── micropub.js            # CF Pages Function
├── .github/workflows/posse.yml
└── _site/                         # build output, gitignored
```

## Critical files to create

- [.eleventy.js](.eleventy.js) — collections (blog), passthrough copy for assets, markdown plugin config, permalink rules
- [src/_includes/layouts/base.njk](src/_includes/layouts/base.njk) — rel=me, rel=authorization_endpoint, rel=token_endpoint, rel=micropub, theme CSS link
- [src/_includes/partials/h-card.njk](src/_includes/partials/h-card.njk) — shared h-card for home + about
- [src/_includes/layouts/post.njk](src/_includes/layouts/post.njk) — h-entry markup
- [src/assets/css/theme.css](src/assets/css/theme.css) — palette, gloss recipe, panel/button/nav styling
- [functions/api/micropub.js](functions/api/micropub.js) — token verification + GitHub commit
- [.github/workflows/posse.yml](.github/workflows/posse.yml) — Mastodon + Bluesky syndication

## Implementation phases

- [x] **Phase 1 — Scaffold**: `npm init`, install `@11ty/eleventy`, create base layouts, nav partial, the four pages (Home/Blog/About/Contact), one placeholder markdown post
  - Eleventy 3.1.5 installed; `.eleventy.js` (ESM) configured with `src` → `_site`, passthrough for `src/assets`, `posts` collection, `isoDate`/`readableDate` filters
  - Layouts: `src/_includes/layouts/{base,home,post}.njk`; partials: `src/_includes/partials/{nav,footer}.njk`
  - Pages: `src/index.njk`, `src/blog/index.njk`, `src/about.njk`, `src/contact.njk`; placeholder post at `src/blog/2026-04-18-hello-world.md`
  - Global data in `src/_data/site.js` (title, author, nav, relMe placeholders, endpoint URLs)
  - Placeholder `src/assets/css/theme.css` so build succeeds; real theme lands in Phase 2
  - `.gitignore` covers `node_modules/`, `_site/`, `.env*`
  - Verified: `npx @11ty/eleventy` writes 5 files; Home renders sidebar + Top 8 + latest posts; nav active state works; blog post permalink `/blog/hello-world/` resolves
- [x] **Phase 2 — Theme**: implement `theme.css` with MySpace blue + glossy components (buttons, panels, nav, sidebar boxes)
  - Palette wired: `#003399` primary, `#36648B`/`#002277` gradient accents, `#FF6600` CTA, `#FFCC00` highlight, `#E9ECF4` page background with subtle horizontal pinstripe
  - Chrome: glossy royal-blue site header with top highlight + deep-blue underline shadow; Trebuchet brand with text-shadow; matching footer with inverted palette
  - Nav: pill buttons with top-highlight gloss gradient; active state uses the orange CTA gradient; hover shifts to gold text (`#FFCC00`)
  - Panels: rounded 7px white surfaces with 1px border, soft drop shadow, inset top highlight; `.panel__title` is a dark-blue gradient strip with white text
  - Top 8: 2-column grid of numbered placeholder cells with subtle blue→white gloss and counter numerals in the corner
  - Post list: dotted separators, bold titles, right-aligned dates; single-post view styles `.post__header`/`.post__title`/`.post__date`/`.post__body` with image framing
  - Buttons & inputs: orange-gloss primary `.btn`/`button`, blue `.btn--secondary`, focus ring on form fields — ready for Phase 6 Micropub forms
  - Typography: Verdana/Tahoma/Arial stack, 13px base, classic underlined blue links (orange on hover, indigo for visited)
  - Verified: `npx @11ty/eleventy` rebuilds 5 files + CSS passthrough in 0.10s
- [x] **Phase 3 — mf2 markup**: add h-card partial, h-entry layout, h-feed on blog index; validate via pin13.net/mf2
  - New partial `src/_includes/partials/h-card.njk` — p-name, u-photo, p-note, u-url + rel=me on self-link; `compact` (sidebar) vs `full` (about) variants via `{% set hcardVariant = "full" %}`
  - `site.relMe` seeded with GitHub (`hopk8412`) + Mastodon placeholders so rel=me lists render; swap Mastodon URL when the real handle exists
  - Post layout now `<article class="post panel h-entry">` with `p-name` title, `dt-published` time, hidden `u-url` + `p-author h-card` self-ref, optional `p-summary`, `e-content` body, and `u-syndication` list when frontmatter has `syndication:`
  - Blog index wrapped as `section.panel.h-feed` (with `p-name` on title); each `<li>` is `.h-entry` with `p-name`, `u-url`, `dt-published`, hidden `p-author`
  - Home sidebar includes compact h-card; latest-posts panel is an h-feed with h-entry list items
  - About page uses `full` h-card variant (larger photo, email, rel=me button row); Contact page is `section.h-card` with prose intro + rel=me list styled as pill buttons
  - Filter fix: `readableDate` now passes `timeZone: "UTC"` so `date: 2026-04-18` renders "April 18, 2026" regardless of build host TZ
  - New CSS: `.h-card` grid (photo + body), framed photo with padding/shadow, rel=me pill-button row, `.post__summary` italic, `.post__footer` / `.syndication` list for future POSSE links
  - Verified: `npx @11ty/eleventy` clean build; grep of `_site` confirms h-card/h-entry/h-feed/p-name/e-content/dt-published/u-url/u-photo/p-note/p-author/rel=me on every intended page
  - Next: paste `https://<deployed-domain>/` and `/blog/hello-world/` into <https://pin13.net/mf2/> after Phase 5 deploy to confirm parser-level correctness
- [x] **Phase 4 — IndieAuth discovery**: wire base layout's `<head>` with rel=me (GitHub + Mastodon), rel=authorization_endpoint, rel=token_endpoint, rel=micropub
  - `src/_includes/layouts/base.njk` now emits four discovery `<link>` tags sourced from `site.endpoints` + `site.relMe`:
    - `<link rel="authorization_endpoint" href="https://indieauth.com/auth">`
    - `<link rel="token_endpoint" href="https://tokens.indieauth.com/token">`
    - `<link rel="micropub" href="/api/micropub">`
    - one `<link rel="me" href="…">` per entry in `site.relMe` (currently GitHub + Mastodon placeholders)
  - Body-level rel=me anchors from Phase 3 (h-card on `/`, `/about/`, `/contact/`) remain — parsers accept either location, and body links are what indielogin.com walks to confirm ownership
  - Mastodon rel=me URL is still a placeholder (`https://example.social/@greg`); swap for the real handle in `src/_data/site.js` before testing at <https://indielogin.com/>
  - Verified: built pages 1 + 2/3/4/5 all contain the four discovery links in `<head>`
  - Deferred until Phase 5 deploy: actually log in at <https://indielogin.com/> with the live domain; Mastodon profile must carry a matching rel=me back to the site for the loop to close
- [ ] **Phase 5 — Cloudflare Pages deploy**: point custom domain at CF, set build command `npm run build` with output `_site`
- [ ] **Phase 6 — Micropub function**: implement endpoint, configure secrets, test end-to-end with Quill
- [ ] **Phase 7 — POSSE action**: implement workflow, add Mastodon + Bluesky secrets, verify syndication and u-syndication rendering
- [ ] **Phase 8 — Polish**: favicon, OG tags, sitemap, RSS (Atom) feed

## Verification

- **Local dev**: `npx @11ty/eleventy --serve` — site renders at `http://localhost:8080`; all nav links work; theme applies on every page
- **mf2 validation**: paste deployed URLs into <https://pin13.net/mf2/>; confirm h-card on `/` and `/about/`, h-entry on posts, h-feed on `/blog/`
- **IndieAuth**: log in at <https://indielogin.com/> with your domain — both GitHub and Mastodon should appear as verified rel=me providers, and login should succeed
- **Micropub discovery**: run your domain through <https://micropub.rocks/> client tests — endpoint discovery and token verification pass
- **End-to-end Quill**: log into Quill with your domain, publish a test note; confirm commit to repo → CF build → post visible on site with h-entry markup → POSSE action fires → Mastodon + Bluesky posts appear → next build renders `u-syndication` links on the post
- **Visual**: compare home page against the MySpace-blue + Web 2.0 mockup direction — royal blue chrome, orange CTAs, glossy buttons, rounded white panels, sidebar/main layout on home

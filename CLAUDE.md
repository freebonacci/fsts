# From Seed to Shelter — build conventions

The HTML is the source of truth for copy. This file is the decisions that are
settled, so they do not get relitigated.

**No framework, no build step, no bundler, no package.json.** Six pages of plain
HTML, one stylesheet, one script. Editing a file changes the site; if you want a
preprocessor or a component system, the answer is no — the constraint is the
point. There is no server, so no forms and no includes: header, footer and the
`nav.js` tag are duplicated in all six pages by hand (`404.html` needs absolute
paths). Run `node tools/serve.js`, not `file://` — fonts silently fall back
otherwise. **Do not commit or push unless asked**; the repo is public.

**Email — there are no `mailto:` links on this site.** Every address is written
out as `hello [at] fromseedtoshelter [dot] com`, once per page, marked up
`.address` (or `.address .address--inline` mid-sentence). Never a `mailto:`, an
"email us" button, or a raw `name@domain` — not in the HTML, not in a `<meta>`
or `og:` tag. It is not harvestable from an `href`, and nobody lands on a dead
mail client on a shared machine.

**Design tokens** live in `:root` in `css/style.css`. Never hard-code a colour,
size or space value in a component — if a value is missing, add it to the scale.
Dark sections and the header re-point `--bg` / `--ink` / `--ink-muted` /
`--accent` / `--rule`, so components need no dark variant: write
`var(--accent)`, never `var(--radish)`, which measures 1.94:1 on slate and fails
WCAG AA. Jost for display, Spectral for body, sentence case everywhere. Corners
4px or square; no shadows, no gradients. Focus is `2px solid var(--accent)` and
is never removed. Responsive to 360px.

**The sticky header.** `js/nav.js` is the only script and is pure progressive
enhancement — it adds and removes `.site-header--hidden` and nothing else. With
JS off the bar is an ordinary sticky bar. Nothing is hidden by default; that is
why the nav wraps to a second row rather than becoming a hamburger. Under
`prefers-reduced-motion` it stays put, guarded in both `nav.js` and the CSS.
Keep both.

**The signature element.** `.panel` is used for both the results block and the
*Limitations* block on `work.html`, deliberately identically — same size, same
padding, same border, one directly beneath the other. Most organisations bury
their failures; equal visual weight is the one thing meant to make this site
memorable. Do not de-emphasise the limitations block: not smaller, not muted,
not moved to the end, not behind a toggle.

**Held back:** the six Samos team members are not named anywhere in the repo
until each confirms in writing. There is no photo-consent line in the footer.

**Budget:** under 500KB per page — partners open this on a phone on a poor
connection. Self-hosted fonts, no CDN, no analytics, no embeds, no cookie
banner. Images WebP with JPG fallback, max 1600px, 800px at half width.

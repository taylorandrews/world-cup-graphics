# CLAUDE.md

Context for Claude Code when working in this repo.

## What this is

A static, dependency-free web graphic that tracks the **2026 FIFA World Cup**
group stage. It renders three sections from a single source of truth:

1. **Full 48-team ranking** (top) — every team across all 12 groups, ranked by
   points → goal difference → goals scored.
2. **The 12 group boxes** (middle) — each is one table: a triangular
   head-to-head score matrix on the left, the standings on the right.
3. **Live bracket** (bottom) — a miniature color-map of the Round of 32 →
   Final as it would stand if the group stage ended now, including the eight
   best third-place teams placed via FIFA's official Annex C matrix.

Everything is computed live in the browser. There is no backend and no build
step required to view it — open `index.html` from a static server.

## The one rule that matters

**All results live in `src/data/fixtures.js`.** To update the graphic after
matches are played, add a `score:[home, away]` to the relevant match objects
and bump `AS_OF`. Standings, the ranking, head-to-head cells, third-place
qualification, and the bracket all recompute from that. Do not hand-edit any
standings or bracket output — it is all derived.

```js
{md:"Jun 24", h:"CZE", a:"MEX", score:[1,2]},  // played
{md:"Jun 24", h:"RSA", a:"KOR"},               // not yet played (no score)
```

## File map

```
index.html                       Page shell; loads CSS + src/js/main.js (ES module)
src/
  css/
    styles.css                   All styling. @imports _palette.generated.css first.
    _palette.generated.css       AUTO-GENERATED color vars — do not edit by hand.
  data/
    fixtures.js                  ← EDIT RESULTS HERE. Exports DATA + AS_OF.
    palette.js                   Source of truth for group colors. Exports PAL.
    third-place-map.js           FIFA Annex C matrix (495 rows). Exports THIRD_MAP.
  js/
    standings.js                 computeTable(), gd(). Pure functions, no DOM.
    groups.js                    renderGroups() — group boxes + h2h matrices.
    bracket.js                   R32/LATER schedule, third-place logic,
                                 renderFullRanking(), renderMiniBracket().
    main.js                      Entry point; wires the three render calls.
scripts/
  build-palette.mjs              Regenerates _palette.generated.css from palette.js.
  validate.mjs                   Sanity-checks fixtures + the Annex C matrix.
```

## Data model (`fixtures.js`)

`DATA` is an array of 12 group objects:

```js
{
  g: "A",                                  // group letter
  teams: { MEX:"Mexico", RSA:"South Africa", ... },  // code → display name
  tag: "USA's group",        // optional banner
  kcNote: "1× in KC",        // optional banner (Kansas City matches)
  matches: [
    { md:"Jun 11", h:"MEX", a:"RSA", score:[2,0], kc:true },
    ...
  ]
}
```

- `h` / `a` are home/away **team codes** (keys of `teams`).
- `score` omitted ⇒ fixture not yet played.
- `kc:true` marks a match in Kansas City (Arrowhead) — surfaced with a gold tag.

## How qualification + the bracket work

- Group standings: 3/1/0 points; tiebreak points → GD → goals scored → name.
  (FIFA's later tiebreakers — head-to-head, conduct/cards, FIFA ranking — are
  **not** modeled. Keep that caveat visible in the UI copy.)
- Top 2 of each group advance directly.
- The 12 third-place teams are ranked across groups; the **best 8** advance.
- Which third-place team goes to which R32 match is decided by
  `THIRD_MAP[key]`, where `key` is the 8 qualifying groups sorted
  alphabetically (e.g. `"ABCEFGHK"`). This is FIFA's published Annex C table,
  encoded in full. The slot order maps to matches
  `74, 77, 79, 80, 81, 82, 85, 87`.
- R32 → Final links live in `R32` and `LATER` in `bracket.js`. Match 87 (R32)
  and Match 100 (QF) are in Kansas City.

## Conventions

- Plain ES modules, no framework, no bundler, no npm runtime deps.
- Colors: edit `palette.js`, then run `npm run build:palette`. Never edit the
  `--gXY` / `--tXY` vars directly. `--gG0` = group G, finish 0 (winner, dark);
  `--gG3` = fourth place (faintest). `--tXY` is the readable text color on
  that background.
- After changing results, run `npm run validate` to catch typos
  (unknown team codes, duplicate matches, malformed scores).

## Portal deploy (required after any visual change)

This project is published to the **portal** — a Cloudflare Pages app at
`~/Documents/projects/coding-fun/portal` — so it's viewable on the phone.
**After committing any change to `src/` or `index.html`, always deploy to the
portal.** Do not skip this step or leave it for the user to do manually.

```bash
# 1. Build the self-contained output bundle (palette + validate + bundle)
npm run build

# 2. Sync into the portal repo
(cd ~/Documents/projects/coding-fun/portal && npm run sync)

# 3. Commit and push the portal (Cloudflare auto-deploys from main)
(cd ~/Documents/projects/coding-fun/portal && git add -A && git commit -m "Auto-deploy: <subject from this repo's commit>" && git push)
```

If the portal repo isn't present at that path, warn the user instead of
silently skipping. The portal route is
`/world-cup-26/live-tracker/index.html`.

## Local dev

```bash
npm run dev        # serve at http://localhost:8080 (ES modules need http://, not file://)
npm run validate   # check fixtures + Annex C matrix integrity
npm run build:palette   # regenerate color vars after editing palette.js
npm run build      # full build: palette + validate + portal bundle
```

## Provenance

Results were compiled from public reporting through the dates shown in
`AS_OF`. The Annex C third-place matrix follows FIFA's published 48-team
knockout allocation. When updating, verify scores against a primary source
before committing.

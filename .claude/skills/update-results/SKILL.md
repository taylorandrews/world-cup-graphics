---
name: update-results
description: >
  Use when the user wants to update the World Cup tracker with new match
  scores or results, refresh standings, or mark games as played — group stage
  or knockout rounds. Triggers include "update the tracker", "add the scores
  from <date>", "<TEAM> beat <TEAM>", "the group stage results are in",
  "fill in the knockouts", or any request to enter goals for matches. Handles
  editing src/data/fixtures.js (group stage) and src/data/knockout.js
  (Round of 32 onward), bumping AS_OF, validating, and confirming the graphic
  recomputes correctly.
---

# Update World Cup results

The entire graphic is derived from `src/data/fixtures.js` (group stage) and
`src/data/knockout.js` (Round of 32 onward). You never edit standings,
rankings, or the bracket directly — you only add scores to matches, and
everything else recomputes.

## Procedure

1. **Confirm the scores.** If the user pasted results, use those. If they said
   "add yesterday's games" or similar without scores, search a primary source
   (e.g. a major sports outlet or FIFA) and verify each scoreline before
   editing. Do not guess.

2. **Open `src/data/fixtures.js`.** Find each played match by its group, home
   (`h`) and away (`a`) team codes. Add a `score` array `[homeGoals,
   awayGoals]`:

   ```js
   // before
   {md:"Jun 24", h:"CZE", a:"MEX"},
   // after  (Czechia 1, Mexico 2)
   {md:"Jun 24", h:"CZE", a:"MEX", score:[1,2]},
   ```

   - The score order always follows `[h, a]` — home goals first.
   - Leave matches without a result untouched (no `score` key).
   - Team codes are the keys of that group's `teams` object. If the user gives
     a full name, map it to the code (e.g. "South Korea" → `KOR`).

3. **Bump `AS_OF`** at the top of the file to reflect the new cutoff, e.g.
   `export const AS_OF = "Updated June 25, 2026 — through June 24 matches";`

### Knockout rounds (Round of 32 onward)

Once a group's standings are set (or the whole group stage is done), R32
matchups become concrete — but recording who actually *won* a knockout game
happens in a separate file, `src/data/knockout.js`, keyed by FIFA match
number (see `R32`/`LATER` in `src/js/bracket.js` for the schedule and which
teams/venues map to which number):

```js
// knockout.js
82: {score:[3,2], aet:true},              // Belgium 3, Senegal 2 (AET)
74: {score:[1,1], aet:true, pens:[3,4]},  // level after ET, Paraguay wins on pens
```

- R32 `score` follows that match's home/away slot order in the `R32` array
  (e.g. Match 82 = Winner Group G vs. a 3rd-place team; Belgium is home).
- R16+ `score` is `[a, b]` — goals for the winner of the lower-numbered
  feeder match, then the higher one.
- Add `aet:true` for extra time, `pens:[x,y]` for a shootout when level.
- Figure out which match number a real-world result corresponds to by
  cross-referencing the venue and the two teams against the `R32`/`LATER`
  definitions — group winners/runners-up are fixed per group, and third-place
  slot assignments come from `THIRD_MAP` once the qualifying third-place
  groups are known (recompute standings first if unsure).
- A match left out of `RESULTS` renders as a pending "Winner M##" tile; adding
  a result automatically advances that team into the next round's card.

4. **Validate:** run `npm run validate`. Fix anything it flags (unknown codes,
   duplicate pairings, malformed scores) before continuing.

5. **Smoke-test the render** if possible: start `npm run dev` and confirm the
   page loads without console errors and the new scores appear in the relevant
   group's head-to-head matrix and standings.

6. **Commit** with a clear message, e.g.
   `git commit -am "Add June 24 results (matchday 3, Groups A–B)"`.

7. **Deploy to the portal.** This is mandatory — see the "Portal deploy"
   section in CLAUDE.md. Run `npm run build`, then sync and push the portal
   repo. Do not skip this or leave it for the user.

## Notes and gotchas

- **Don't touch** `_palette.generated.css`, standings output, or the bracket
  markup — all derived.
- **Tiebreakers:** the app sorts by points → goal difference → goals scored
  only. FIFA's head-to-head, conduct, and ranking tiebreakers are not modeled,
  so don't try to "correct" a standing order by hand — if it looks off, it's
  because those later tiebreakers aren't implemented, and that's intended +
  disclosed in the UI.
- **Third-place / bracket:** once all 12 third-place teams are decided, the
  best 8 and their R32 slots come from `THIRD_MAP` automatically. Never edit
  `third-place-map.js` — it's the fixed FIFA Annex C table.
- **Kansas City matches** carry `kc:true`; don't remove that flag.

## Quick reference: group → team codes

Read them from `src/data/fixtures.js` (the `teams` object per group) rather
than memory, since that's the authoritative mapping.

#!/usr/bin/env node
// Validates src/data/fixtures.js and src/data/third-place-map.js.
// Run:  npm run validate
//
// Catches the mistakes you actually make when editing results by hand:
//   - a team code in a match that isn't declared in that group's `teams`
//   - the same pairing entered twice
//   - a malformed score (not a 2-element array of non-negative integers)
//   - a group without exactly 4 teams / 6 matches
// Plus structural checks on the FIFA Annex C matrix.

import { DATA } from '../src/data/fixtures.js';
import { THIRD_MAP } from '../src/data/third-place-map.js';
import { RESULTS } from '../src/data/knockout.js';

let errors = 0;
let warnings = 0;
const err = (m) => { console.error('  ✗ ' + m); errors++; };
const warn = (m) => { console.warn('  ! ' + m); warnings++; };

console.log('Validating fixtures…');

const GROUP_LETTERS = new Set('ABCDEFGHIJKL'.split(''));

if (DATA.length !== 12) err(`expected 12 groups, found ${DATA.length}`);

const seenGroups = new Set();
for (const grp of DATA) {
  const tag = `Group ${grp.g}`;
  if (!GROUP_LETTERS.has(grp.g)) err(`${tag}: invalid group letter`);
  if (seenGroups.has(grp.g)) err(`duplicate group letter ${grp.g}`);
  seenGroups.add(grp.g);

  const codes = Object.keys(grp.teams || {});
  if (codes.length !== 4) err(`${tag}: expected 4 teams, found ${codes.length}`);

  if (!Array.isArray(grp.matches)) { err(`${tag}: matches is not an array`); continue; }
  if (grp.matches.length !== 6) {
    warn(`${tag}: expected 6 matches, found ${grp.matches.length}`);
  }

  const pairings = new Set();
  for (const m of grp.matches) {
    const label = `${tag} ${m.h || '?'} v ${m.a || '?'}`;
    if (!codes.includes(m.h)) err(`${label}: home code "${m.h}" not in this group`);
    if (!codes.includes(m.a)) err(`${label}: away code "${m.a}" not in this group`);
    if (m.h === m.a) err(`${label}: a team can't play itself`);

    // unordered pairing key to catch duplicates regardless of home/away
    const key = [m.h, m.a].sort().join('-');
    if (pairings.has(key)) err(`${label}: duplicate pairing`);
    pairings.add(key);

    if (m.score !== undefined && m.score !== null) {
      const s = m.score;
      const ok = Array.isArray(s) && s.length === 2 &&
        s.every(n => Number.isInteger(n) && n >= 0);
      if (!ok) err(`${label}: malformed score ${JSON.stringify(s)} (want [h,a] non-negative ints)`);
    }
  }

  // each of the 4 teams should appear in some matches; flag a team with none
  const appear = new Set();
  for (const m of grp.matches) { appear.add(m.h); appear.add(m.a); }
  for (const c of codes) if (!appear.has(c)) warn(`${tag}: ${c} appears in no match`);
}

console.log('Validating Annex C third-place matrix…');

const keys = Object.keys(THIRD_MAP);
if (keys.length !== 495) err(`THIRD_MAP should have 495 entries, has ${keys.length}`);

const SLOT_MATCHES = ['74', '77', '79', '80', '81', '82', '85', '87'];
for (const key of keys) {
  // key must be 8 distinct, sorted group letters
  const letters = key.split('');
  if (letters.length !== 8) { err(`THIRD_MAP key "${key}" is not length 8`); continue; }
  if ([...letters].sort().join('') !== key) err(`THIRD_MAP key "${key}" is not alphabetically sorted`);

  const map = THIRD_MAP[key];
  const slots = Object.keys(map);
  if (slots.length !== 8) err(`THIRD_MAP["${key}"] should map 8 slots, maps ${slots.length}`);
  for (const sm of SLOT_MATCHES) {
    if (!(sm in map)) { err(`THIRD_MAP["${key}"] missing match ${sm}`); continue; }
    const assigned = map[sm];
    // assigned group must be one of the 8 qualifying groups
    if (!key.includes(assigned)) err(`THIRD_MAP["${key}"] match ${sm} → group ${assigned} not in key`);
  }
  // every qualifying group used exactly once
  const used = Object.values(map).sort().join('');
  if (used !== key) err(`THIRD_MAP["${key}"] assigns ${used}, expected each of ${key} once`);
}

console.log('Validating knockout results…');

// FIFA match numbers for the R32 → Final bracket (see R32/LATER in bracket.js).
const KNOCKOUT_MATCHES = new Set([
  ...Array.from({length: 16}, (_, i) => 73 + i), // R32: 73-88
  ...Array.from({length: 8}, (_, i) => 89 + i),  // R16: 89-96
  97, 98, 99, 100,                               // QF
  101, 102,                                      // SF
  104,                                            // Final
]);

for (const [key, res] of Object.entries(RESULTS)) {
  const num = Number(key);
  const tag = `Match ${key}`;
  if (!KNOCKOUT_MATCHES.has(num)) err(`${tag}: not a valid knockout match number`);

  const s = res.score;
  const scoreOk = Array.isArray(s) && s.length === 2 && s.every(n => Number.isInteger(n) && n >= 0);
  if (!scoreOk) { err(`${tag}: malformed score ${JSON.stringify(s)} (want [x,y] non-negative ints)`); continue; }

  if (s[0] === s[1]) {
    const p = res.pens;
    const pensOk = Array.isArray(p) && p.length === 2 && p.every(n => Number.isInteger(n) && n >= 0) && p[0] !== p[1];
    if (!pensOk) err(`${tag}: scores level at ${s[0]}-${s[1]} but no valid decisive pens:[x,y]`);
  } else if (res.pens) {
    warn(`${tag}: has pens but the match wasn't level after the score recorded`);
  }
}

console.log('');
if (errors === 0 && warnings === 0) {
  console.log('✓ All checks passed.');
} else {
  console.log(`Done with ${errors} error(s), ${warnings} warning(s).`);
}
process.exit(errors > 0 ? 1 : 0);

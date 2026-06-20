#!/usr/bin/env node
/* Assemble a self-contained ./output bundle for the portal.
   The portal's sync copies the folder containing the entry HTML verbatim into
   its public/ dir, so the bundle must hold index.html plus every asset it
   references, all via relative paths (which the app already uses). This is a
   build artifact — gitignored — regenerated from the working source each build. */
import { rmSync, mkdirSync, cpSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "output");

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// Entry + all of src/ (css, js, data) — index.html references ./src/... already.
cpSync(join(root, "index.html"), join(out, "index.html"));
cpSync(join(root, "src"), join(out, "src"), { recursive: true });

console.log("✓ portal bundle written to output/ (index.html + src/)");

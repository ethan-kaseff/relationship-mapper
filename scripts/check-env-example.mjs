// Fails if any `process.env.X` reference in src/ or prisma/ isn't declared
// in .env.example. Run via `npm run check:env` or in CI.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["src", "prisma"];
const EXAMPLE = ".env.example";

// Vars provided by the runtime (Node, Vercel) — not expected in .env.example.
const RUNTIME_VARS = new Set([
  "NODE_ENV",
  "VERCEL",
  "VERCEL_ENV",
  "VERCEL_URL",
  "VERCEL_REGION",
  "VERCEL_GIT_COMMIT_SHA",
  "VERCEL_GIT_COMMIT_REF",
  "VERCEL_OIDC_TOKEN",
]);

const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "dist", "build"]);
const CODE_FILE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (CODE_FILE.test(name)) out.push(p);
  }
  return out;
}

const used = new Set();
for (const root of ROOTS) {
  for (const file of walk(root)) {
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(/process\.env\.([A-Z_][A-Z0-9_]*)/g)) {
      used.add(m[1]);
    }
  }
}

const declared = new Set();
for (const line of readFileSync(EXAMPLE, "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=/);
  if (m) declared.add(m[1]);
}

const missing = [...used]
  .filter((v) => !declared.has(v) && !RUNTIME_VARS.has(v))
  .sort();

if (missing.length > 0) {
  console.error(
    "\nEnv check failed. The following variables are referenced in code but not declared in .env.example:\n",
  );
  for (const v of missing) console.error(`  - ${v}`);
  console.error(
    "\nAdd each one to .env.example with a placeholder value and a short comment.",
  );
  console.error(
    "Then have Ethan add the real value to Vercel via `vercel env add <NAME>`.\n",
  );
  process.exit(1);
}

console.log(`Env check passed: ${used.size} referenced vars, all declared.`);

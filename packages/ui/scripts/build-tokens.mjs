// Generates src/tokens.css and src/tokens.ts from src/tokens.json.
// `node scripts/build-tokens.mjs --check` fails if the generated files are out of date.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const src = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const t = JSON.parse(readFileSync(join(src, 'tokens.json'), 'utf8'));
const decls = (o) => Object.entries(o).map(([k, v]) => `${k}:${v};`).join(' ');
const block = (sel, o) => `${sel} { ${decls(o)} }`;

const css = `/* GENERATED from tokens.json by scripts/build-tokens.mjs. Do not edit. */
${block(':root', t.default)}
${block('html.hc', t.highContrast)}
html.hc .card, html.hc .btn, html.hc .chip, html.hc input, html.hc select, html.hc textarea { border-color: #fff !important; }
${block('html.lg', t.largeText)}
/* Reduced motion: the in-app switch (html.rm) and the operating system setting. */
html.rm *, html.rm *::before, html.rm *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
}
`;
const { _source, ...modes } = t;
const ts = `// GENERATED from tokens.json by scripts/build-tokens.mjs. Do not edit.
export const tokens = ${JSON.stringify(modes, null, 2)} as const;
export type TokenMode = keyof typeof tokens;
`;

const out = { 'tokens.css': css, 'tokens.ts': ts };
const check = process.argv.includes('--check');
let bad = false;
for (const [f, body] of Object.entries(out)) {
  const p = join(src, f);
  if (check) {
    let cur = ''; try { cur = readFileSync(p, 'utf8'); } catch {}
    if (cur !== body) { console.error(`${f} is out of date. Run: pnpm --filter @hostpointe/ui build:tokens`); bad = true; }
  } else writeFileSync(p, body);
}
process.exit(bad ? 1 : 0);

/**
 * Copy pdf.js worker + CMap / font / wasm assets into public/pdfjs.
 * The converter loads them at runtime (static export has no bundler worker).
 */
import { cp, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const pkg = dirname(require.resolve("pdfjs-dist/package.json"));
const dest = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "pdfjs");

await mkdir(dest, { recursive: true });
await cp(join(pkg, "build", "pdf.worker.min.mjs"), join(dest, "pdf.worker.min.mjs"));
for (const dir of ["cmaps", "standard_fonts", "wasm", "iccs"]) {
  await cp(join(pkg, dir), join(dest, dir), { recursive: true });
}

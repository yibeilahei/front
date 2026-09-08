# lazahata

Static site for the **lazahata** project. The homepage is an in-browser
EPUB/TXT/MOBI/FB2/PDF → `.xtch` converter. Firmware and **Cookbook** (a macOS
app) have their own pages.

- Converter: `/`
- Firmware: `/firmware/` — https://github.com/yibeilahei/lazahata
- Cookbook: `/cookbook/` — https://github.com/yibeilahei/cookbook

This Next.js app **exports a static site** — no server, no uploads. The
converter runs entirely in the browser.

## Develop

```bash
npm install
npm run dev
```

Open http://localhost:3000

```bash
npm test
```

## Build a static site

```bash
npm run build
```

Output is written to `out/`. Preview it with:

```bash
npm start
```

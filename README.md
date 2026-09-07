# lazahata

Static site for the **lazahata** project: open-source XTCH reader
firmware for Xteink X3/X4 e-readers, **cookbook**, a macOS app that
converts ebooks/PDFs into `.xtch` or panel-sized PDFs, and an
in-browser converter at `/convert/`.

- Firmware: https://github.com/yibeilahei/lazahata
- Cookbook: https://github.com/yibeilahei/cookbook
- Web converter: `/convert/` (this repo)

This Next.js app **exports a static site** — no server, no uploads.
The homepage is static; `/convert/` runs entirely in the browser.

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

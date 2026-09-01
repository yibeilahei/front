# lazahata

Static homepage for the **lazahata** project: open-source XTCH reader
firmware for Xteink X3/X4 e-readers, and **cookbook**, a desktop app that
converts ebooks/PDFs into `.xtch` or panel-sized PDFs.

- Firmware: https://github.com/yibeilahei/lazahata
- Cookbook: https://github.com/yibeilahei/cookbook

This Next.js app **exports a static site** — no server, no client logic
beyond links.

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

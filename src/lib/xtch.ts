/**
 * XTCH container + XTH page encoding.
 * Matches the CROSS-Point / FilesPage on-device format:
 * 2-bit grayscale, vertical scan, columns right-to-left.
 *
 * Optional per-page raw DEFLATE (RFC 1951, no zlib/gzip wrapper) via fflate
 * — matches the "puff" inflate vendored into lazahata firmware
 * (lib/Xtch/puff.c). Off by default: stock CrossPoint firmware cannot
 * inflate compressed pages. When on, falls back to raw if compression
 * doesn't shrink the page. fflate is used (over CompressionStream) because
 * its sync API skips stream plumbing, which is pure overhead for a
 * page-sized buffer.
 */

import { deflateSync, inflateSync } from "fflate";

const XTH_LEVEL = {
  WHITE: 0b00,
  LIGHT: 0b10,
  DARK: 0b01,
  BLACK: 0b11,
} as const;

/** Same 4-level bins as Cookbook (`>=192 / >=128 / >=64`). */
function grayToXthLevel(gray: number): number {
  if (gray >= 192) return XTH_LEVEL.WHITE;
  if (gray >= 128) return XTH_LEVEL.LIGHT;
  if (gray >= 64) return XTH_LEVEL.DARK;
  return XTH_LEVEL.BLACK;
}

// Precomputed per-gray-value bit contributions (0-255), so the hot pixel
// loop below is two typed-array reads instead of a branchy function call.
const LEVEL_BIT0 = new Uint8Array(256);
const LEVEL_BIT1 = new Uint8Array(256);
for (let gray = 0; gray < 256; gray++) {
  const level = grayToXthLevel(gray);
  LEVEL_BIT0[gray] = level & 0b01;
  LEVEL_BIT1[gray] = (level >> 1) & 0b01;
}

function deflateRaw(data: Uint8Array): Uint8Array {
  return deflateSync(data);
}

function inflateRaw(data: Uint8Array): Uint8Array {
  return inflateSync(data);
}

export async function encodeXthPage(
  data: ArrayLike<number>,
  width: number,
  height: number,
  opts?: { compress?: boolean },
): Promise<Uint8Array> {
  const colBytes = Math.ceil(height / 8);
  const plane0 = new Uint8Array(colBytes * width);
  const plane1 = new Uint8Array(colBytes * width);

  // Pack 8 rows (one output byte) at a time: avoids a Math.floor/modulo per
  // pixel and turns the 8 single-bit writes into two register-held
  // accumulators (b0/b1) that only touch memory once per byte.
  for (let x = width - 1; x >= 0; x--) {
    const colBase = (width - 1 - x) * colBytes;
    for (let byteRow = 0; byteRow < colBytes; byteRow++) {
      const yBase = byteRow * 8;
      const rows = Math.min(8, height - yBase);
      let b0 = 0;
      let b1 = 0;
      for (let bit = 0; bit < rows; bit++) {
        const gray = data[((yBase + bit) * width + x) * 4];
        const bitIdx = 7 - bit;
        b0 |= LEVEL_BIT0[gray] << bitIdx;
        b1 |= LEVEL_BIT1[gray] << bitIdx;
      }
      plane0[colBase + byteRow] = b0;
      plane1[colBase + byteRow] = b1;
    }
  }

  const raw = new Uint8Array(plane0.length + plane1.length);
  raw.set(plane0, 0);
  raw.set(plane1, plane0.length);

  let body: Uint8Array = raw;
  let compression = 0;
  if (opts?.compress) {
    try {
      const compressed = deflateRaw(raw);
      if (compressed.length < raw.length) {
        body = compressed;
        compression = 1;
      }
    } catch {
      // Compression unavailable or failed; fall back to storing raw bytes.
    }
  }

  const header = new Uint8Array(22);
  const view = new DataView(header.buffer);
  header[0] = 0x58;
  header[1] = 0x54;
  header[2] = 0x48;
  header[3] = 0x00;
  view.setUint16(4, width, true);
  view.setUint16(6, height, true);
  header[8] = 0; // colorMode
  header[9] = compression;
  // dataSize is the on-disk body length (compressed or raw); the decoded
  // length is always derivable from width/height, so it isn't stored here.
  view.setUint32(10, body.length, true);

  const result = new Uint8Array(header.length + body.length);
  result.set(header, 0);
  result.set(body, header.length);
  return result;
}

function writeCString(bytes: Uint8Array, offset: number, text: string, maxBytes: number) {
  const encoded = new TextEncoder().encode(String(text || ""));
  const n = Math.min(encoded.length, maxBytes);
  bytes.set(encoded.subarray(0, n), offset);
  bytes[offset + maxBytes] = 0;
}

export function buildXtchContainer(
  pages: Uint8Array[],
  width: number,
  height: number,
  info: { title?: string; author?: string; authors?: string },
  toc: Array<{ title?: string; name?: string; page?: number; startPage?: number }>,
): Uint8Array {
  const magic = "XTCH";
  const title = String(info.title || "");
  const author = String(info.author || info.authors || "");
  const chapters = Array.isArray(toc) ? toc : [];

  const headerSize = 56;
  const metadataSize = 256;
  const chapterEntrySize = 96;
  const indexEntrySize = 16;
  const chaptersSize = chapters.length * chapterEntrySize;
  const indexSize = pages.length * indexEntrySize;

  const metadataOffset = headerSize;
  const chapterOffset = metadataOffset + metadataSize;
  const indexOffset = chapterOffset + chaptersSize;
  const pageDataOffset = indexOffset + indexSize;

  const pageOffsets: { offset: number; size: number }[] = [];
  let cursor = pageDataOffset;
  for (let i = 0; i < pages.length; i++) {
    pageOffsets.push({ offset: cursor, size: pages[i].length });
    cursor += pages[i].length;
  }

  const buffer = new ArrayBuffer(cursor);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  for (let i = 0; i < 4; i++) bytes[i] = magic.charCodeAt(i);
  view.setUint16(4, 1, true);
  view.setUint16(6, pages.length, true);
  bytes[8] = 0;
  bytes[9] = 1;
  bytes[10] = 0;
  bytes[11] = chapters.length > 0 ? 1 : 0;
  view.setUint32(12, 1, true);
  view.setBigUint64(16, BigInt(metadataOffset), true);
  view.setBigUint64(24, BigInt(indexOffset), true);
  view.setBigUint64(32, BigInt(pageDataOffset), true);
  view.setBigUint64(40, BigInt(0), true);
  view.setBigUint64(48, BigInt(chapterOffset), true);

  writeCString(bytes, metadataOffset, title, 126);
  writeCString(bytes, metadataOffset + 128, author, 62);
  view.setUint32(metadataOffset + 192, Math.floor(Date.now() / 1000), true);
  view.setUint16(metadataOffset + 196, chapters.length, true);

  let chapterPos = chapterOffset;
  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    if (ch) {
      const chTitle = String(ch.title || ch.name || "Chapter " + (i + 1));
      const chPage = ch.page || ch.startPage || 0;
      writeCString(bytes, chapterPos, chTitle, 78);
      view.setUint16(chapterPos + 80, chPage + 1, true);
      view.setUint16(chapterPos + 82, chPage + 1, true);
    }
    chapterPos += chapterEntrySize;
  }

  let indexPos = indexOffset;
  for (let i = 0; i < pages.length; i++) {
    view.setBigUint64(indexPos, BigInt(pageOffsets[i].offset), true);
    view.setUint32(indexPos + 8, pageOffsets[i].size, true);
    view.setUint16(indexPos + 12, width, true);
    view.setUint16(indexPos + 14, height, true);
    indexPos += indexEntrySize;
  }

  let dataPos = pageDataOffset;
  for (let i = 0; i < pages.length; i++) {
    bytes.set(pages[i], dataPos);
    dataPos += pages[i].length;
  }

  return bytes;
}

export function outputNameFromSource(filename: string, title: string): string {
  const base = filename.replace(/\.[^.]+$/, "");
  const raw = title && title.trim() ? title.trim() : base;
  const safe = raw.replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim();
  return (safe || base || "book") + ".xtch";
}

function readCString(bytes: Uint8Array, offset: number, maxChars: number): string {
  const end = Math.min(bytes.length, offset + maxChars);
  let last = offset;
  while (last < end && bytes[last] !== 0) last++;
  return new TextDecoder().decode(bytes.subarray(offset, last));
}

export type XtchBook = {
  width: number;
  height: number;
  pageCount: number;
  title: string;
  author: string;
  readDirection: number;
  pages: Uint8Array[];
};

export function parseXtch(bytes: Uint8Array): XtchBook {
  const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  if (magic !== "XTCH") throw new Error("Not an XTCH file");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const pageCount = view.getUint16(6, true);
  const readDirection = bytes[8];
  const metadataOffset = Number(view.getBigUint64(16, true));
  const indexOffset = Number(view.getBigUint64(24, true));
  const title = readCString(bytes, metadataOffset, 126);
  const author = readCString(bytes, metadataOffset + 128, 62);
  const pages: Uint8Array[] = [];
  let width = 0;
  let height = 0;
  for (let i = 0; i < pageCount; i++) {
    const pos = indexOffset + i * 16;
    const offset = Number(view.getBigUint64(pos, true));
    const size = view.getUint32(pos + 8, true);
    width = view.getUint16(pos + 12, true);
    height = view.getUint16(pos + 14, true);
    pages.push(bytes.subarray(offset, offset + size));
  }
  return { width, height, pageCount, title, author, readDirection, pages };
}

const XTH_GRAY = [255, 85, 170, 0];

export async function decodeXthPage(page: Uint8Array): Promise<{
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
}> {
  if (page[0] !== 0x58 || page[2] !== 0x48) throw new Error("Not an XTH page");
  const view = new DataView(page.buffer, page.byteOffset, page.byteLength);
  const width = view.getUint16(4, true);
  const height = view.getUint16(6, true);
  const compression = page[9];
  const dataSize = view.getUint32(10, true);
  const colBytes = Math.ceil(height / 8);
  const bitmapSize = colBytes * width * 2;
  const body = page.subarray(22, 22 + dataSize);
  const raw = compression === 1 ? inflateRaw(new Uint8Array(body)) : body;
  if (raw.length !== bitmapSize) {
    throw new Error(`XTH page decoded to ${raw.length} bytes, expected ${bitmapSize}`);
  }
  const plane0 = raw.subarray(0, colBytes * width);
  const plane1 = raw.subarray(colBytes * width);
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let x = width - 1; x >= 0; x--) {
    const colIdx = width - 1 - x;
    for (let y = 0; y < height; y++) {
      const byteIdx = colIdx * colBytes + Math.floor(y / 8);
      const bitIdx = 7 - (y % 8);
      const level =
        (((plane1[byteIdx] >> bitIdx) & 1) << 1) | ((plane0[byteIdx] >> bitIdx) & 1);
      const g = XTH_GRAY[level];
      const i = (y * width + x) * 4;
      rgba[i] = g;
      rgba[i + 1] = g;
      rgba[i + 2] = g;
      rgba[i + 3] = 255;
    }
  }
  return { width, height, rgba };
}


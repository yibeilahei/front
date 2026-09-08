import { encodeXthPage, buildXtchContainer, outputNameFromSource, parseXtch, decodeXthPage } from '../src/lib/xtch.ts';
import assert from 'node:assert/strict';

function rgbaFill(width, height, gray) {
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = gray;
    data[i * 4 + 1] = gray;
    data[i * 4 + 2] = gray;
    data[i * 4 + 3] = 255;
  }
  return data;
}

function rgbaNoise(width, height) {
  // True random fill (crypto): high-entropy, exercises the "compression
  // didn't help, keep raw" fallback path (a deterministic PRNG can leave
  // enough bit-level structure after 2-bit quantization to still compress).
  const data = new Uint8Array(width * height * 4);
  const grays = new Uint8Array(width * height);
  // getRandomValues caps at 65536 bytes per call.
  for (let off = 0; off < grays.length; off += 65536) {
    crypto.getRandomValues(grays.subarray(off, Math.min(off + 65536, grays.length)));
  }
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = grays[i];
    data[i * 4 + 1] = grays[i];
    data[i * 4 + 2] = grays[i];
    data[i * 4 + 3] = 255;
  }
  return data;
}

const width = 16;
const height = 16;
const colBytes = Math.ceil(height / 8);
const bitmapSize = colBytes * width * 2;
const page = await encodeXthPage(rgbaFill(width, height, 255), width, height);

assert.equal(page[0], 0x58);
assert.equal(page[1], 0x54);
assert.equal(page[2], 0x48);
assert.equal(page[3], 0x00);
assert.equal(page[8], 0, 'colorMode byte');
assert.equal(page[9], 0, 'compression is off by default');

const pageView = new DataView(page.buffer, page.byteOffset, page.byteLength);
assert.equal(pageView.getUint16(4, true), width);
assert.equal(pageView.getUint16(6, true), height);
const dataSize = pageView.getUint32(10, true);
assert.equal(page.length, 22 + dataSize);
assert.equal(dataSize, bitmapSize);

const compressedWhite = await encodeXthPage(rgbaFill(width, height, 255), width, height, {
  compress: true,
});
assert.equal(compressedWhite[9], 1, 'solid white page should compress when asked');
const compressedSize = new DataView(
  compressedWhite.buffer,
  compressedWhite.byteOffset,
  compressedWhite.byteLength,
).getUint32(10, true);
assert.ok(compressedSize < bitmapSize, 'compressed body should be smaller than raw');
const compressedDecoded = await decodeXthPage(compressedWhite);
assert.ok(
  compressedDecoded.rgba.every((v, i) => (i % 4 === 3 ? v === 255 : v === 255)),
  'compressed white round-trip',
);

// Round-trip: decode should reproduce the original all-white page regardless
// of whether compression was actually used on disk.
const whiteDecoded = await decodeXthPage(page);
assert.equal(whiteDecoded.width, width);
assert.equal(whiteDecoded.height, height);
assert.ok(whiteDecoded.rgba.every((v, i) => (i % 4 === 3 ? v === 255 : v === 255)), 'white round-trip');

const black = await encodeXthPage(rgbaFill(width, height, 0), width, height);
const blackDecoded = await decodeXthPage(black);
assert.ok(blackDecoded.rgba.every((v, i) => (i % 4 === 3 ? v === 255 : v === 0)), 'black round-trip');

async function quantizedGray(gray) {
  const page = await encodeXthPage(rgbaFill(8, 8, gray), 8, 8);
  return (await decodeXthPage(page)).rgba[0];
}
assert.equal(await quantizedGray(255), 255);
assert.equal(await quantizedGray(192), 255, 'Cookbook white bin includes 192');
assert.equal(await quantizedGray(191), 170);
assert.equal(await quantizedGray(128), 170, 'Cookbook light bin includes 128');
assert.equal(await quantizedGray(127), 85);
assert.equal(await quantizedGray(64), 85, 'Cookbook dark bin includes 64');
assert.equal(await quantizedGray(63), 0);

// Incompressible content should fall back to raw storage (compression=0)
// rather than let deflate overhead make the page bigger. Use a larger page
// so quantization noise doesn't accidentally leave compressible structure.
const noiseWidth = 528;
const noiseHeight = 792;
const noiseColBytes = Math.ceil(noiseHeight / 8);
const noiseBitmapSize = noiseColBytes * noiseWidth * 2;
const noisePage = await encodeXthPage(rgbaNoise(noiseWidth, noiseHeight), noiseWidth, noiseHeight, {
  compress: true,
});
const noiseView = new DataView(noisePage.buffer, noisePage.byteOffset, noisePage.byteLength);
assert.equal(noisePage[9], 0, 'noisy page should fall back to raw storage');
assert.equal(noiseView.getUint32(10, true), noiseBitmapSize);
const noiseDecoded = await decodeXthPage(noisePage);
assert.equal(noiseDecoded.width, noiseWidth);
assert.equal(noiseDecoded.height, noiseHeight);

// A larger, highly-compressible page (closer to real device dimensions)
// should compress substantially.
const bigWidth = 528;
const bigHeight = 792;
const bigPage = await encodeXthPage(rgbaFill(bigWidth, bigHeight, 255), bigWidth, bigHeight, {
  compress: true,
});
const bigColBytes = Math.ceil(bigHeight / 8);
const bigBitmapSize = bigColBytes * bigWidth * 2;
assert.equal(bigPage[9], 1, 'large solid page should compress');
const bigDataSize = new DataView(bigPage.buffer, bigPage.byteOffset, bigPage.byteLength).getUint32(10, true);
assert.ok(bigDataSize < bigBitmapSize * 0.1, 'solid page should compress to well under 10% of raw size');
const bigDecoded = await decodeXthPage(bigPage);
assert.ok(bigDecoded.rgba.every((v, i) => (i % 4 === 3 ? v === 255 : v === 255)), 'large white round-trip');

const container = buildXtchContainer(
  [page],
  width,
  height,
  { title: 'Test Book', author: 'Ada' },
  [{ title: 'Chapter One', page: 0 }],
);

assert.equal(String.fromCharCode(...container.subarray(0, 4)), 'XTCH');
const view = new DataView(container.buffer, container.byteOffset, container.byteLength);
assert.equal(view.getUint16(4, true), 1);
assert.equal(view.getUint16(6, true), 1);
assert.equal(container[8], 0);
assert.equal(container[9], 1);
assert.equal(container[11], 1);

const decoder = new TextDecoder();
assert.equal(decoder.decode(container.subarray(56, 56 + 9)), 'Test Book');
assert.equal(decoder.decode(container.subarray(56 + 128, 56 + 131)), 'Ada');

const indexOffset = Number(view.getBigUint64(24, true));
const dataOffset = Number(view.getBigUint64(32, true));
assert.equal(view.getUint32(indexOffset + 8, true), page.length);
assert.equal(view.getUint16(indexOffset + 12, true), width);
assert.equal(view.getUint16(indexOffset + 14, true), height);
assert.deepEqual(container.subarray(dataOffset, dataOffset + page.length), page);

assert.equal(outputNameFromSource('Moby Dick.epub', ''), 'Moby Dick.xtch');
assert.equal(outputNameFromSource('book.epub', 'Title: A/B'), 'Title A B.xtch');

const parsed = parseXtch(container);
assert.equal(parsed.pageCount, 1);
assert.equal(parsed.title, 'Test Book');
assert.equal(parsed.author, 'Ada');
assert.equal(parsed.width, width);
assert.equal(parsed.height, height);
const decoded = await decodeXthPage(parsed.pages[0]);
assert.equal(decoded.width, width);
assert.equal(decoded.height, height);
assert.ok(decoded.rgba.every((v, i) => (i % 4 === 3 ? v === 255 : v === 255)), 'white round-trip via container');

const longTitle = "あ".repeat(80);
const overflow = buildXtchContainer(
  [page],
  width,
  height,
  { title: longTitle, author: "Ada" },
  [],
);
assert.equal(overflow[56 + 126], 0);
assert.equal(decoder.decode(overflow.subarray(56 + 128, 56 + 131)), "Ada");
const overflowParsed = parseXtch(overflow);
assert.ok(overflowParsed.title.length > 0);
assert.equal(overflowParsed.author, "Ada");

console.log('xtch encoder tests passed');

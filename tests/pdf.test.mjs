import assert from "node:assert/strict";
import { fitRect, isPdfMagic, sniffPdf, toGrayscale } from "../src/lib/adapters/pdf.ts";
import { axisFromSample } from "../src/lib/detectVertical.ts";

{
  const file = new File([new TextEncoder().encode("%PDF-1.4\n")], "a.pdf");
  assert.equal(await isPdfMagic(file), true);
  const sniff = await sniffPdf(file);
  assert.equal(sniff.markup, "");
  assert.equal(axisFromSample(sniff.markup), "horizontal");
}
{
  const prefix = new Uint8Array([0x00, 0x00, ...new TextEncoder().encode("%PDF-1.7")]);
  const file = new File([prefix], "garbage.bin");
  assert.equal(await isPdfMagic(file), true);
}
{
  const file = new File([new TextEncoder().encode("hello")], "a.txt");
  assert.equal(await isPdfMagic(file), false);
}

{
  const same = fitRect(480, 800, 480, 800);
  assert.deepEqual(same, { width: 480, height: 800, x: 0, y: 0 });
}
{
  // Landscape page on a portrait panel: pad top/bottom.
  const r = fitRect(800, 400, 480, 800);
  assert.equal(r.width, 480);
  assert.equal(r.height, 240);
  assert.equal(r.x, 0);
  assert.equal(r.y, 280);
}
{
  // Taller/narrower page: pad left/right.
  const r = fitRect(400, 800, 480, 800);
  assert.equal(r.width, 400);
  assert.equal(r.height, 800);
  assert.equal(r.x, 40);
  assert.equal(r.y, 0);
}

{
  const red = new Uint8ClampedArray([255, 0, 0, 255]);
  toGrayscale(red);
  assert.equal(red[0], 76);
  assert.equal(red[1], 76);
  assert.equal(red[2], 76);
  assert.equal(red[3], 255);
}
{
  const clear = new Uint8ClampedArray([0, 0, 0, 0]);
  toGrayscale(clear);
  assert.equal(clear[0], 255);
  assert.equal(clear[3], 255);
}

console.log("pdf tests passed");

import assert from "node:assert/strict";
import { crc32 } from "node:zlib";
import { restartChip } from "../src/lib/flash/restart.ts";
import { otadataFromHeads, readStubFlash } from "../src/lib/flash/stubRead.ts";
import {
  activeBoot,
  assertFirmwareImage,
  crc32 as crc32Le,
  encodeOtaSector,
  encodePartitionEntry,
  FlashError,
  otaLayout,
  parsePartitionTable,
  planFlash,
  slotForSequence,
  writeU32,
} from "../src/lib/flash/plan.ts";

const hello = Buffer.from("123456789");
assert.equal(crc32Le(hello), crc32(hello) >>> 0);
assert.equal(crc32Le(hello), 0xcbf43926);

const seq = new Uint8Array(4);
writeU32(seq, 0, 1);
assert.equal(crc32Le(seq), crc32(seq) >>> 0);

assert.equal(slotForSequence(1, 2), 0);
assert.equal(slotForSequence(2, 2), 1);
assert.equal(slotForSequence(3, 2), 0);
assert.equal(slotForSequence(4, 2), 1);

function blankOtadata() {
  const data = new Uint8Array(0x2000);
  data.fill(0xff);
  return data;
}

function install(data, sector, sequence) {
  data.set(encodeOtaSector(sequence), sector * 0x1000);
}

const fresh = blankOtadata();
const first = planFlash(fresh, 2);
assert.deepEqual(first, { targetSlot: 1, sector: 0, sequence: 2 });
install(fresh, first.sector, first.sequence);
assert.deepEqual(activeBoot(fresh, 2), { slot: 1, sequence: 2, copy: 0 });

const second = planFlash(fresh, 2);
assert.equal(second.targetSlot, 0);
assert.equal(slotForSequence(second.sequence, 2), 0);
assert.equal(second.sequence, 3);
assert.equal(second.sector, 1);
install(fresh, second.sector, second.sequence);
assert.equal(activeBoot(fresh, 2)?.slot, 0);
assert.equal(activeBoot(fresh, 2)?.sequence, 3);

// A valid entry in sector 1 still boots slot 0 when its sequence says so.
const shifted = blankOtadata();
install(shifted, 1, 1);
assert.equal(activeBoot(shifted, 2)?.slot, 0);
assert.equal(activeBoot(shifted, 2)?.copy, 1);
const ontoApp1 = planFlash(shifted, 2);
assert.equal(ontoApp1.targetSlot, 1);
assert.equal(ontoApp1.sector, 0);
assert.equal(slotForSequence(ontoApp1.sequence, 2), 1);

// Invalid and aborted selections are ignored. The lower good sequence remains.
const skipped = blankOtadata();
install(skipped, 0, 2);
const aborted = encodeOtaSector(4);
writeU32(aborted, 0x18, 4);
skipped.set(aborted, 0x1000);
assert.equal(activeBoot(skipped, 2)?.sequence, 2);
assert.equal(activeBoot(skipped, 2)?.slot, 1);

const crossxtch = [
  { type: 0x01, subtype: 0x02, offset: 0x9000, size: 0x5000, label: "nvs" },
  { type: 0x01, subtype: 0x00, offset: 0xe000, size: 0x2000, label: "otadata" },
  { type: 0x00, subtype: 0x10, offset: 0x10000, size: 0x640000, label: "app0" },
  { type: 0x00, subtype: 0x11, offset: 0x650000, size: 0x640000, label: "app1" },
  { type: 0x01, subtype: 0x82, offset: 0xc90000, size: 0x360000, label: "spiffs" },
  { type: 0x01, subtype: 0x03, offset: 0xff0000, size: 0x10000, label: "coredump" },
];
const table = new Uint8Array(0x1000);
table.fill(0xff);
crossxtch.forEach((part, index) => {
  table.set(encodePartitionEntry(part), index * 32);
});
const parsed = parsePartitionTable(table);
assert.equal(parsed.length, crossxtch.length);
assert.equal(parsed[2].label, "app0");
const layout = otaLayout(parsed);
assert.equal(layout.otadataOffset, 0xe000);
assert.deepEqual(
  layout.apps.map((app) => app.offset),
  [0x10000, 0x650000],
);

const stockX3 = new Uint8Array(table);
stockX3.set(
  encodePartitionEntry({
    type: 0x00,
    subtype: 0x10,
    offset: 0x10000,
    size: 0x770000,
    label: "app0",
  }),
  2 * 32,
);
stockX3.set(
  encodePartitionEntry({
    type: 0x00,
    subtype: 0x11,
    offset: 0x780000,
    size: 0x770000,
    label: "app1",
  }),
  3 * 32,
);
assert.deepEqual(
  otaLayout(parsePartitionTable(stockX3)).apps.map((app) => app.offset),
  [0x10000, 0x780000],
);

assert.throws(() => otaLayout([]), (error) => error instanceof FlashError && error.code === "no-slots");

const image = new Uint8Array(0x10000);
image[0] = 0xe9;
assertFirmwareImage(image, 0x640000);
assert.throws(
  () => assertFirmwareImage(new Uint8Array([0]), 0x640000),
  (error) => error instanceof FlashError && error.code === "bad-image",
);
assert.throws(
  () => assertFirmwareImage(image.subarray(0, 100), 0x640000),
  (error) => error instanceof FlashError && error.code === "too-small",
);
assert.throws(
  () => assertFirmwareImage(image, 0x8000),
  (error) => error instanceof FlashError && error.code === "too-big",
);

const calls = [];
await restartChip(
  {
    setDTR: async (state) => calls.push(["dtr", state]),
    setRTS: async (state) => {
      calls.push(["rts", state]);
      if (state === false) throw new Error("usb dropped");
    },
  },
  async (ms) => calls.push(["wait", ms]),
);
assert.deepEqual(calls, [
  ["dtr", false],
  ["rts", true],
  ["wait", 200],
  ["rts", false],
  ["dtr", false],
  ["wait", 300],
]);

const heads = otadataFromHeads(new Uint8Array(32).fill(0x11), new Uint8Array(32).fill(0x22));
assert.equal(heads.length, 0x2000);
assert.equal(heads[0], 0x11);
assert.equal(heads[31], 0x11);
assert.equal(heads[32], 0xff);
assert.equal(heads[0x1000], 0x22);
assert.equal(heads[0x101f], 0x22);
assert.equal(heads[0x1020], 0xff);

function u32(value) {
  return new Uint8Array([value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff]);
}
let command = null;
const acks = [];
const payload = new Uint8Array(128);
payload[0] = 0xaa;
payload[1] = 0x50;
const read = await readStubFlash(
  {
    ESP_READ_FLASH: 0xd2,
    _intToByteArray: u32,
    _appendArray: (left, right) => {
      const out = new Uint8Array(left.length + right.length);
      out.set(left, 0);
      out.set(right, left.length);
      return out;
    },
    async checkCommand(_description, op, data) {
      command = { op, data };
      return 0;
    },
  },
  {
    async read() {
      const at = acks.length * 64;
      return payload.subarray(at, at + 64);
    },
    async write(data) {
      acks.push([...data]);
    },
  },
  0x8000,
  128,
);
assert.equal(command.op, 0xd2);
assert.deepEqual([...command.data.subarray(0, 4)], [...u32(0x8000)]);
assert.deepEqual([...command.data.subarray(4, 8)], [...u32(128)]);
assert.deepEqual([...command.data.subarray(8, 16)], [...u32(0x40), ...u32(0x40)]);
assert.equal(read[0], 0xaa);
assert.equal(read[1], 0x50);
assert.equal(read.length, 128);
assert.deepEqual(acks, [[64, 0, 0, 0], [128, 0, 0, 0]]);

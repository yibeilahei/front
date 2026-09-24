export const FLASH_ERROR_CODES = [
  "wrong-chip",
  "no-slots",
  "bad-image",
  "too-small",
  "too-big",
] as const;

export type FlashErrorCode = (typeof FLASH_ERROR_CODES)[number];

export class FlashError extends Error {
  readonly code: FlashErrorCode;

  constructor(code: FlashErrorCode) {
    super(code);
    this.name = "FlashError";
    this.code = code;
  }
}

function readU32(data: Uint8Array, offset: number): number {
  return (
    (data[offset] ?? 0) |
    ((data[offset + 1] ?? 0) << 8) |
    ((data[offset + 2] ?? 0) << 16) |
    ((data[offset + 3] ?? 0) << 24)
  ) >>> 0;
}

export function writeU32(data: Uint8Array, offset: number, value: number) {
  data[offset] = value & 0xff;
  data[offset + 1] = (value >>> 8) & 0xff;
  data[offset + 2] = (value >>> 16) & 0xff;
  data[offset + 3] = (value >>> 24) & 0xff;
}

/** CRC-32 (ISO-HDLC). Matches `esp_rom_crc32_le(0xffffffff, data, len)`. */
export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i] ?? 0;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const ESP_IMAGE_MAGIC = 0xe9;
/** Small enough for a dev build, large enough to reject a bootloader or a stub. */
const MIN_IMAGE_BYTES = 0x10000;

export function assertFirmwareImage(image: Uint8Array, slotSize: number) {
  if (image.length < 8 || image[0] !== ESP_IMAGE_MAGIC) {
    throw new FlashError("bad-image");
  }
  if (image.length < MIN_IMAGE_BYTES) throw new FlashError("too-small");
  if (image.length > slotSize) throw new FlashError("too-big");
}

export type Partition = {
  type: number;
  subtype: number;
  offset: number;
  size: number;
  label: string;
};

export type AppSlot = {
  index: number;
  offset: number;
  size: number;
  label: string;
};

export type OtaLayout = {
  otadataOffset: number;
  apps: AppSlot[];
};

const APP = 0x00;
const DATA = 0x01;
const OTA_DATA = 0x00;
const OTA_APP_MIN = 0x10;
const OTA_APP_MAX = 0x20;
const FLASH_SIZE = 0x1000000;

export function parsePartitionTable(bytes: Uint8Array): Partition[] {
  const parts: Partition[] = [];
  for (let offset = 0; offset + 32 <= bytes.length; offset += 32) {
    const magic0 = bytes[offset] ?? 0;
    const magic1 = bytes[offset + 1] ?? 0;
    if (magic0 === 0xff) break;
    if (magic0 === 0xeb && magic1 === 0xeb) break;
    if (magic0 !== 0xaa || magic1 !== 0x50) break;
    let label = "";
    for (let i = 0; i < 16; i++) {
      const byte = bytes[offset + 12 + i] ?? 0;
      if (byte === 0) break;
      label += String.fromCharCode(byte);
    }
    parts.push({
      type: bytes[offset + 2] ?? 0,
      subtype: bytes[offset + 3] ?? 0,
      offset: readU32(bytes, offset + 4),
      size: readU32(bytes, offset + 8),
      label,
    });
  }
  return parts;
}

export function otaLayout(parts: Partition[]): OtaLayout {
  const otadata = parts.find((part) => part.type === DATA && part.subtype === OTA_DATA);
  const apps = parts
    .filter(
      (part) => part.type === APP && part.subtype >= OTA_APP_MIN && part.subtype < OTA_APP_MAX,
    )
    .map((part) => ({
      index: part.subtype - OTA_APP_MIN,
      offset: part.offset,
      size: part.size,
      label: part.label,
    }))
    .sort((a, b) => a.index - b.index);

  if (!otadata || otadata.size < 0x2000 || apps.length < 2) {
    throw new FlashError("no-slots");
  }
  const seen = new Set<number>();
  for (const app of apps) {
    if (
      seen.has(app.index) ||
      app.offset % 0x10000 !== 0 ||
      app.size < 0x10000 ||
      app.offset + app.size > FLASH_SIZE
    ) {
      throw new FlashError("no-slots");
    }
    seen.add(app.index);
  }
  for (let index = 0; index < apps.length; index++) {
    if (!seen.has(index)) throw new FlashError("no-slots");
  }
  return { otadataOffset: otadata.offset, apps };
}

/** Build one 32-byte partition entry. Used by tests and not written to a device. */
export function encodePartitionEntry(part: Partition): Uint8Array {
  const entry = new Uint8Array(32);
  entry[0] = 0xaa;
  entry[1] = 0x50;
  entry[2] = part.type;
  entry[3] = part.subtype;
  writeU32(entry, 4, part.offset);
  writeU32(entry, 8, part.size);
  for (let i = 0; i < part.label.length && i < 16; i++) {
    entry[12 + i] = part.label.charCodeAt(i);
  }
  return entry;
}

const SECTOR = 0x1000;
const SEQ_EMPTY = 0xffffffff;
const STATE_INVALID = 3;
const STATE_ABORTED = 4;

export type BootSelection = {
  /** OTA app index: 0 is app0, 1 is app1. */
  slot: number;
  sequence: number;
  /** Which of the two otadata sectors holds this selection. */
  copy: 0 | 1;
};

export type FlashPlan = {
  targetSlot: number;
  /** Sector inside otadata to overwrite. The other sector stays as it was. */
  sector: 0 | 1;
  sequence: number;
};

type Copy = {
  index: 0 | 1;
  sequence: number;
  state: number;
  crcOk: boolean;
};

function sequenceCrc(sequence: number): number {
  const bytes = new Uint8Array(4);
  writeU32(bytes, 0, sequence);
  return crc32(bytes);
}

function parseCopy(data: Uint8Array, index: 0 | 1): Copy {
  const offset = index * SECTOR;
  const sequence = readU32(data, offset);
  const state = readU32(data, offset + 0x18);
  const stored = readU32(data, offset + 0x1c);
  return {
    index,
    sequence,
    state,
    crcOk: sequence !== SEQ_EMPTY && stored === sequenceCrc(sequence),
  };
}

function selectable(copy: Copy): boolean {
  return copy.crcOk && copy.state !== STATE_INVALID && copy.state !== STATE_ABORTED;
}

/** `(sequence - 1) mod appCount`, the slot the bootloader actually boots. */
export function slotForSequence(sequence: number, appCount: number): number {
  return ((sequence - 1) >>> 0) % appCount;
}

/**
 * The two otadata sectors are copies. The higher valid sequence wins, and
 * that sequence — not which sector it sits in — picks the app slot.
 */
export function activeBoot(data: Uint8Array, appCount: number): BootSelection | null {
  const copies = [parseCopy(data, 0), parseCopy(data, 1)].filter(selectable);
  if (copies.length === 0 || appCount < 1) return null;
  const best = copies.reduce((a, b) => (b.sequence > a.sequence ? b : a));
  return {
    slot: slotForSequence(best.sequence, appCount),
    sequence: best.sequence,
    copy: best.index,
  };
}

/**
 * Write the new image into the slot that is not running, then publish a
 * sequence that maps to that slot. With blank otadata the reader is on
 * app0 (there is no factory app), so the first flash lands in app1.
 */
export function planFlash(data: Uint8Array, appCount: number): FlashPlan {
  if (appCount < 2) throw new FlashError("no-slots");
  const active = activeBoot(data, appCount);
  const running = active ? active.slot : 0;
  const targetSlot = (running + 1) % appCount;
  let sequence = ((active?.sequence ?? 0) + 1) >>> 0;
  let found = false;
  for (let step = 0; step <= appCount; step++) {
    if (sequence !== 0 && slotForSequence(sequence, appCount) === targetSlot) {
      found = true;
      break;
    }
    sequence = (sequence + 1) >>> 0;
  }
  if (!found) throw new FlashError("no-slots");
  const sector: 0 | 1 = active ? (active.copy === 0 ? 1 : 0) : 0;
  return { targetSlot, sector, sequence };
}

/** One erased sector with a new selection entry. State stays undefined. */
export function encodeOtaSector(sequence: number): Uint8Array {
  const sector = new Uint8Array(SECTOR);
  sector.fill(0xff);
  writeU32(sector, 0, sequence);
  writeU32(sector, 0x1c, sequenceCrc(sequence));
  return sector;
}

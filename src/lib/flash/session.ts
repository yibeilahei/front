import {
  activeBoot,
  assertFirmwareImage,
  encodeOtaSector,
  FlashError,
  otaLayout,
  parsePartitionTable,
  planFlash,
} from "./plan";
import { restartChip } from "./restart";
import { otadataFromHeads, readStubFlash } from "./stubRead";

export type FlashPhase = "connect" | "partitions" | "write" | "boot" | "restart";

export type FlashProgress = {
  phase: FlashPhase;
  written?: number;
  total?: number;
  slot?: string;
};

const BAUD = 115200;

/**
 * Write `image` to the inactive OTA app and point otadata at it.
 * The bootloader, partition table, and NVS are left alone.
 */
export async function flashFirmware(
  port: object,
  image: Uint8Array,
  onProgress: (progress: FlashProgress) => void,
): Promise<{ slot: string }> {
  const { ESPLoader, Transport } = await import("esptool-js");
  const transport = new Transport(port as ConstructorParameters<typeof Transport>[0], false);
  const loader = new ESPLoader({
    transport,
    baudrate: BAUD,
    romBaudrate: BAUD,
    terminal: {
      clean() {},
      writeLine() {},
      write() {},
    },
  });

  let connected = false;
  try {
    onProgress({ phase: "connect" });
    const chip = await loader.main();
    connected = true;
    if (!chip.includes("ESP32-C3")) throw new FlashError("wrong-chip");

    onProgress({ phase: "partitions", written: 0, total: 1 });
    const table = await readStubFlash(loader, transport, 0x8000, 0x200, (written, total) => {
      onProgress({ phase: "partitions", written, total });
    });
    const layout = otaLayout(parsePartitionTable(table));
    const otadata = await readOtadata(loader, transport, layout.otadataOffset);
    const plan = planFlash(otadata, layout.apps.length);
    const app = layout.apps.find((slot) => slot.index === plan.targetSlot);
    if (!app) throw new FlashError("no-slots");
    assertFirmwareImage(image, app.size);

    // Refuse to publish a sequence that does not boot the slot we just chose.
    if (activeBoot(placeSector(otadata, plan.sector, plan.sequence), layout.apps.length)?.slot !== plan.targetSlot) {
      throw new FlashError("no-slots");
    }

    onProgress({ phase: "write", written: 0, total: image.length, slot: app.label });
    await loader.writeFlash({
      fileArray: [{ data: image, address: app.offset }],
      flashMode: "keep",
      flashFreq: "keep",
      flashSize: "keep",
      eraseAll: false,
      compress: true,
      reportProgress: (_fileIndex, written, total) => {
        onProgress({ phase: "write", written, total, slot: app.label });
      },
    });

    onProgress({ phase: "boot", slot: app.label });
    await loader.writeFlash({
      fileArray: [
        {
          data: encodeOtaSector(plan.sequence),
          address: layout.otadataOffset + plan.sector * 0x1000,
        },
      ],
      flashMode: "keep",
      flashFreq: "keep",
      flashSize: "keep",
      eraseAll: false,
      compress: true,
    });

    onProgress({ phase: "restart", slot: app.label });
    try {
      await restartChip(transport);
    } catch {
      // The image is already selected. Closing the port releases EN.
    }
    return { slot: app.label || `app${plan.targetSlot}` };
  } catch (error) {
    if (connected) {
      try {
        await restartChip(transport);
      } catch {
        // The port may already be gone. Closing it still releases EN.
      }
    }
    throw error;
  } finally {
    try {
      await transport.disconnect();
    } catch {
      // The port is already closed after reset.
    }
  }
}

async function readOtadata(
  loader: Parameters<typeof readStubFlash>[0],
  port: Parameters<typeof readStubFlash>[1],
  offset: number,
): Promise<Uint8Array> {
  const sector0 = await readStubFlash(loader, port, offset, 0x40);
  const sector1 = await readStubFlash(loader, port, offset + 0x1000, 0x40);
  return otadataFromHeads(sector0, sector1);
}

function placeSector(otadata: Uint8Array, sector: 0 | 1, sequence: number): Uint8Array {
  const next = new Uint8Array(otadata);
  next.set(encodeOtaSector(sequence), sector * 0x1000);
  return next;
}

type StubLoader = {
  ESP_READ_FLASH: number;
  _intToByteArray(value: number): Uint8Array;
  _appendArray(left: Uint8Array, right: Uint8Array): Uint8Array;
  checkCommand(description: string, op: number, data: Uint8Array): Promise<number | Uint8Array>;
};

type SlipPort = {
  read(timeoutMs: number): Promise<Uint8Array | string>;
  write(data: Uint8Array): Promise<void>;
};

/** Short frames. A 4 KB read packet stalls the USB-JTAG link. */
const BLOCK = 0x40;
const PACKET_TIMEOUT_MS = 8000;

/**
 * Read flash with the stub flasher, one small packet at a time.
 * The stub knows the flash mode; a raw 0x03 command does not.
 */
export async function readStubFlash(
  loader: StubLoader,
  port: SlipPort,
  address: number,
  size: number,
  onProgress?: (written: number, total: number) => void,
): Promise<Uint8Array> {
  let packet = loader._appendArray(loader._intToByteArray(address), loader._intToByteArray(size));
  packet = loader._appendArray(packet, loader._intToByteArray(BLOCK));
  packet = loader._appendArray(packet, loader._intToByteArray(BLOCK));
  const status = await loader.checkCommand("read flash", loader.ESP_READ_FLASH, packet);
  if (status != 0) throw new Error("Failed to read flash");

  const out = new Uint8Array(size);
  let got = 0;
  while (got < size) {
    const frame = await port.read(PACKET_TIMEOUT_MS);
    if (!(frame instanceof Uint8Array) || frame.length === 0) {
      throw new Error("Flash read stopped");
    }
    const n = Math.min(frame.length, size - got);
    out.set(frame.subarray(0, n), got);
    got += n;
    await port.write(loader._intToByteArray(got));
    onProgress?.(got, size);
  }
  return out;
}

/** Two 32-byte otadata heads, the rest left erased. */
export function otadataFromHeads(sector0: Uint8Array, sector1: Uint8Array): Uint8Array {
  const data = new Uint8Array(0x2000);
  data.fill(0xff);
  data.set(sector0.subarray(0, 32), 0);
  data.set(sector1.subarray(0, 32), 0x1000);
  return data;
}

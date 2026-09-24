export type ResetLines = {
  setDTR(state: boolean): Promise<void>;
  setRTS(state: boolean): Promise<void>;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Pulse EN while IO0 stays high, matching esptool's USB hard reset.
 * esptool-js only releases RTS, so the reader stays in the flasher.
 */
export async function restartChip(
  lines: ResetLines,
  wait: (ms: number) => Promise<void> = sleep,
) {
  try {
    await lines.setDTR(false);
    await lines.setRTS(true);
    await wait(200);
  } finally {
    // Always let go of reset. If this pulse is left asserted, USB never
    // comes back and the reader disappears from the port list.
    try {
      await lines.setRTS(false);
    } catch {
      // USB dropped while reset was held.
    }
    try {
      await lines.setDTR(false);
    } catch {
      // Same port, already gone.
    }
  }
  await wait(300);
}

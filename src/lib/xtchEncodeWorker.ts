/**
 * Worker side of the XTH page encode pipeline (see xtchEncodePool.ts).
 *
 * Runs quantize + raw-DEFLATE off the main thread so it can overlap with
 * the (necessarily main-thread, DOM/canvas-bound) rendering of the next
 * page. `MessageEvent`/`Transferable` come from the "dom" lib already in
 * tsconfig; typing `self` this way avoids pulling in the "webworker" lib,
 * which would collide with "dom" across the whole program.
 */

import { encodeXthPage } from "./xtch";

export type EncodeRequest = {
  id: number;
  buffer: ArrayBuffer;
  width: number;
  height: number;
};

export type EncodeResponse = {
  id: number;
  bytes?: Uint8Array;
  error?: string;
};

type WorkerSelf = {
  onmessage: ((ev: MessageEvent<EncodeRequest>) => void) | null;
  postMessage: (msg: EncodeResponse, transfer?: Transferable[]) => void;
};

const ctx = self as unknown as WorkerSelf;

ctx.onmessage = async (ev: MessageEvent<EncodeRequest>) => {
  const { id, buffer, width, height } = ev.data;
  try {
    const data = new Uint8Array(buffer);
    const bytes = await encodeXthPage(data, width, height);
    ctx.postMessage({ id, bytes }, [bytes.buffer]);
  } catch (err) {
    ctx.postMessage({ id, error: err instanceof Error ? err.message : String(err) });
  }
};

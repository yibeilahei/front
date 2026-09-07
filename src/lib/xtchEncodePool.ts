/**
 * Pool of Web Workers running `encodeXthPage` (quantize + raw-DEFLATE) off
 * the main thread.
 *
 * Page rendering (`session.pager.renderPage`) has to stay on the main
 * thread — it drives an iframe/canvas — but encoding a rendered frame is
 * pure data work. Farming it out to workers lets the main thread start
 * rendering the *next* page while the current one is still being
 * quantized/compressed, closing most of the gap with the cookbook CLI's
 * multi-process page pipeline (see docs comparison in xtch.ts).
 *
 * Falls back to `null` when Workers aren't available (SSR, Node unit
 * tests, ancient browsers); callers should encode inline in that case.
 */

import type { EncodeRequest, EncodeResponse } from "./xtchEncodeWorker";

/** Bump when the worker request contract changes so browsers skip a stale script. */
const XTCH_ENCODE_PROTOCOL = 2;

type PendingJob = {
  resolve: (bytes: Uint8Array) => void;
  reject: (err: Error) => void;
};

export class XtchEncodePool {
  readonly size: number;
  private workers: Worker[] = [];
  private nextWorker = 0;
  private nextId = 0;
  private pending = new Map<number, PendingJob>();

  constructor(size: number) {
    this.size = size;
    // Built by `npm run build:worker` (esbuild) into public/xtchEncodeWorker.js
    // ahead of `next dev`/`next build` (see predev/prebuild scripts). Next 16's
    // default Turbopack builder does not bundle `new Worker(new URL("./x.ts",
    // import.meta.url))` the way webpack5 does — it just copies the raw
    // TypeScript source as a static asset, which the browser can't execute.
    // Pre-bundling with esbuild sidesteps that entirely.
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
    for (let i = 0; i < size; i++) {
      const worker = new Worker(
        `${basePath}/xtchEncodeWorker.js?v=${XTCH_ENCODE_PROTOCOL}`,
        { type: "module" },
      );
      worker.onmessage = (ev: MessageEvent<EncodeResponse>) => {
        const { id, bytes, error } = ev.data;
        const job = this.pending.get(id);
        if (!job) return;
        this.pending.delete(id);
        if (error) job.reject(new Error(error));
        else job.resolve(bytes as Uint8Array);
      };
      worker.onerror = (ev) => {
        // Rare (e.g. worker script failed to load): fail every job still
        // outstanding on this worker rather than hanging the caller.
        for (const [id, job] of this.pending) {
          job.reject(new Error(ev.message || "xtch encode worker error"));
          this.pending.delete(id);
        }
      };
      this.workers.push(worker);
    }
  }

  encode(
    data: Uint8ClampedArray | Uint8Array,
    width: number,
    height: number,
    compress = false,
  ): Promise<Uint8Array> {
    const id = this.nextId++;
    const worker = this.workers[this.nextWorker];
    this.nextWorker = (this.nextWorker + 1) % this.workers.length;
    // Copy into a fresh, transferable buffer: `data` may be a cached frame
    // owned by the pager (see pagers/vertical.ts, horizontal.ts), and
    // transferring it would detach that cache entry's backing buffer.
    const copy = data.slice();
    const buffer = copy.buffer as ArrayBuffer;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      const req: EncodeRequest = { id, buffer, width, height, compress };
      worker.postMessage(req, [buffer]);
    });
  }

  destroy() {
    for (const worker of this.workers) worker.terminate();
    this.workers = [];
    for (const [, job] of this.pending) job.reject(new Error("Encode pool destroyed"));
    this.pending.clear();
  }
}

/** Worker count: leave one core free for the main thread's rendering. */
export function createEncodePool(): XtchEncodePool | null {
  if (typeof Worker === "undefined") return null;
  const cores = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 2 : 2;
  const size = Math.max(1, Math.min(4, cores - 1));
  try {
    return new XtchEncodePool(size);
  } catch {
    return null;
  }
}

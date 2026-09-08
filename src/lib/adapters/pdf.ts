/**
 * PDF adapter. Rasterize each page as-is, fit to the panel, pad with white.
 * No Foliate / HTML pager — PDFs are already paginated.
 */

import { t } from "../i18n.ts";
import type {
  BookSession,
  Converter,
  ConvertSettings,
  DocumentInfo,
  StatusFn,
  TocEntry,
  VerticalPager,
} from "../types.ts";

const SUPERSAMPLE = 1;
const MAX_EDGE = 4096;
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-

export type FitRect = { width: number; height: number; x: number; y: number };

/** Scale `src` into `dst` preserving aspect ratio; leftover is padding. */
export function fitRect(srcW: number, srcH: number, dstW: number, dstH: number): FitRect {
  if (srcW <= 0 || srcH <= 0 || dstW <= 0 || dstH <= 0) {
    return { width: Math.max(1, dstW), height: Math.max(1, dstH), x: 0, y: 0 };
  }
  const scale = Math.min(dstW / srcW, dstH / srcH);
  const width = Math.min(dstW, Math.max(1, Math.round(srcW * scale)));
  const height = Math.min(dstH, Math.max(1, Math.round(srcH * scale)));
  return {
    width,
    height,
    x: Math.floor((dstW - width) / 2),
    y: Math.floor((dstH - height) / 2),
  };
}

/** Rec.601 luminance into R/G/B; composite translucent pixels on white. */
export function toGrayscale(data: Uint8ClampedArray): void {
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    if (a !== 255) {
      const t = a / 255;
      r = r * t + 255 * (1 - t);
      g = g * t + 255 * (1 - t);
      b = b * t + 255 * (1 - t);
    }
    const gray = Math.round((r * 299 + g * 587 + b * 114) / 1000);
    data[i] = data[i + 1] = data[i + 2] = gray;
    data[i + 3] = 255;
  }
}

export async function isPdfMagic(file: File): Promise<boolean> {
  if (file.size < 5) return false;
  const head = new Uint8Array(await file.slice(0, Math.min(file.size, 1024)).arrayBuffer());
  for (let i = 0; i <= head.length - 5; i++) {
    if (
      head[i] === PDF_MAGIC[0] &&
      head[i + 1] === PDF_MAGIC[1] &&
      head[i + 2] === PDF_MAGIC[2] &&
      head[i + 3] === PDF_MAGIC[3] &&
      head[i + 4] === PDF_MAGIC[4]
    ) {
      return true;
    }
  }
  return false;
}

export async function sniffPdf(file: File): Promise<{ markup: string; script: null; encoding: null }> {
  if (!(await isPdfMagic(file))) throw new Error(t("unsupportedType"));
  return { markup: "", script: null, encoding: null };
}

function publicUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
  const rel = path.startsWith("/") ? path : `/${path}`;
  return `${base}${rel}`;
}

let workerReady = false;

async function pdfjsLib() {
  const pdfjs = await import("pdfjs-dist");
  if (!workerReady) {
    pdfjs.GlobalWorkerOptions.workerSrc = publicUrl("/pdfjs/pdf.worker.min.mjs");
    workerReady = true;
  }
  return pdfjs;
}

type Pdfjs = Awaited<ReturnType<typeof pdfjsLib>>;
type PdfTask = ReturnType<Pdfjs["getDocument"]>;
type PdfDocument = Awaited<PdfTask["promise"]>;
type OutlineNode = {
  title?: string;
  dest?: unknown;
  items?: OutlineNode[];
};

function metaField(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  return String(value).trim();
}

async function destPageIndex(pdf: PdfDocument, dest: unknown): Promise<number | null> {
  try {
    let explicit = dest;
    if (typeof dest === "string") explicit = await pdf.getDestination(dest);
    if (!Array.isArray(explicit) || !explicit[0]) return null;
    return await pdf.getPageIndex(explicit[0]);
  } catch {
    return null;
  }
}

async function tocFromPdf(pdf: PdfDocument): Promise<TocEntry[]> {
  try {
    const outline = (await pdf.getOutline()) as OutlineNode[] | null;
    if (!outline?.length) return [];
    const out: TocEntry[] = [];
    const walk = async (items: OutlineNode[]) => {
      for (const item of items) {
        const index = await destPageIndex(pdf, item.dest);
        const title = String(item.title || "").trim();
        if (title && index != null) out.push({ title, name: title, page: index });
        if (item.items?.length) await walk(item.items);
      }
    };
    await walk(outline);
    return out;
  } catch {
    return [];
  }
}

async function infoFromPdf(pdf: PdfDocument, titleFallback: string): Promise<DocumentInfo> {
  try {
    const meta = await pdf.getMetadata();
    const info = (meta?.info || {}) as Record<string, unknown>;
    return {
      title: metaField(info.Title) || titleFallback,
      author: metaField(info.Author),
    };
  } catch {
    return { title: titleFallback };
  }
}

function canvas2d(canvas: HTMLCanvasElement, willRead: boolean): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d", { alpha: false, willReadFrequently: willRead });
  if (!ctx) throw new Error(t("rendererNotReady"));
  return ctx;
}

async function renderPdfPage(
  pdf: PdfDocument,
  pageIndex: number,
  dstW: number,
  dstH: number,
  src: HTMLCanvasElement,
  dst: HTMLCanvasElement,
): Promise<Uint8ClampedArray> {
  const page = await pdf.getPage(pageIndex + 1);
  try {
    const base = page.getViewport({ scale: 1 });
    const fit = fitRect(base.width, base.height, dstW, dstH);
    let scale = (fit.width / Math.max(base.width, 1)) * SUPERSAMPLE;
    const edge = Math.max(base.width * scale, base.height * scale);
    if (edge > MAX_EDGE) scale *= MAX_EDGE / edge;
    const viewport = page.getViewport({ scale });

    src.width = Math.max(1, Math.round(viewport.width));
    src.height = Math.max(1, Math.round(viewport.height));
    const srcCtx = canvas2d(src, false);
    srcCtx.fillStyle = "#fff";
    srcCtx.fillRect(0, 0, src.width, src.height);
    await page.render({
      canvas: src,
      viewport,
      intent: "print",
      background: "rgb(255,255,255)",
    }).promise;

    if (dst.width !== dstW || dst.height !== dstH) {
      dst.width = dstW;
      dst.height = dstH;
    }
    const dstCtx = canvas2d(dst, true);
    dstCtx.fillStyle = "#fff";
    dstCtx.fillRect(0, 0, dstW, dstH);
    dstCtx.imageSmoothingEnabled = true;
    dstCtx.imageSmoothingQuality = "high";
    dstCtx.drawImage(src, 0, 0, src.width, src.height, fit.x, fit.y, fit.width, fit.height);

    const image = dstCtx.getImageData(0, 0, dstW, dstH);
    toGrayscale(image.data);
    return image.data;
  } finally {
    page.cleanup();
  }
}

function createPdfPager(
  pdf: PdfDocument,
  task: PdfTask,
  width: number,
  height: number,
  objectUrl: string,
): VerticalPager {
  if (typeof document === "undefined") throw new Error(t("rendererNotReady"));
  const src = document.createElement("canvas");
  const dst = document.createElement("canvas");
  dst.width = width;
  dst.height = height;
  let destroyed = false;
  return {
    pageCount: pdf.numPages,
    async renderPage(pageIndex) {
      if (destroyed) throw new Error(t("rendererNotReady"));
      return renderPdfPage(pdf, pageIndex, width, height, src, dst);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      src.width = src.height = 0;
      dst.width = dst.height = 0;
      URL.revokeObjectURL(objectUrl);
      void task.destroy();
    },
  };
}

export async function openPdfSession(
  converter: Converter,
  file: File,
  settings: ConvertSettings,
  onStatus?: StatusFn,
): Promise<BookSession> {
  if (!(await isPdfMagic(file))) throw new Error(t("unsupportedType"));
  if (typeof document === "undefined") throw new Error(t("rendererNotReady"));
  if (onStatus) onStatus(t("openingPdf"));

  const pdfjs = await pdfjsLib();
  const objectUrl = URL.createObjectURL(file);
  const task = pdfjs.getDocument({
    url: objectUrl,
    cMapUrl: publicUrl("/pdfjs/cmaps/"),
    cMapPacked: true,
    standardFontDataUrl: publicUrl("/pdfjs/standard_fonts/"),
    wasmUrl: publicUrl("/pdfjs/wasm/"),
    iccUrl: publicUrl("/pdfjs/iccs/"),
    useSystemFonts: true,
  });
  let pdf: PdfDocument;
  try {
    pdf = await task.promise;
  } catch (err) {
    URL.revokeObjectURL(objectUrl);
    void task.destroy();
    const name = err && typeof err === "object" && "name" in err ? String((err as { name: string }).name) : "";
    if (name === "PasswordException") throw new Error(t("pdfPassword"));
    throw new Error(err instanceof Error ? err.message : t("convertFailed"));
  }

  if (!pdf.numPages) {
    URL.revokeObjectURL(objectUrl);
    void task.destroy();
    throw new Error(t("noPages"));
  }

  const titleFallback = file.name.replace(/\.pdf$/i, "");
  const [info, toc] = await Promise.all([infoFromPdf(pdf, titleFallback), tocFromPdf(pdf)]);
  const { w, h } = settings.device;
  const pager = createPdfPager(pdf, task, w, h, objectUrl);
  const pageCount = Math.min(pdf.numPages, 0xffff);
  return {
    kind: "horizontal",
    pager,
    pageCount,
    info,
    toc,
    width: w,
    height: h,
    converter,
    truncated: pdf.numPages > 0xffff,
  };
}

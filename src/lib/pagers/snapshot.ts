/**
 * Capture a laid-out pager viewport to RGBA from live layout boxes.
 *
 * html-to-image (SVG foreignObject) is accurate but ~10× slower per page and
 * hangs WebKit on vertical-rl. Glyph rects + fillText match the pager closely
 * enough for XTCH (text, ruby, images) and keep convert on the main thread.
 */

import { toCanvas } from "html-to-image";
import { systemFontFaceCss } from "../fonts";
import { t } from "../i18n";
import { glyphNeedsSidewaysRotate } from "./uprightChar";
import {
  cssQuotedContent,
  isRubyAnnotationElement,
  isTextCombineStyle,
  isTransparentColor,
  parseCssPx,
  parseTextEmphasis,
  quoteCornerNudge,
  verticalPresentationForm,
  type EmphasisMark,
} from "./verticalGlyph";

const systemCss = systemFontFaceCss();
const MAX_SECTION_PAGES = 5000;
const SNAP_SCALE = 2;

export function isWebKitEngine(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /AppleWebKit/i.test(ua) && !/Chrome|Chromium|Edg\//i.test(ua);
}

export function pagerHostCss(w: number, h: number): string {
  const webkit = isWebKitEngine();
  return [
    "position:fixed",
    "left:0",
    "top:0",
    `width:${w}px`,
    `height:${h}px`,
    "overflow:hidden",
    webkit ? "contain:none" : "contain:strict",
    // opacity:0 + contain:strict skips layout/paint in WebKit.
    webkit ? "opacity:0.02" : "opacity:0",
    "z-index:-1",
    "pointer-events:none",
    "background:#fff",
  ].join(";");
}

export function waitFrame(): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(finish);
    window.setTimeout(finish, 16);
  });
}

export function capPageCount(count: number): number {
  return Math.max(1, Math.min(MAX_SECTION_PAGES, count));
}

export async function loadIframe(iframe: HTMLIFrameElement, url: string): Promise<Document> {
  const waitLoad = (assign: () => void) =>
    new Promise<Document>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error(t("sectionTimeout"))), 20000);
      const finish = () => {
        window.clearTimeout(timer);
        const doc = iframe.contentDocument;
        if (!doc) {
          reject(new Error(t("sectionMissing")));
          return;
        }
        resolve(doc);
      };
      iframe.onload = finish;
      iframe.onerror = () => {
        window.clearTimeout(timer);
        reject(new Error(t("sectionFailed")));
      };
      assign();
    });

  if (isWebKitEngine()) {
    try {
      const html = await fetch(url).then((r) => r.text());
      return await waitLoad(() => {
        iframe.srcdoc = html;
      });
    } catch {
      /* blob URL fallback */
    }
  }
  return waitLoad(() => {
    iframe.src = url;
  });
}

function timeoutMs<T>(ms: number, message: string): Promise<T> {
  return new Promise((_, reject) => {
    window.setTimeout(() => reject(new Error(message)), ms);
  });
}

async function htmlToImageSnapshot(vp: HTMLElement, w: number, h: number): Promise<Uint8ClampedArray> {
  const canvas = await toCanvas(vp, {
    width: w,
    height: h,
    pixelRatio: 1,
    backgroundColor: "#ffffff",
    cacheBust: false,
    fontEmbedCSS: systemCss,
    skipAutoScale: true,
  });
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error(t("snapshotFailed"));
  return new Uint8ClampedArray(ctx.getImageData(0, 0, w, h).data);
}

function rectsOverlap(
  x: number,
  y: number,
  rw: number,
  rh: number,
  w: number,
  h: number,
): boolean {
  return rw > 0 && rh > 0 && x + rw > 0 && y + rh > 0 && x < w && y < h;
}

function centerInBox(
  x: number,
  y: number,
  rw: number,
  rh: number,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
): boolean {
  const cx = x + rw / 2;
  const cy = y + rh / 2;
  return cx >= boxX && cx < boxX + boxW && cy >= boxY && cy < boxY + boxH;
}

let snapCanvas: HTMLCanvasElement | null = null;
let downCanvas: HTMLCanvasElement | null = null;

function snapshotCanvas(w: number, h: number): HTMLCanvasElement {
  if (!snapCanvas) snapCanvas = document.createElement("canvas");
  if (snapCanvas.width !== w || snapCanvas.height !== h) {
    snapCanvas.width = w;
    snapCanvas.height = h;
  }
  return snapCanvas;
}

function outputCanvas(w: number, h: number): HTMLCanvasElement {
  if (!downCanvas) downCanvas = document.createElement("canvas");
  if (downCanvas.width !== w || downCanvas.height !== h) {
    downCanvas.width = w;
    downCanvas.height = h;
  }
  return downCanvas;
}

function skipPagerChrome(el: Element): boolean {
  if (el === el.ownerDocument.documentElement || el === el.ownerDocument.body) return true;
  const cls = (el as HTMLElement).classList;
  return cls.contains("lz-vp") || cls.contains("lz-clip") || cls.contains("lz-flow");
}

function paintBorders(
  ctx: CanvasRenderingContext2D,
  style: CSSStyleDeclaration,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const sides: Array<{ name: string; x1: number; y1: number; x2: number; y2: number }> = [
    { name: "top", x1: x, y1: y, x2: x + w, y2: y },
    { name: "right", x1: x + w, y1: y, x2: x + w, y2: y + h },
    { name: "bottom", x1: x, y1: y + h, x2: x + w, y2: y + h },
    { name: "left", x1: x, y1: y, x2: x, y2: y + h },
  ];
  for (const side of sides) {
    const width = parseCssPx(style.getPropertyValue(`border-${side.name}-width`));
    const bstyle = style.getPropertyValue(`border-${side.name}-style`).trim();
    const color = style.getPropertyValue(`border-${side.name}-color`);
    if (width <= 0 || !bstyle || bstyle === "none" || bstyle === "hidden") continue;
    if (isTransparentColor(color)) continue;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, width);
    ctx.lineCap = "butt";
    if (bstyle === "dotted") ctx.setLineDash([width, width * 1.6]);
    else if (bstyle === "dashed") ctx.setLineDash([width * 4, width * 3]);
    ctx.beginPath();
    ctx.moveTo(side.x1, side.y1);
    ctx.lineTo(side.x2, side.y2);
    ctx.stroke();
    ctx.restore();
  }
}

function paintBox(
  ctx: CanvasRenderingContext2D,
  el: Element,
  origin: DOMRect,
  style: CSSStyleDeclaration,
  clipX: number,
  clipY: number,
  clipW: number,
  clipH: number,
) {
  if (skipPagerChrome(el)) return;
  if (style.visibility === "hidden" || style.display === "none") return;
  const r = el.getBoundingClientRect();
  const x = r.left - origin.left;
  const y = r.top - origin.top;
  if (!rectsOverlap(x - clipX, y - clipY, r.width, r.height, clipW, clipH)) return;
  const bg = style.backgroundColor;
  if (bg && !isTransparentColor(bg)) {
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, r.width, r.height);
  }
  paintBorders(ctx, style, x, y, r.width, r.height);
}

function paintPseudo(
  ctx: CanvasRenderingContext2D,
  el: Element,
  origin: DOMRect,
  view: Window,
  which: "::before" | "::after",
  clipX: number,
  clipY: number,
  clipW: number,
  clipH: number,
) {
  if (skipPagerChrome(el)) return;
  const st = view.getComputedStyle(el, which);
  if (st.display === "none") return;
  const text = cssQuotedContent(st.content);
  const bg = st.backgroundColor;
  const hasBg = bg && !isTransparentColor(bg);
  const hasBorder =
    parseCssPx(st.borderTopWidth) > 0 ||
    parseCssPx(st.borderRightWidth) > 0 ||
    parseCssPx(st.borderBottomWidth) > 0 ||
    parseCssPx(st.borderLeftWidth) > 0;
  if (!text && !hasBg && !hasBorder) return;
  const host = el.getBoundingClientRect();
  const fontSize = parseCssPx(st.fontSize) || 16;
  const vertical = (st.writingMode || view.getComputedStyle(el).writingMode || "").includes("vertical");
  let rw = parseCssPx(st.width);
  let rh = parseCssPx(st.height);
  if (!(rw > 0)) rw = text ? fontSize * Math.max(1, [...text].length) : fontSize;
  if (!(rh > 0)) rh = fontSize;
  let x: number;
  let y: number;
  if (which === "::before") {
    x = vertical ? host.right - origin.left - rw : host.left - origin.left;
    y = host.top - origin.top;
  } else {
    x = vertical ? host.right - origin.left - rw : host.right - origin.left - rw;
    y = vertical ? host.bottom - origin.top - rh : host.top - origin.top;
  }
  if (!rectsOverlap(x - clipX, y - clipY, rw, rh, clipW, clipH)) return;
  if (hasBg) {
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, rw, rh);
  }
  paintBorders(ctx, st, x, y, rw, rh);
  if (text) {
    ctx.save();
    ctx.fillStyle = st.color || "#111111";
    ctx.font = st.font || `${st.fontWeight} ${st.fontSize} ${st.fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x + rw / 2, y + rh / 2);
    ctx.restore();
  }
}

function textStrokeOf(style: CSSStyleDeclaration): { width: number; color: string } {
  const width =
    parseCssPx(style.getPropertyValue("-webkit-text-stroke-width")) ||
    parseCssPx(style.getPropertyValue("text-stroke-width"));
  const color =
    style.getPropertyValue("-webkit-text-stroke-color") ||
    style.getPropertyValue("text-stroke-color") ||
    style.color ||
    "#111111";
  return { width, color };
}

function strokeAndFillText(
  ctx: CanvasRenderingContext2D,
  text: string,
  strokeWidth: number,
  strokeColor: string,
) {
  if (strokeWidth > 0) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth * 2;
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;
    ctx.strokeText(text, 0, 0);
  }
  ctx.fillText(text, 0, 0);
}

function paintEmphasis(
  ctx: CanvasRenderingContext2D,
  mark: EmphasisMark,
  cx: number,
  cy: number,
  fontSize: number,
  fontFamily: string,
  vertical: boolean,
) {
  const px = vertical ? cx + fontSize * 0.62 : cx;
  const py = vertical ? cy : cy - fontSize * 0.62;
  const r = Math.max(1.8, fontSize * 0.12);
  ctx.save();
  ctx.fillStyle = mark.color;
  ctx.strokeStyle = mark.color;
  ctx.lineWidth = Math.max(1, fontSize * 0.04);
  if (mark.kind === "glyph" && mark.glyph) {
    ctx.font = `${Math.max(6, fontSize * 0.35)}px ${fontFamily || "serif"}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(mark.glyph, px, py);
    ctx.restore();
    return;
  }
  ctx.beginPath();
  if (mark.kind === "sesame") {
    ctx.ellipse(px, py, r * 0.7, r * 1.15, vertical ? 0.35 : 1.2, 0, Math.PI * 2);
  } else if (mark.kind === "triangle") {
    ctx.moveTo(px, py - r * 1.2);
    ctx.lineTo(px + r, py + r * 0.8);
    ctx.lineTo(px - r, py + r * 0.8);
    ctx.closePath();
  } else if (mark.kind === "double-circle") {
    ctx.arc(px, py, r * 1.15, 0, Math.PI * 2);
    ctx.moveTo(px + r * 0.65, py);
    ctx.arc(px, py, r * 0.65, 0, Math.PI * 2);
  } else {
    ctx.arc(px, py, mark.kind === "circle" ? r * 1.15 : r, 0, Math.PI * 2);
  }
  if (mark.filled) ctx.fill();
  else ctx.stroke();
  ctx.restore();
}

function paintCombinedRun(
  ctx: CanvasRenderingContext2D,
  text: string,
  parent: HTMLElement,
  origin: DOMRect,
  clipX: number,
  clipY: number,
  clipW: number,
  clipH: number,
  fontSize: number,
  strokeWidth: number,
  strokeColor: string,
) {
  const run = text.replace(/\s+/g, "");
  if (!run) return;
  const r = parent.getBoundingClientRect();
  const x = r.left - origin.left;
  const y = r.top - origin.top;
  if (!centerInBox(x, y, r.width, r.height, clipX, clipY, clipW, clipH)) return;
  ctx.save();
  ctx.translate(x + r.width / 2, y + r.height / 2);
  const scale = Math.min(r.width / Math.max(ctx.measureText(run).width, 1), r.height / Math.max(fontSize, 1));
  ctx.scale(scale, scale);
  strokeAndFillText(ctx, run, strokeWidth, strokeColor);
  ctx.restore();
}

export function rasterizeElement(root: HTMLElement, w: number, h: number): Uint8ClampedArray {
  const scale = SNAP_SCALE;
  const canvas = snapshotCanvas(w * scale, h * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error(t("snapshotFailed"));
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.save();

  const origin = root.getBoundingClientRect();
  const clipEl = root.querySelector(".lz-clip");
  const clipBox = clipEl instanceof HTMLElement ? clipEl.getBoundingClientRect() : origin;
  const clipX = clipBox.left - origin.left;
  const clipY = clipBox.top - origin.top;
  const clipW = clipBox.width || w;
  const clipH = clipBox.height || h;
  ctx.beginPath();
  ctx.rect(clipX, clipY, clipW, clipH);
  ctx.clip();

  const doc = root.ownerDocument;
  const view = doc.defaultView;

  if (view) {
    for (const el of Array.from(root.querySelectorAll("*"))) {
      const style = view.getComputedStyle(el);
      paintBox(ctx, el, origin, style, clipX, clipY, clipW, clipH);
      paintPseudo(ctx, el, origin, view, "::before", clipX, clipY, clipW, clipH);
      paintPseudo(ctx, el, origin, view, "::after", clipX, clipY, clipW, clipH);
    }
  }

  for (const img of Array.from(root.querySelectorAll("img"))) {
    if (!img.naturalWidth) continue;
    const r = img.getBoundingClientRect();
    const x = r.left - origin.left;
    const y = r.top - origin.top;
    if (!rectsOverlap(x - clipX, y - clipY, r.width, r.height, clipW, clipH)) continue;
    try {
      ctx.drawImage(img, x, y, r.width, r.height);
    } catch {
      /* ignore */
    }
  }

  const combinedPainted = new Set<Element>();
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const text = node.textContent ?? "";
    if (!text) continue;
    const parent = node.parentElement;
    if (!parent) continue;
    const style = view?.getComputedStyle(parent);
    if (!style) continue;
    if (style.visibility === "hidden" || style.display === "none") continue;
    const parentRect = parent.getBoundingClientRect();
    if (
      !rectsOverlap(
        parentRect.left - clipBox.left,
        parentRect.top - clipBox.top,
        parentRect.width,
        parentRect.height,
        clipW,
        clipH,
      )
    ) {
      continue;
    }

    ctx.fillStyle = style.color || "#111111";
    ctx.font = style.font || `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const vertical = (style.writingMode || "").includes("vertical");
    const fontSize = parseFloat(style.fontSize) || 16;
    const maxGlyph = fontSize * 3;

    const stroke = textStrokeOf(style);

    if (isTextCombineStyle(style)) {
      if (!combinedPainted.has(parent)) {
        combinedPainted.add(parent);
        paintCombinedRun(
          ctx,
          parent.textContent || "",
          parent,
          origin,
          clipX,
          clipY,
          clipW,
          clipH,
          fontSize,
          stroke.width,
          stroke.color,
        );
      }
      continue;
    }

    const emphasis = isRubyAnnotationElement(parent) ? null : parseTextEmphasis(style);

    let offset = 0;
    for (const ch of text) {
      const len = ch.length;
      if (ch === "\n" || ch === "\r" || ch === "\t") {
        offset += len;
        continue;
      }
      const range = doc.createRange();
      range.setStart(node, offset);
      range.setEnd(node, offset + len);
      offset += len;
      const list = range.getClientRects();
      for (let i = 0; i < list.length; i++) {
        const r = list[i];
        // WebKit often also returns the line/column box; skip those or
        // every glyph is painted at the column center.
        if (r.width > maxGlyph || r.height > maxGlyph) continue;
        const x = r.left - origin.left;
        const y = r.top - origin.top;
        if (!centerInBox(x, y, r.width, r.height, clipX, clipY, clipW, clipH)) continue;
        const form = verticalPresentationForm(ch);
        const rotate =
          vertical &&
          form === ch &&
          glyphNeedsSidewaysRotate(ch, style.textOrientation || "mixed", r.width, r.height);
        const nudge = quoteCornerNudge(ch, vertical, fontSize);
        ctx.save();
        ctx.translate(x + r.width / 2 + nudge.dx, y + r.height / 2 + nudge.dy);
        if (rotate) ctx.rotate(Math.PI / 2);
        strokeAndFillText(ctx, form, stroke.width, stroke.color);
        ctx.restore();
        if (emphasis && ch.trim()) {
          paintEmphasis(
            ctx,
            emphasis,
            x + r.width / 2,
            y + r.height / 2,
            fontSize,
            style.fontFamily,
            vertical,
          );
        }
      }
    }
  }

  ctx.restore();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const out = outputCanvas(w, h);
  const outCtx = out.getContext("2d", { willReadFrequently: true });
  if (!outCtx) throw new Error(t("snapshotFailed"));
  outCtx.imageSmoothingEnabled = true;
  outCtx.imageSmoothingQuality = "high";
  outCtx.clearRect(0, 0, w, h);
  outCtx.drawImage(canvas, 0, 0, w, h);
  return new Uint8ClampedArray(outCtx.getImageData(0, 0, w, h).data);
}

export async function snapshotViewport(
  vp: HTMLElement,
  w: number,
  h: number,
): Promise<Uint8ClampedArray> {
  try {
    return rasterizeElement(vp, w, h);
  } catch (err) {
    console.warn("live raster failed, html-to-image fallback", err);
    return Promise.race([
      htmlToImageSnapshot(vp, w, h),
      timeoutMs<Uint8ClampedArray>(20000, t("snapshotFailed")),
    ]);
  }
}

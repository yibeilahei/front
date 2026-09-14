"use client";

import { useSyncExternalStore, type CSSProperties, type RefObject } from "react";
import { t, type Locale } from "@/lib/i18n";
import {
  CSS_REFERENCE_PPI,
  previewCssSize,
  readCssPixelsPerInch,
  subscribeCssPixelsPerInch,
} from "@/lib/previewSize";

type Props = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  hasPreview: boolean;
  title: string;
  pageLabel: string;
  canPrev: boolean;
  canNext: boolean;
  width: number;
  height: number;
  ppi: number;
  onPrev: () => void;
  onNext: () => void;
  locale: Locale;
};

export function Preview({
  canvasRef,
  hasPreview,
  title,
  pageLabel,
  canPrev,
  canNext,
  width,
  height,
  ppi,
  onPrev,
  onNext,
  locale,
}: Props) {
  const cssPpi = useSyncExternalStore(
    subscribeCssPixelsPerInch,
    readCssPixelsPerInch,
    () => CSS_REFERENCE_PPI,
  );
  const css = previewCssSize(width, height, ppi, cssPpi);
  const boxW = `${css.width}px`;
  const einkStyle = {
    width: boxW,
    maxWidth: "100%",
    aspectRatio: `${width} / ${height}`,
  } as CSSProperties;

  return (
    <section className="card preview-card">
      <h2>{t("preview", undefined, locale)}</h2>
      <div className="preview-stage">
        <div className="eink" style={einkStyle}>
          <div className="eink-screen">
            {!hasPreview ? (
              <div className="preview-empty">{t("previewEmpty", undefined, locale)}</div>
            ) : null}
            <canvas
              ref={canvasRef}
              id="previewCanvas"
              width={width}
              height={height}
              style={{ visibility: hasPreview ? "visible" : "hidden" }}
            />
          </div>
        </div>
      </div>
      <div className="preview-nav">
        <button type="button" className="btn btn-ghost" disabled={!canPrev} onClick={onPrev}>
          ◀ {t("prev", undefined, locale)}
        </button>
        <div className="preview-info">
          <span className="preview-title">{title}</span>
          <span>{pageLabel}</span>
        </div>
        <button type="button" className="btn btn-ghost" disabled={!canNext} onClick={onNext}>
          {t("next", undefined, locale)} ▶
        </button>
      </div>
    </section>
  );
}

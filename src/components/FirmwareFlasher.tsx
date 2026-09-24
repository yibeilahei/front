"use client";

import { useEffect, useRef, useState } from "react";
import { FlashError, type FlashErrorCode } from "@/lib/flash/plan";
import { loadRelease, type DeviceId } from "@/lib/flash/release";
import type { FlashProgress } from "@/lib/flash/session";
import { formatSize } from "@/lib/settings";
import { REPO } from "@/lib/site";
import { t, type Locale, type MessageKey } from "@/lib/i18n";

const PHASE_KEY: Record<FlashProgress["phase"], MessageKey> = {
  connect: "flashStepConnect",
  partitions: "flashStepPartitions",
  write: "flashStepWrite",
  boot: "flashStepBoot",
  restart: "flashStepRestart",
};

const ERROR_KEY: Record<FlashErrorCode, MessageKey> = {
  "wrong-chip": "flashWrongChip",
  "no-slots": "flashNoSlots",
  "bad-image": "flashBadImage",
  "too-small": "flashTooSmall",
  "too-big": "flashTooBig",
};

type ReleaseBytes = {
  device: DeviceId;
  version: string;
  fileName: string;
  size: number;
  bytes: Uint8Array;
};

type WebSerial = {
  requestPort(options?: { filters?: { usbVendorId?: number }[] }): Promise<object>;
};

function webSerial(): WebSerial | null {
  const serial = (navigator as Navigator & { serial?: WebSerial }).serial;
  return serial ?? null;
}

export function FirmwareFlasher({ locale }: { locale: Locale }) {
  const [device, setDevice] = useState<DeviceId>("x3");
  const [release, setRelease] = useState<ReleaseBytes | null>(null);
  const [missingDevice, setMissingDevice] = useState<DeviceId | null>(null);
  const [custom, setCustom] = useState<{ name: string; bytes: Uint8Array } | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<FlashProgress | null>(null);
  const [error, setError] = useState<{ title: string; detail?: string } | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const lock = useRef(false);

  useEffect(() => {
    let cancel = false;
    loadRelease(device)
      .then((loaded) => {
        if (cancel) return;
        setMissingDevice(null);
        setRelease({
          device,
          version: loaded.version,
          fileName: loaded.file.file,
          size: loaded.bytes.length,
          bytes: loaded.bytes,
        });
      })
      .catch(() => {
        if (!cancel) setMissingDevice(device);
      });
    return () => {
      cancel = true;
    };
  }, [device]);

  const currentRelease = release?.device === device ? release : null;
  const releaseState = currentRelease ? "ready" : missingDevice === device ? "missing" : "loading";
  const image = custom?.bytes ?? currentRelease?.bytes ?? null;
  const imageName =
    custom?.name ?? (currentRelease ? `${currentRelease.version} ${currentRelease.fileName}` : "");

  async function onFlash() {
    if (lock.current) return;
    setError(null);
    setDone(null);
    setProgress(null);
    const serial = webSerial();
    if (!serial) {
      setError({ title: t("flashNoSerial", undefined, locale) });
      return;
    }
    lock.current = true;
    let port: object;
    try {
      port = await serial.requestPort();
    } catch (err) {
      lock.current = false;
      if (err instanceof DOMException && err.name === "NotFoundError") return;
      setError(describe(err, locale));
      return;
    }
    if (!image) {
      lock.current = false;
      setError({
        title: t(releaseState === "missing" ? "flashReleaseMissing" : "flashNeedFile", undefined, locale),
      });
      return;
    }
    setBusy(true);
    try {
      const { flashFirmware } = await import("@/lib/flash/session");
      await flashFirmware(port, image, setProgress);
      setProgress(null);
      setDone(t("flashDone", { name: imageName }, locale));
    } catch (err) {
      setProgress(null);
      setError(describe(err, locale));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  const percent =
    progress?.total
      ? Math.min(100, Math.round(((progress.written ?? 0) / progress.total) * 100))
      : null;

  return (
    <section className="card flasher">
      <h2>crossxtch</h2>
      <p className="install-note">{t("flashWake", undefined, locale)}</p>
      <p className="install-note">{t("flashKeepsSlot", undefined, locale)}</p>

      <div className="flash-field">
        <span className="flash-label">{t("flashDevice", undefined, locale)}</span>
        <div className="seg" role="group" aria-label={t("flashDevice", undefined, locale)}>
          {(["x3", "x4"] as const).map((id) => (
            <button
              key={id}
              type="button"
              className={device === id ? "active" : undefined}
              aria-pressed={device === id}
              disabled={busy}
              onClick={() => setDevice(id)}
            >
              {t(id === "x3" ? "flashX3" : "flashX4", undefined, locale)}
              <span>{t(id === "x3" ? "flashX3Size" : "flashX4Size", undefined, locale)}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="flash-release">
        {custom
          ? `${custom.name} · ${formatSize(custom.bytes.length)}`
          : releaseState === "loading"
            ? t("flashReleaseLoading", undefined, locale)
            : currentRelease
              ? t(
                  "flashReleaseReady",
                  {
                    version: currentRelease.version,
                    file: currentRelease.fileName,
                    size: formatSize(currentRelease.size),
                  },
                  locale,
                )
              : t("flashReleaseMissing", undefined, locale)}
      </p>

      <div className="actions">
        <button type="button" className="btn btn-primary" disabled={busy} onClick={onFlash}>
          {busy ? t("flashing", undefined, locale) : t("flashAction", undefined, locale)}
        </button>
        <label className={`btn btn-ghost file-btn${busy ? " is-disabled" : ""}`}>
          {t("flashChooseBin", undefined, locale)}
          <input
            type="file"
            accept=".bin,application/octet-stream"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              void file.arrayBuffer().then((buffer) => {
                setCustom({ name: file.name, bytes: new Uint8Array(buffer) });
                setError(null);
                setDone(null);
              });
            }}
          />
        </label>
        {custom ? (
          <button
            type="button"
            className="btn btn-ghost"
            disabled={busy}
            onClick={() => setCustom(null)}
          >
            {t("flashClearFile", undefined, locale)}
          </button>
        ) : null}
        <a className="btn btn-ghost" href={`${REPO.crossxtch}/releases/latest`}>
          {t("downloadRelease", undefined, locale)}
        </a>
        <a className="btn btn-ghost" href={REPO.crossxtch}>
          {t("viewSource", undefined, locale)}
        </a>
      </div>

      {progress ? (
        <div className="flash-status" role="status">
          {percent !== null ? (
            <div
              className="flash-bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
            >
              <div className="flash-bar-fill" style={{ width: `${percent}%` }} />
            </div>
          ) : null}
          <p>
            {t(PHASE_KEY[progress.phase], undefined, locale)}
            {percent !== null ? ` · ${t("flashPercent", { percent }, locale)}` : ""}
          </p>
        </div>
      ) : null}
      {error ? (
        <p className="flash-error" role="alert">
          {error.title}
          {error.detail ? <span>{error.detail}</span> : null}
        </p>
      ) : null}
      {done ? <p className="flash-ok">{done}</p> : null}
      <p className="install-note flash-sd">{t("flashSd", undefined, locale)}</p>
    </section>
  );
}

function describe(err: unknown, locale: Locale): { title: string; detail?: string } {
  if (err instanceof FlashError) return { title: t(ERROR_KEY[err.code], undefined, locale) };
  const detail = err instanceof Error ? err.message : String(err);
  return { title: t("flashFailed", undefined, locale), detail };
}

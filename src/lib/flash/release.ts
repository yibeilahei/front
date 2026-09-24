export type DeviceId = "x3" | "x4";

export type ReleaseFile = {
  file: string;
  size: number;
  sha256: string;
};

export type ReleaseManifest = {
  version: string;
  repo: string;
  devices: Record<DeviceId, ReleaseFile>;
};

export function firmwareBase(): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${base}/firmware`;
}

export async function sha256Hex(data: Uint8Array): Promise<string> {
  const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function loadRelease(device: DeviceId): Promise<{
  version: string;
  file: ReleaseFile;
  bytes: Uint8Array;
}> {
  const base = firmwareBase();
  const manifestRes = await fetch(`${base}/manifest.json`);
  if (!manifestRes.ok) throw new Error(`manifest ${manifestRes.status}`);
  const manifest = (await manifestRes.json()) as ReleaseManifest;
  const file = manifest.devices[device];
  if (!file?.file || !file.sha256) throw new Error("manifest device");
  const binRes = await fetch(`${base}/${file.file}`);
  if (!binRes.ok) throw new Error(`firmware ${binRes.status}`);
  const bytes = new Uint8Array(await binRes.arrayBuffer());
  const hash = await sha256Hex(bytes);
  if (hash !== file.sha256) throw new Error("firmware hash");
  return { version: manifest.version, file, bytes };
}

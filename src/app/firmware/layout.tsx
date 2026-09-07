import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "lazahata — ファームウェア",
  description:
    "Xteink X3 / X4 向けのオープンソース XTCH リーダーファームウェアです。",
};

export default function FirmwareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

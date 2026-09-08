import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "lazahata — Cookbook",
  description:
    "電子書籍と PDF を電子ペーパー向けに変換する macOS アプリです。ブラウザ版より速く、フォルダ一括にも対応します。",
};

export default function CookbookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

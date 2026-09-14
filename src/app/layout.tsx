import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./converter.css";

export const metadata: Metadata = {
  title: "lazahata — 本を XTCH に",
  description:
    "ブラウザで EPUB、TXT、MOBI、FB2 を XTCH に変換します。ファイルはアップロードしません。",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}

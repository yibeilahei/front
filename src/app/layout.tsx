import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "lazahata — open firmware & desktop app for Xteink e-readers",
  description:
    "lazahata: open-source XTCH reader firmware for the Xteink X3 / X4, and a desktop app (cookbook) that converts ebooks and PDFs into XTCH or panel-sized PDFs.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./converter.css";

export const metadata: Metadata = {
  title: "lazahata — convert in the browser",
  description:
    "Convert EPUB, TXT, MOBI, and FB2 to XTCH in the browser for Xteink e-readers. Nothing is uploaded.",
};

export default function ConvertLayout({ children }: LayoutProps<"/convert">) {
  return children;
}

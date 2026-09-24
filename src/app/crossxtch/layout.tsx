import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "lazahata — crossxtch",
  description: "ブラウザから Xteink X3 / X4 に crossxtch を書き込みます。",
};

export default function CrossxtchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

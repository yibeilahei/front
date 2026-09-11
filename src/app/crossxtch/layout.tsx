import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "lazahata — crossxtch",
  description:
    "Xteink X3 / X4 向けのオープンソース XTCH リーダーです。",
};

export default function CrossxtchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

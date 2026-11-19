import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How Voting Works",
  description:
    "A step-by-step guide to voting in Nigeria.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

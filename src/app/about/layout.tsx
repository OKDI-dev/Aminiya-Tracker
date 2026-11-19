import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description:
    "Who builds Aminiya Tracker, what it does and the principles it follows.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

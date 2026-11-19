import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reliable Election Information",
  description:
    "How to check election information before you share it.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Promise Tracker",
  description:
    "Political promises made to Gombe State and the evidence on how far each has been delivered.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

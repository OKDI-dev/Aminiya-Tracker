import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Elections",
  description:
    "Published election records, candidates and results for Gombe State.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

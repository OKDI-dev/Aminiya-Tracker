import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Public Dashboard",
  description:
    "Published promises, community issues and election incidents in Gombe State, in one public view.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

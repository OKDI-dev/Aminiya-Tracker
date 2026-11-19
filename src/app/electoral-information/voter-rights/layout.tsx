import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Voter Rights",
  description:
    "The rights every voter in Nigeria has before, during and after voting.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Report a Community Issue",
  description:
    "Report a local problem in Gombe State, add evidence, and follow its progress with a tracking code.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

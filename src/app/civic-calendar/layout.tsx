import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Civic Calendar",
  description:
    "Upcoming civic education, electoral and community events in Gombe State.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

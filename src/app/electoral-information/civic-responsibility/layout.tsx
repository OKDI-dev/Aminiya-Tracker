import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Civic Responsibility",
  description:
    "How citizens can take part in civic life beyond election day.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}


import type { Metadata } from "next";
import ElectoralInformation from "@/components/electoral-information";

export const metadata: Metadata = {
  title: "Electoral Information",
  description:
    "Explore civic education, candidate information, election results and electoral insights with Aminiya Tracker.",
};

export default function ElectoralInformationPage() {
  return <ElectoralInformation />;
}

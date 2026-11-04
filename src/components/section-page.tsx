
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type SectionPageProps = {
  title: string;
  description: string;
  status: string;
};

export default function SectionPage({
  title,
  description,
  status,
}: SectionPageProps) {
  return (
    <main className="min-h-screen bg-[#f7f7f7] px-5 py-16 text-[#171717] sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#d95300] hover:text-[#a84000]"
        >
          <ArrowLeft size={17} />
          Back to Home
        </Link>

        <div className="mt-12 rounded-2xl border border-[#e7e7e7] bg-white p-7 sm:p-10">
           <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
            {title}
          </h1>

          <p className="mt-5 leading-8 text-[#666]">{description}</p>

          <div className="mt-8 rounded-xl border border-[#ffcfad] bg-[#fff8f2] p-5">
            <p className="font-semibold">{status}</p>
            <p className="mt-2 text-sm leading-6 text-[#666]">
              This section is part of the Aminiya Tracker development plan.
              Its complete functionality will be implemented in subsequent
              development steps.
            </p>
          </div>

          <Link
            href="/"
            className="mt-8 inline-flex items-center justify-center rounded-lg bg-[#ff6600] px-5 py-3 font-semibold text-white hover:bg-[#e85d00]"
          >
            Return to homepage
          </Link>
        </div>
      </div>
    </main>
  );
}

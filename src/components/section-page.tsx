
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
    <main className="min-h-screen bg-paper px-5 py-16 text-ink sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-ink underline-offset-4 hover:underline"
        >
          <ArrowLeft size={17} />
          Back to Home
        </Link>

        <div className="mt-12 rounded-2xl border border-line-soft bg-paper-raised p-7 sm:p-10">
           <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
            {title}
          </h1>

          <p className="mt-5 leading-8 text-ink-muted">{description}</p>

          <div className="mt-8 rounded-xl border border-signal/25 bg-tint/60 p-5">
            <p className="font-semibold">{status}</p>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              This section is part of the Aminiya Tracker development plan.
              Its complete functionality will be implemented in subsequent
              development steps.
            </p>
          </div>

          <Link
            href="/"
            className="mt-8 inline-flex items-center justify-center rounded-lg bg-signal px-5 py-3 font-semibold text-ink hover:bg-signal-hover"
          >
            Return to homepage
          </Link>
        </div>
      </div>
    </main>
  );
}

import Image from "next/image";
import Link from "next/link";

export default function AdminHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#e7e7e7] bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-[76px] max-w-7xl items-center justify-between gap-5 px-5 sm:px-8">
        <Link href="/admin" aria-label="Aminiya Tracker administration" className="shrink-0">
          <Image
            src="/aminiya-logo-png.png"
            alt="Aminiya Tracker"
            width={565}
            height={189}
            priority
            className="h-auto w-[165px] sm:w-[195px]"
          />
        </Link>

        <span className="rounded-lg border border-[#ff6600]/30 bg-[#fff0e5] px-3 py-2 text-xs font-semibold tracking-wide text-[#b94a00] sm:px-4 sm:text-sm">
          ADMINISTRATION PORTAL
        </span>
      </div>
    </header>
  );
}

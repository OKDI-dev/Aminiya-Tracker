import { connection } from "next/server";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileCheck2,
  Target,
  Users,
} from "lucide-react";
import { getPublicAccountabilityStats } from "@/lib/public-accountability";
import PublicPageHero from "@/components/public-page-hero";
import { LocalizedText } from "@/components/i18n/promise-translations";

export const instant = false;

function StatCard({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: { en: string; ha: string };
  value: number;
  description: { en: string; ha: string };
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          <LocalizedText en={label.en} ha={label.ha} />
        </p>
        <Icon size={21} className="text-[#ff6600]" />
      </div>
      <p className="mt-4 text-3xl font-bold text-[#171717]">
        {value.toLocaleString("en-NG")}
      </p>
      <p className="mt-2 text-xs text-gray-500">
        <LocalizedText en={description.en} ha={description.ha} />
      </p>
    </div>
  );
}

function StatusRow({
  label,
  value,
}: {
  label: { en: string; ha: string };
  value: number;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-100 py-3 last:border-0">
      <span className="text-sm text-gray-600">
        <LocalizedText en={label.en} ha={label.ha} />
      </span>
      <span className="text-sm font-semibold text-[#171717]">
        {value.toLocaleString("en-NG")}
      </span>
    </div>
  );
}

const sections = [
  {
    title: {
      en: "Community Issues",
      ha: "Matsalolin Al'umma",
    },
    description: {
      en: "Explore the public reporting process and follow the platform's community accountability work.",
      ha: "Bincika yadda ake bayar da rahoton matsalolin al'umma da bibiyar ayyukan tabbatar da riƙon amana a dandalin.",
    },
    href: "/community-issues",
    label: {
      en: "Visit Community Issues",
      ha: "Duba Matsalolin Al'umma",
    },
    icon: ClipboardList,
  },
  {
    title: {
      en: "Political Promise Tracker",
      ha: "Bibiyar Alkawuran Siyasa",
    },
    description: {
      en: "Examine published political commitments and approved evidence-based progress updates.",
      ha: "Bincika alkawuran siyasa da aka wallafa da kuma sahihan bayanai kan ci gaban cika su.",
    },
    href: "/promise-tracker",
    label: {
      en: "Explore political promises",
      ha: "Bincika Alkawuran Siyasa",
    },
    icon: Target,
  },
  {
    title: {
      en: "Electoral Information",
      ha: "Bayanan Zaɓe",
    },
    description: {
      en: "Access published information about elections, candidates and political parties.",
      ha: "Samu bayanan da aka wallafa game da zaɓe, 'yan takara da jam'iyyun siyasa.",
    },
    href: "/electoral-information",
    label: {
      en: "Explore electoral information",
      ha: "Bincika Bayanan Zaɓe",
    },
    icon: BookOpen,
  },
];

export default async function AccountabilityPage() {
  await connection();

  const stats = await getPublicAccountabilityStats();

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#171717]">
      <PublicPageHero
        title={
          <>
            <LocalizedText
              en="Public Accountability"
              ha="Riƙon Amanar Jama'a"
            />
            <br />
            <span className="text-[#ff6600]">
              <LocalizedText en="Dashboard" ha="Allon Bayani" />
            </span>
          </>
        }
        description={
          <LocalizedText
            en="Follow community concerns, examine political commitments and explore published electoral information. This dashboard provides an overview of publicly available platform data."
            ha="Bibiyi matsalolin al'umma, duba alkawuran siyasa da kuma bayanan zaɓe da aka wallafa. Wannan allon bayani yana nuna taƙaitaccen bayanan da jama'a za su iya samu a dandalin."
          />
        }
      />

      <div className="mx-auto max-w-7xl space-y-12 px-5 py-10 sm:px-8">
        <section>
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#ff6600]">
              <LocalizedText en="Platform overview" ha="Taƙaitaccen Bayanin Dandali" />
            </p>
            <h2 className="mt-2 text-2xl font-bold">
              <LocalizedText
                en="Accountability at a glance"
                ha="Taƙaitaccen Bayanin Riƙon Amana"
              />
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              <LocalizedText
                en="Aggregate figures from the platform. Community issue figures do not expose individual reports or submitter information."
                ha="Jimillar alkaluma daga dandalin. Bayanan matsalolin al'umma ba sa bayyana rahotannin mutum ɗaya ko bayanan waɗanda suka aika da su."
              />
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label={{
                en: "Community issues",
                ha: "Matsalolin Al'umma",
              }}
              value={stats.communityIssues.total}
              description={{
                en: "Reports received by the platform",
                ha: "Rahotannin da dandalin ya karɓa",
              }}
              icon={ClipboardList}
            />
            <StatCard
              label={{
                en: "Published promises",
                ha: "Alkawuran da aka Wallafa",
              }}
              value={stats.promises.total}
              description={{
                en: "Political commitments available to the public",
                ha: "Alkawuran siyasa da jama'a za su iya gani",
              }}
              icon={Target}
            />
            <StatCard
              label={{
                en: "Published elections",
                ha: "Zaɓukan da aka Wallafa",
              }}
              value={stats.electoralInformation.elections}
              description={{
                en: "Election records available to the public",
                ha: "Bayanan zaɓe da jama'a za su iya gani",
              }}
              icon={BookOpen}
            />
            <StatCard
              label={{
                en: "Published candidates",
                ha: "'Yan Takarar da aka Wallafa",
              }}
              value={stats.electoralInformation.candidates}
              description={{
                en: "Candidate profiles available to the public",
                ha: "Bayanan 'yan takara da jama'a za su iya gani",
              }}
              icon={Users}
            />
            <StatCard
              label={{
                en: "Published political parties",
                ha: "Jam'iyyun Siyasa da aka Wallafa",
              }}
              value={stats.electoralInformation.parties}
              description={{
                en: "Political party profiles available to the public",
                ha: "Bayanan jam'iyyun siyasa da jama'a za su iya gani",
              }}
              icon={FileCheck2}
            />
            <StatCard
              label={{
                en: "Fulfilled promises",
                ha: "Alkawuran da aka Cika",
              }}
              value={stats.promises.fulfilled}
              description={{
                en: "Published promises marked as fulfilled",
                ha: "Alkawuran da aka wallafa kuma aka nuna cewa an cika",
              }}
              icon={CheckCircle2}
            />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-center gap-3">
              <ClipboardList className="text-[#ff6600]" size={23} />
              <h2 className="text-lg font-bold">
                <LocalizedText en="Community issues" ha="Matsalolin Al'umma" />
              </h2>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              <LocalizedText
                en="Current status of submitted community reports."
                ha="Matsayin rahotannin matsalolin al'umma da aka aika a halin yanzu."
              />
            </p>
            <div className="mt-5">
              <StatusRow
                label={{ en: "Submitted", ha: "An Aika" }}
                value={stats.communityIssues.submitted}
              />
              <StatusRow
                label={{ en: "Under review", ha: "Ana Dubawa" }}
                value={stats.communityIssues.underReview}
              />
              <StatusRow
                label={{ en: "Action required", ha: "Ana Bukatar Mataki" }}
                value={stats.communityIssues.actionRequired}
              />
              <StatusRow
                label={{ en: "Resolved", ha: "An Warware" }}
                value={stats.communityIssues.resolved}
              />
              <StatusRow
                label={{ en: "Closed", ha: "An Rufe" }}
                value={stats.communityIssues.closed}
              />
            </div>
            <Link
              href="/community-issues"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#ff6600] hover:underline"
            >
              <LocalizedText
                en="Visit Community Issues"
                ha="Duba Matsalolin Al'umma"
              />
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-center gap-3">
              <Target className="text-[#ff6600]" size={23} />
              <h2 className="text-lg font-bold">
                <LocalizedText en="Political promises" ha="Alkawuran Siyasa" />
              </h2>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              <LocalizedText
                en="Progress status of published political commitments."
                ha="Matsayin ci gaban alkawuran siyasa da aka wallafa."
              />
            </p>
            <div className="mt-5">
              <StatusRow
                label={{ en: "Not started", ha: "Ba a Fara ba" }}
                value={stats.promises.notStarted}
              />
              <StatusRow
                label={{ en: "In progress", ha: "Ana Kan Yi" }}
                value={stats.promises.inProgress}
              />
              <StatusRow
                label={{ en: "Partially fulfilled", ha: "An Cika Wani Sashe" }}
                value={stats.promises.partiallyFulfilled}
              />
              <StatusRow
                label={{ en: "Fulfilled", ha: "An Cika" }}
                value={stats.promises.fulfilled}
              />
              <StatusRow
                label={{ en: "Stalled", ha: "An Dakatar" }}
                value={stats.promises.stalled}
              />
            </div>
            <Link
              href="/promise-tracker"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#ff6600] hover:underline"
            >
              <LocalizedText
                en="Explore Promise Tracker"
                ha="Bincika Bibiyar Alkawura"
              />
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>

        <section>
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#ff6600]">
              <LocalizedText en="Explore the platform" ha="Bincika Dandalin" />
            </p>
            <h2 className="mt-2 text-2xl font-bold">
              <LocalizedText
                en="Information and participation"
                ha="Bayanai da Shiga Ciki"
              />
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {sections.map((section) => {
              const Icon = section.icon;

              return (
                <article
                  key={section.href}
                  className="rounded-xl border border-gray-200 bg-white p-6"
                >
                  <Icon size={25} className="text-[#ff6600]" />
                  <h3 className="mt-5 text-lg font-bold">
                    <LocalizedText
                      en={section.title.en}
                      ha={section.title.ha}
                    />
                  </h3>
                  <p className="mt-3 min-h-20 text-sm leading-6 text-gray-600">
                    <LocalizedText
                      en={section.description.en}
                      ha={section.description.ha}
                    />
                  </p>
                  <Link
                    href={section.href}
                    className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#ff6600] hover:underline"
                  >
                    <LocalizedText
                      en={section.label.en}
                      ha={section.label.ha}
                    />
                    <ArrowRight size={16} />
                  </Link>
                </article>
              );
            })}
          </div>
        </section>

        <p className="flex items-start gap-2 text-xs leading-5 text-gray-500">
          <Clock3 size={15} className="mt-0.5 shrink-0" />
          <LocalizedText
            en="Figures are generated from current platform records and may change as reports are submitted, reviewed and updated. A promise marked fulfilled reflects its recorded progress status; it is not an independent audit certification."
            ha="Ana samar da alkaluman ne daga bayanan da ke dandalin a halin yanzu, kuma suna iya canzawa yayin da ake aika rahotanni, dubawa da sabunta su. Alkawarin da aka nuna an cika yana nufin matsayin ci gabansa ne kawai bisa bayanan da aka rubuta; ba yana nufin an gudanar da bincike mai zaman kansa don tabbatar da hakan ba."
          />
        </p>
      </div>
    </main>
  );
}

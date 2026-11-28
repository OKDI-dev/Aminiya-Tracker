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
    <div className="hover-card rounded-2xl border border-line-soft bg-paper-raised p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-subtle">
          <LocalizedText en={label.en} ha={label.ha} />
        </p>
        <span className="hover-card-icon size-10 shrink-0 rounded-xl">
          <Icon size={19} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-4 text-3xl font-bold text-ink">
        {value.toLocaleString("en-NG")}
      </p>
      <p className="mt-2 text-xs text-ink-subtle">
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
    <div className="flex items-center justify-between gap-4 border-b border-line-soft py-3 last:border-0">
      <span className="text-sm text-ink-muted">
        <LocalizedText en={label.en} ha={label.ha} />
      </span>
      <span className="text-sm font-semibold text-ink">
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
    <main className="min-h-screen bg-paper text-ink">
      <PublicPageHero
        title={
          <>
            <LocalizedText
              en="Public Accountability"
              ha="Riƙon Amanar Jama'a"
            />
            <br />
            <span className="text-signal">
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
            <h2 className="font-heading text-2xl font-extrabold tracking-tight sm:text-3xl">
              <LocalizedText
                en="Accountability at a glance"
                ha="Taƙaitaccen Bayanin Riƙon Amana"
              />
            </h2>
            <p className="mt-2 text-ink-subtle text-base leading-7">
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
          <div className="hover-card rounded-2xl border border-line-soft bg-paper-raised p-6">
            <div className="flex items-center gap-3">
              <span className="hover-card-icon size-10 shrink-0 rounded-xl">
                <ClipboardList size={20} aria-hidden="true" />
              </span>
              <h2 className="font-heading text-xl font-bold tracking-tight">
                <LocalizedText en="Community issues" ha="Matsalolin Al'umma" />
              </h2>
            </div>
            <p className="mt-2 text-sm text-ink-subtle">
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
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-ink hover:underline"
            >
              <LocalizedText
                en="Visit Community Issues"
                ha="Duba Matsalolin Al'umma"
              />
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="hover-card rounded-2xl border border-line-soft bg-paper-raised p-6">
            <div className="flex items-center gap-3">
              <span className="hover-card-icon size-10 shrink-0 rounded-xl">
                <Target size={20} aria-hidden="true" />
              </span>
              <h2 className="font-heading text-xl font-bold tracking-tight">
                <LocalizedText en="Political promises" ha="Alkawuran Siyasa" />
              </h2>
            </div>
            <p className="mt-2 text-sm text-ink-subtle">
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
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-ink hover:underline"
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
            <h2 className="font-heading text-2xl font-extrabold tracking-tight sm:text-3xl">
              <LocalizedText
                en="Information and participation"
                ha="Bayanai da Shiga Ciki"
              />
            </h2>
          </div>

          {/* Static, like the home page: a moving strip can't be paused on touch. */}
          <ul className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <li key={section.href} className="min-w-0">
                  <Link
                    href={section.href}
                    className="hover-card group flex h-full flex-col rounded-2xl border border-line-soft bg-paper-raised p-6 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
                  >
                    <span className="hover-card-icon size-12 rounded-xl">
                      <Icon size={22} aria-hidden="true" />
                    </span>
                    <h3 className="mt-5 font-heading text-lg font-bold">
                      <LocalizedText en={section.title.en} ha={section.title.ha} />
                    </h3>
                    <p className="mt-3 flex-1 text-[15px] leading-7 text-ink-muted">
                      <LocalizedText en={section.description.en} ha={section.description.ha} />
                    </p>
                    <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-ink">
                      <span className="underline-offset-4 group-hover:underline">
                        <LocalizedText en={section.label.en} ha={section.label.ha} />
                      </span>
                      <ArrowRight size={16} aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <p className="flex items-start gap-2 text-xs leading-5 text-ink-subtle">
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

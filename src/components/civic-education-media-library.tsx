"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Image as ImageIcon, Play, RefreshCw, Video } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { createClient } from "@/lib/supabase/client";

type MediaItem = {
  id: string;
  title_en: string;
  title_ha: string;
  description_en: string;
  description_ha: string;
  content_language: "en" | "ha";
  media_type: "video" | "infographic";
  category: string;
  source_type: "upload" | "youtube";
  media_url: string | null;
  storage_path: string | null;
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
};

const categories = [
  "all",
  "voting_basics",
  "voter_rights",
  "electoral_process",
  "civic_responsibility",
  "accountability",
  "reliable_information",
  "other",
];

function youtubeEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);
    let id = "";

    if (parsed.hostname === "youtu.be" || parsed.hostname === "www.youtu.be") {
      id = parsed.pathname.split("/").filter(Boolean)[0] ?? "";
    } else if (
      ["youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"].includes(parsed.hostname)
    ) {
      if (parsed.pathname === "/watch") {
        id = parsed.searchParams.get("v") ?? "";
      } else {
        id = parsed.pathname.split("/").filter(Boolean).at(-1) ?? "";
      }
    }

    return /^[A-Za-z0-9_-]{11}$/.test(id)
      ? `https://www.youtube-nocookie.com/embed/${id}`
      : null;
  } catch {
    return null;
  }
}

export default function CivicEducationMediaLibrary() {
  const { language, t } = useLanguage();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [mediaType, setMediaType] = useState<"all" | "video" | "infographic">("all");
  const [category, setCategory] = useState("all");

  const loadMedia = useCallback(async () => {
    setLoading(true);
    setFailed(false);

    try {
      const supabase = createClient();
      const mediaClient = supabase as unknown as {
        from: (table: "civic_education_media") => {
          select: (columns: string) => {
            eq: (column: string, value: string) => {
              order: (
                column: string,
                options: { ascending: boolean }
              ) => PromiseLike<{
                data: MediaItem[] | null;
                error: { message: string } | null;
              }>;
            };
          };
        };
      };

      const { data, error } = await mediaClient
        .from("civic_education_media")
        .select(
          "id,title_en,title_ha,description_en,description_ha,content_language,media_type,category,source_type,media_url,storage_path,mime_type,file_size,created_at"
        )
        .eq("publication_status", "published")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setItems((data ?? []) as MediaItem[]);
    } catch (error) {
      console.error("Unable to load civic education media:", error);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadMedia();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadMedia]);

  const filteredItems = useMemo(
    () =>
      items.filter(
        (item) =>
          item.content_language === language &&
          (mediaType === "all" || item.media_type === mediaType) &&
          (category === "all" || item.category === category)
      ),
    [items, language, mediaType, category]
  );

  const categoryLabels: Record<string, string> = {
    voting_basics: t("mediaCategoryVoting"),
    voter_rights: t("mediaCategoryRights"),
    electoral_process: t("mediaCategoryProcess"),
    civic_responsibility: t("mediaCategoryResponsibility"),
    accountability: t("mediaCategoryAccountability"),
    reliable_information: t("mediaCategoryReliable"),
    other: t("mediaCategoryOther"),
  };

  function mediaUrl(item: MediaItem) {
    if (item.source_type === "youtube") return item.media_url;
    if (!item.storage_path) return null;

    const supabase = createClient();
    return supabase.storage
      .from("civic-education-media")
      .getPublicUrl(item.storage_path).data.publicUrl;
  }

  return (
    <section className="mt-12 border-t border-line-soft pt-9">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-ink font-heading text-2xl font-extrabold tracking-tight sm:text-3xl">
            {t("mediaLibraryTitle")}
          </h2>
          <p className="mt-2 max-w-2xl text-ink-muted text-base leading-7">
            {t("mediaLibraryDescription")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(["all", "video", "infographic"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setMediaType(type)}
              aria-pressed={mediaType === type}
              className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                mediaType === type
                  ? "border-signal bg-tint text-ink"
                  : "border-line-soft bg-paper-raised text-ink-muted hover:border-signal/50"
              }`}
            >
              {type === "all"
                ? t("mediaFilterAll")
                : type === "video"
                  ? t("mediaFilterVideos")
                  : t("mediaFilterInfographics")}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 max-w-xs">
        <label className="sr-only" htmlFor="civic-media-category">
          {t("mediaCategoryFilter")}
        </label>
        <select
          id="civic-media-category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="min-h-11 w-full rounded-lg border border-line bg-paper-raised px-3 py-2 text-sm outline-none focus:border-signal"
        >
          <option value="all">{t("mediaAllCategories")}</option>
          {categories.filter((value) => value !== "all").map((value) => (
            <option key={value} value={value}>
              {categoryLabels[value]}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="mt-7 grid gap-5 md:grid-cols-2">
          {[1, 2].map((item) => (
            <div
              key={item}
              className="h-64 animate-pulse rounded-2xl bg-tint"
            />
          ))}
        </div>
      ) : failed ? (
        <div className="mt-7 rounded-xl border border-line-soft bg-paper-raised p-7 text-center">
          <p className="text-sm text-ink-muted">{t("mediaLoadFailed")}</p>
          <button
            type="button"
            onClick={() => void loadMedia()}
            className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-ink"
          >
            <RefreshCw size={15} />
            {t("mediaRetry")}
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="mt-7 rounded-xl border border-dashed border-line bg-paper-raised px-6 py-12 text-center">
          <ImageIcon size={28} className="mx-auto text-ink-subtle" />
          <h3 className="mt-3 text-ink-muted font-heading text-lg font-bold">
            {t("mediaEmptyTitle")}
          </h3>
          <p className="mt-2 text-sm text-ink-subtle">
            {t("mediaEmptyDescription")}
          </p>
        </div>
      ) : (
        <div className="mt-7 grid gap-5 md:grid-cols-2">
          {filteredItems.map((item) => {
            const url = mediaUrl(item);
            const title = language === "ha" ? item.title_ha : item.title_en;
            const description =
              language === "ha" ? item.description_ha : item.description_en;
            const embedUrl =
              item.source_type === "youtube" && item.media_url
                ? youtubeEmbedUrl(item.media_url)
                : null;

            return (
              <article
                key={item.id}
                className="overflow-hidden rounded-2xl border border-line-soft bg-paper-raised"
              >
                <div className="relative aspect-video bg-ink">
                  {url && item.media_type === "video" && item.source_type === "upload" ? (
                    <video
                      controls
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-contain"
                      aria-label={title}
                    >
                      <source src={url} type={item.mime_type ?? "video/mp4"} />
                    </video>
                  ) : embedUrl ? (
                    <iframe
                      src={embedUrl}
                      title={title}
                      className="h-full w-full"
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  ) : url && item.media_type === "infographic" ? (
                    <Image
                      src={url}
                      alt={title}
                      fill
                      unoptimized
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-contain"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-white">
                      <p className="text-sm">{t("mediaUnavailable")}</p>
                    </div>
                  )}
                </div>

                <div className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-tint px-3 py-1 text-xs font-semibold text-ink">
                      {item.media_type === "video" ? (
                        <Video size={13} />
                      ) : (
                        <ImageIcon size={13} />
                      )}
                      {item.media_type === "video"
                        ? t("mediaFilterVideos")
                        : t("mediaFilterInfographics")}
                    </span>
                    <span className="rounded-full bg-tint px-3 py-1 text-xs text-ink-muted">
                      {categoryLabels[item.category] ?? categoryLabels.other}
                    </span>
                  </div>

                  <h3 className="mt-4 text-ink-muted font-heading text-lg font-bold">
                    {title}
                  </h3>
                  {description && (
                    <p className="mt-2 text-sm leading-6 text-ink-muted">
                      {description}
                    </p>
                  )}
                  {item.media_type === "video" && (
                    <p className="mt-4 flex items-center gap-2 text-xs text-ink-subtle">
                      <Play size={13} />
                      {t("mediaWatchLabel")}
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

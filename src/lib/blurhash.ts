import { decode, isBlurhashValid } from "blurhash";

/**
 * Postgres "column does not exist" / PostgREST "column not in schema cache".
 * Lets queries and inserts fall back gracefully if migration 019 hasn't been applied yet.
 */
export function isMissingColumnError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    /column .* (does not exist|could not find)/i.test(error.message ?? "")
  );
}

/**
 * Turn a blurhash into a tiny inline SVG data URL.
 *
 * Decoding to a 4x3 grid of colours and letting an SVG Gaussian blur smear
 * them gives a faithful placeholder without <canvas>, so the same markup
 * renders on the server and the client (no hydration mismatch) and can be
 * passed straight to next/image's `blurDataURL`.
 */
export function blurhashToDataURL(hash: string | null | undefined, width = 4, height = 3) {
  if (!hash || !isBlurhashValid(hash).result) return undefined;

  const pixels = decode(hash, width, height);
  let rects = "";

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const fill = `rgb(${pixels[i]},${pixels[i + 1]},${pixels[i + 2]})`;
      rects += `<rect x='${x}' y='${y}' width='1.05' height='1.05' fill='${fill}'/>`;
    }
  }

  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${width} ${height}' preserveAspectRatio='none'>` +
    `<filter id='b' x='-10%' y='-10%' width='120%' height='120%'><feGaussianBlur stdDeviation='0.6'/></filter>` +
    `<g filter='url(#b)'>${rects}</g></svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

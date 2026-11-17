import "server-only";
import { encode } from "blurhash";

/**
 * Compute a blurhash for an uploaded image (JPEG/PNG/WebP).
 * Returns null instead of throwing: a missing placeholder must never block an upload.
 */
export async function computeBlurhash(bytes: Buffer): Promise<string | null> {
  try {
    const { default: sharp } = await import("sharp");
    const { data, info } = await sharp(bytes)
      .rotate() // honour EXIF orientation
      .resize(32, 32, { fit: "inside" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    return encode(new Uint8ClampedArray(data), info.width, info.height, 4, 3);
  } catch (error) {
    console.warn("Blurhash generation skipped:", error);
    return null;
  }
}

export { isMissingColumnError } from "@/lib/blurhash";

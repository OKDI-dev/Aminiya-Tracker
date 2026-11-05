"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";
import { cn } from "@/lib/utils";
import { blurhashToDataURL } from "@/lib/blurhash";

type BlurImageProps = Omit<ImageProps, "placeholder" | "blurDataURL" | "onLoad"> & {
  blurhash?: string | null;
  /** Classes for the wrapper that holds the placeholder. */
  wrapperClassName?: string;
};

/**
 * next/image with a blurhash placeholder that "materializes" into the photo
 * (blur + opacity + slight scale on load). Without a hash it falls back to a
 * shimmer skeleton so layout never jumps.
 */
export function BlurImage({
  blurhash,
  wrapperClassName,
  className,
  alt,
  fill,
  ...props
}: BlurImageProps) {
  const [loaded, setLoaded] = useState(false);
  const placeholder = blurhashToDataURL(blurhash);

  return (
    <span
      className={cn(
        "block overflow-hidden",
        fill ? "absolute inset-0" : "relative",
        !placeholder && !loaded && "skeleton-shimmer",
        wrapperClassName
      )}
      style={
        placeholder
          ? {
              backgroundImage: `url("${placeholder}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
    >
      <Image
        {...props}
        fill={fill}
        alt={alt}
        data-loaded={loaded}
        onLoad={() => setLoaded(true)}
        className={cn("blur-image", className)}
      />
    </span>
  );
}

"use client";

import Image, { type StaticImageData } from "next/image";
import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";

/**
 * Hero art that leans toward the pointer.
 *
 * Replaces the old infinite keyframe float + hover shake (not interruptible,
 * and a slow loop near the vestibular-sensitive ~0.3 Hz range). Pointer
 * position drives springs, so motion always continues from where it is,
 * reverses instantly, and settles when the pointer leaves.
 */
export default function HeroIllustration({
  src,
  alt,
}: {
  src: StaticImageData;
  alt: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0);
  const py = useMotionValue(0);

  // Independent X/Y springs (critically damped) — never one 2D spring.
  const sx = useSpring(px, { bounce: 0, visualDuration: 0.5 });
  const sy = useSpring(py, { bounce: 0, visualDuration: 0.5 });

  const rotateY = useTransform(sx, [-1, 1], [-7, 7]);
  const rotateX = useTransform(sy, [-1, 1], [6, -6]);
  const x = useTransform(sx, [-1, 1], [-10, 10]);
  const y = useTransform(sy, [-1, 1], [-8, 8]);
  const glowX = useTransform(sx, [-1, 1], [-24, 24]);
  const glowY = useTransform(sy, [-1, 1], [-18, 18]);

  function onPointerMove(event: React.PointerEvent) {
    if (event.pointerType === "touch") return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    px.set(((event.clientX - rect.left) / rect.width) * 2 - 1);
    py.set(((event.clientY - rect.top) / rect.height) * 2 - 1);
  }

  function onPointerLeave() {
    px.set(0);
    py.set(0);
  }

  return (
    <div
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className="relative flex items-center justify-center [perspective:1200px]"
    >
      <motion.div
        aria-hidden="true"
        style={{ x: glowX, y: glowY }}
        className="absolute inset-8 rounded-full bg-[#fff0e5] blur-3xl"
      />
      <motion.div
        style={{ rotateX, rotateY, x, y }}
        className="relative w-full max-w-[540px] will-change-transform"
      >
        <Image
          src={src}
          alt={alt}
          priority
          placeholder="blur"
          sizes="(max-width: 1024px) 90vw, 540px"
          className="h-auto w-full object-contain drop-shadow-[0_24px_28px_rgb(255_102_0/0.14)]"
        />
      </motion.div>
    </div>
  );
}

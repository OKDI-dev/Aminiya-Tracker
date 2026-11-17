"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { springs } from "@/lib/motion";

const words = ["Voice.", "Community.", "Future."];

export default function RotatingHomeWord() {
  const [activeWord, setActiveWord] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveWord((current) => (current + 1) % words.length);
    }, 2800);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <span
      className="relative inline-grid min-h-[1.12em] overflow-hidden align-bottom text-[#ff6600]"
      aria-live="polite"
      aria-atomic="true"
    >
      {/* popLayout + springs: a new word can arrive mid-exit without a jump. */}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={activeWord}
          initial={{ opacity: 0, y: "0.6em", filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: "-0.6em", filter: "blur(4px)" }}
          transition={springs.default}
          className="inline-block"
        >
          {words[activeWord]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

"use client";

import { useEffect, useState } from "react";

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
      className="relative inline-grid min-h-[1.12em] text-[#ff6600]"
      aria-live="polite"
      aria-atomic="true"
    >
      <span
        key={activeWord}
        className="animate-home-word"
      >
        {words[activeWord]}
      </span>
    </span>
  );
}

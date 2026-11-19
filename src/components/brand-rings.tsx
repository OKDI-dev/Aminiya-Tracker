/**
 * The logo's target mark (grey ring, orange centre) scaled up as a quiet
 * backdrop for ink sections. Place inside a `relative isolate overflow-hidden`
 * parent; `className` positions the ring centre.
 */
export default function BrandRings({
  className = "top-1/2 left-1/2",
  size = 1100,
}: {
  className?: string;
  size?: number;
}) {
  const c = size / 2;
  const radii = [0.16, 0.245, 0.33, 0.41, 0.49].map((f) => Math.round(f * size));

  return (
    <div
      aria-hidden="true"
      style={{ width: size, height: size }}
      className={`pointer-events-none absolute -z-10 -translate-x-1/2 -translate-y-1/2 ${className}`}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 size-full" fill="none">
        {radii.map((r, i) => (
          <circle
            key={r}
            cx={c}
            cy={c}
            r={r}
            stroke="white"
            strokeOpacity={0.09 - i * 0.014}
            strokeWidth={i === 0 ? size * 0.025 : 1.5}
          />
        ))}
      </svg>
    </div>
  );
}

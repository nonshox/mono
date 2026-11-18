/** Percent shown as a hairline ring — the number is never printed. */
export function ProgressRing({
  percent,
  className = "size-4",
}: {
  percent: number;
  className?: string;
}) {
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));
  const radius = 6.5;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  return (
    <svg aria-hidden="true" className={`-rotate-90 ${className}`} fill="none" viewBox="0 0 18 18">
      <circle
        cx="9"
        cy="9"
        r={radius}
        stroke="currentColor"
        strokeOpacity={0.28}
        strokeWidth={2.2}
      />
      <circle
        cx="9"
        cy="9"
        r={radius}
        className="transition-[stroke-dashoffset] duration-300"
        stroke="currentColor"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        strokeWidth={2.2}
      />
    </svg>
  );
}

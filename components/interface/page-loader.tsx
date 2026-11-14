import Image from "next/image";

/**
 * The one page loader Mono uses everywhere. Branded, quiet, black-on-white.
 */
export function PageLoader({ label = "Loading Mono" }: { label?: string }) {
  return (
    <div
      aria-label={label}
      className="grid min-h-[60svh] w-full place-items-center bg-white"
      role="status"
    >
      <div className="grid justify-items-center gap-2.5">
        <Image
          alt=""
          aria-hidden="true"
          className="animate-pulse opacity-90"
          height={36}
          priority
          src="/logotype/logotype.png"
          width={36}
        />
        <span className="text-[9px] font-bold uppercase tracking-[0.32em] text-muted-foreground/70">
          Mono
        </span>
      </div>
    </div>
  );
}

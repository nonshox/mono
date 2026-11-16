type UserAvatarProps = {
  name?: string;
  size?: number;
  className?: string;
  /** Ignored in this base build — kept so avatar code can be re-added later. */
  avatar?: string | null;
};

/** Initials avatar. This base ships without avatar storage. */
export function UserAvatar({ name, size = 40, className }: UserAvatarProps) {
  const dimension = `${size}px`;
  const initial = (name?.trim() || "?").charAt(0).toUpperCase();

  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full bg-muted font-semibold text-foreground ring-1 ring-border/60 ${className ?? ""}`}
      style={{ height: dimension, width: dimension, fontSize: size * 0.4 }}
    >
      {initial}
    </span>
  );
}


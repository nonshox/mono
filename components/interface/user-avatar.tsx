import Image from "next/image";
import { filePath } from "@/features/files/url";

type UserAvatarProps = {
  name?: string;
  size?: number;
  className?: string;
  /** Appwrite file id from `users.avatar`; initials when absent. */
  avatar?: string | null;
};

/** Avatar from mono's own storage API, or initials when not set. */
export function UserAvatar({
  name,
  size = 40,
  className,
  avatar,
}: UserAvatarProps) {
  const dimension = `${size}px`;
  const base = `shrink-0 rounded-full object-cover ring-1 ring-border/60 ${className ?? ""}`;
  const src = filePath(avatar);

  if (src) {
    return (
      <Image
        alt={name ? `${name}'s avatar` : "avatar"}
        className={base}
        height={size}
        src={src}
        style={{ height: dimension, width: dimension }}
        width={size}
      />
    );
  }

  const initial = (name?.trim() || "?").charAt(0).toUpperCase();

  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full bg-muted font-semibold text-muted-foreground ring-1 ring-border/60 ${className ?? ""}`}
      style={{ height: dimension, width: dimension, fontSize: size * 0.36 }}
    >
      {initial}
    </span>
  );
}

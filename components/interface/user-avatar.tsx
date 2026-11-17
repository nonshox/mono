"use client";

import { useState } from "react";
import { avatarUrl } from "@/features/users/client-api";

type UserAvatarProps = {
  name?: string;
  size?: number;
  className?: string;
  /** Storage file id (see `avatar` on the user row). Falls back to initials. */
  avatar?: string | null;
};

/** Avatar image with an initials fallback when no photo is set or it fails to load. */
export function UserAvatar({ name, size = 40, className, avatar }: UserAvatarProps) {
  const dimension = `${size}px`;
  const initial = (name?.trim() || "?").charAt(0).toUpperCase();
  const src = avatarUrl(avatar);
  const [broken, setBroken] = useState(false);

  if (src && !broken) {
    return (
      // Plain img: `/api/avatar` is dynamic and auth-guarded; sizes vary by caller.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt=""
        aria-hidden="true"
        className={`shrink-0 rounded-full object-cover ring-1 ring-border/60 ${className ?? ""}`}
        height={dimension}
        onError={() => setBroken(true)}
        src={src}
        width={dimension}
      />
    );
  }

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

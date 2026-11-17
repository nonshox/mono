import { Pencil, Mail, CalendarDays } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { getCurrentAccount } from "@/features/auth/session";
import { getUserRow } from "@/features/users/service";
import { PageLoader } from "@/components/interface/page-loader";
import { SessionExpired } from "@/components/interface/session-expired";
import { UserAvatar } from "@/components/interface/user-avatar";

export const metadata = {
  title: "Profile",
};

export default function ProfilePage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AuthenticatedProfile />
    </Suspense>
  );
}

async function AuthenticatedProfile() {
  const account = await getCurrentAccount();
  if (!account) {
    return <SessionExpired />;
  }

  const user = await getUserRow(account.$id).catch(() => null);
  const name = user?.name.trim() || "";
  const email = account.email;
  const joined = user?.$createdAt
    ? new Intl.DateTimeFormat(undefined, {
        month: "long",
        year: "numeric",
      }).format(new Date(user.$createdAt))
    : null;

  return (
    <main className="min-h-full w-full bg-background px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
      <div className="mx-auto w-full max-w-2xl md:max-w-3xl">
        {/* Identity */}
        <header className="flex items-center gap-4 border-b border-border/60 pb-5">
          <UserAvatar
            avatar={user?.avatar || undefined}
            name={name || email}
            size={72}
          />
          <div className="min-w-0 flex-1">
            <h1 className="type-title truncate text-foreground">
              {name || "Your name"}
            </h1>
            <p className="mt-0.5 truncate text-sm text-foreground">
              {email}
            </p>
          </div>
          <Link
            aria-label="Edit profile"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-foreground outline-none transition hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            href="/profile/edit"
          >
            <Pencil aria-hidden="true" className="size-4" strokeWidth={1.8} />
          </Link>
        </header>

        {/* Details */}
        <dl className="divide-y divide-border/60 border-b border-border/60">
          <div className="flex items-center gap-3 py-3">
            <Mail aria-hidden="true" className="size-4 shrink-0 text-foreground" strokeWidth={1.8} />
            <div className="min-w-0">
              <dt className="type-eyebrow">
                Email
              </dt>
              <dd className="mt-0.5 truncate text-xs font-medium text-foreground">{email}</dd>
            </div>
          </div>
          {joined && (
            <div className="flex items-center gap-3 py-3">
              <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-foreground" strokeWidth={1.8} />
              <div className="min-w-0">
                <dt className="type-eyebrow">
                  Member since
                </dt>
                <dd className="mt-0.5 text-xs font-medium text-foreground">{joined}</dd>
              </div>
            </div>
          )}
        </dl>
      </div>
    </main>
  );
}




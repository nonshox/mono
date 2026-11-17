import { Pencil, Mail, CalendarDays } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { getCurrentAccount, AppwriteUnavailableError } from "@/features/auth/session";
import { getUserRow } from "@/features/users/service";
import { PageLoader } from "@/components/interface/page-loader";
import { SessionExpired } from "@/components/interface/session-expired";
import { ServiceUnavailable } from "@/components/interface/service-unavailable";
import { UserAvatar } from "@/components/interface/user-avatar";
import { ActionsEditor } from "@/components/interface/actions-editor";

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
  let account;
  try {
    account = await getCurrentAccount();
  } catch (error) {
    if (error instanceof AppwriteUnavailableError) {
      return <ServiceUnavailable />;
    }
    throw error;
  }
  if (!account) {
    return <SessionExpired />;
  }

  const user = await getUserRow(account.$id).catch(() => null);
  const name = user?.name.trim() || "";
  const email = account.email;
  const actions = user?.actions ?? [];
  const joined = user?.$createdAt
    ? new Intl.DateTimeFormat(undefined, {
        month: "long",
        year: "numeric",
      }).format(new Date(user.$createdAt))
    : null;

  return (
    <main className="min-h-full w-full bg-background px-3 pb-24 pt-5 sm:px-6 sm:pt-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 md:max-w-3xl">
        <header className="px-1">
          <h1 className="type-title text-foreground">Profile</h1>
        </header>

        <section
          aria-label="Profile"
          className="rounded-2xl border-2 border-border/70 bg-popover"
        >
          {/* Identity */}
          <div className="flex items-center gap-4 px-4 pt-4 sm:px-6 sm:pt-6">
            <UserAvatar
              avatar={user?.avatar || undefined}
              name={name || email}
              size={76}
            />
            <div className="min-w-0 flex-1">
              <h2 className="type-section truncate text-foreground">
                {name || "Your name"}
              </h2>
            </div>
            <Link
              aria-label="Edit profile"
              className="grid size-10 shrink-0 place-items-center rounded-full text-foreground outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              href="/profile/edit"
            >
              <Pencil
                aria-hidden="true"
                className="size-[18px]"
                strokeWidth={1.8}
              />
            </Link>
          </div>

          {/* Email */}
          <div className="my-4 flex items-center gap-3 border-t border-border/60 px-4 pt-3 sm:px-6 sm:pt-4">
            <Mail
              aria-hidden="true"
              className="size-4 shrink-0 text-foreground"
              strokeWidth={1.8}
            />
            <p className="min-w-0 break-all text-sm leading-5 text-foreground">{email}</p>
          </div>

          {/* Member since */}
          {joined && (
            <div className="flex items-center gap-3 border-t border-border/60 px-4 py-3 sm:px-6 sm:py-4">
              <CalendarDays
                aria-hidden="true"
                className="size-4 shrink-0 text-foreground"
                strokeWidth={1.8}
              />
              <p className="text-sm leading-5 text-foreground">
                Member since <span className="font-semibold">{joined}</span>
              </p>
            </div>
          )}

          {/* Actions */}
          <ActionsEditor initial={actions} />
        </section>
      </div>
    </main>
  );
}

import { Suspense } from "react";
import { ProfileEditor } from "@/components/features/profile/profile-editor";
import { PageLoader } from "@/components/shared/page-loader";
import { SessionExpired } from "@/components/shared/session-expired";
import { ServiceUnavailable } from "@/components/shared/service-unavailable";
import { getCurrentAccount, AppwriteUnavailableError } from "@/features/auth/session";

export const metadata = {
  title: "Edit profile",
};

export default function EditProfilePage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AuthenticatedEditor />
    </Suspense>
  );
}

async function AuthenticatedEditor() {
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

  return <ProfileEditor />;
}

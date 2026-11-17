import { Suspense } from "react";
import { ProfileEditor } from "@/components/interface/profile-editor";
import { PageLoader } from "@/components/interface/page-loader";
import { SessionExpired } from "@/components/interface/session-expired";
import { ServiceUnavailable } from "@/components/interface/service-unavailable";
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

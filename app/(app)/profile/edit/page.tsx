import { Suspense } from "react";
import { ProfileEditor } from "@/components/interface/profile-editor";
import { ProfileSkeleton } from "@/components/interface/skeletons";
import { SessionExpired } from "@/components/interface/session-expired";
import { getCurrentAccount } from "@/features/auth/session";

export const metadata = {
  title: "Edit profile",
};

export default function EditProfilePage() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <AuthenticatedEditor />
    </Suspense>
  );
}

async function AuthenticatedEditor() {
  const account = await getCurrentAccount();
  if (!account) {
    return <SessionExpired />;
  }

  return <ProfileEditor />;
}

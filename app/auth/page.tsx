import { AuthExperience } from "@/components/interface/auth-experience";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function AuthPage() {
  return (
    <Suspense>
      <AuthExperience />
    </Suspense>
  );
}

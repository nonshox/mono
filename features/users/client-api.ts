import { apiClient } from "@/lib/api-client";

export type UserProfile = {
  email: string;
  name: string;
  avatar?: string;
  nudge?: boolean;
  ai?: boolean;
  /** IANA timezone, stored silently from the browser; drives the evening nudge hour. */
  tz?: string | null;
};

export async function fetchUser(): Promise<UserProfile> {
  const { data } = await apiClient.get<UserProfile>("/users");
  return data;
}

export async function saveUserName(name: string): Promise<UserProfile> {
  const { data } = await apiClient.patch<UserProfile>("/users", { name });
  return data;
}

export async function saveUserNudge(nudge: boolean): Promise<UserProfile> {
  const { data } = await apiClient.patch<UserProfile>("/users", { nudge });
  return data;
}

export async function saveUserAi(ai: boolean): Promise<UserProfile> {
  const { data } = await apiClient.patch<UserProfile>("/users", { ai });
  return data;
}

export async function saveUserTz(tz: string): Promise<UserProfile> {
  const { data } = await apiClient.patch<UserProfile>("/users", { tz });
  return data;
}

export async function uploadAvatar(file: File): Promise<UserProfile> {
  const form = new FormData();
  form.append("avatar", file);
  const { data } = await apiClient.post<UserProfile>("/users/avatar", form);
  return data;
}

export async function removeAvatar(): Promise<UserProfile> {
  const { data } = await apiClient.delete<UserProfile>("/users/avatar");
  return data;
}

/** URL for the avatar endpoint; empty string when no photo is set. */
export function avatarUrl(fileId?: string | null): string {
  return fileId ? `/api/avatar?id=${encodeURIComponent(fileId)}` : "";
}

export async function deleteAccount(): Promise<void> {
  await apiClient.delete("/account");
}

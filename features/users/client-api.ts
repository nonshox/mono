import { apiClient } from "@/lib/api-client";

export type UserProfile = {
  email: string;
  name: string;
  avatar?: string;
  nudge?: boolean;
  ai?: boolean;
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

export async function deleteAccount(): Promise<void> {
  await apiClient.delete("/account");
}

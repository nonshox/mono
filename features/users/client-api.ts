import { apiClient } from "@/lib/api-client";

export type UserProfile = {
  email: string;
  name: string;
  avatar?: string;
};

export async function fetchUser(): Promise<UserProfile> {
  const { data } = await apiClient.get<UserProfile>("/users");
  return data;
}

export async function saveUserName(name: string): Promise<UserProfile> {
  const { data } = await apiClient.patch<UserProfile>("/users", { name });
  return data;
}

export async function saveAvatar(image: File): Promise<string> {
  const form = new FormData();
  form.append("image", image);
  const { data } = await apiClient.post<{ avatar: string }>(
    "/users/avatar",
    form,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data.avatar;
}

export async function clearAvatar(): Promise<void> {
  await apiClient.delete("/users/avatar");
}

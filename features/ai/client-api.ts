import { apiClient } from "@/lib/api-client";

export async function polishEntry(text: string): Promise<string> {
  const { data } = await apiClient.post<{ polished: string }>("/ai/polish", {
    text,
  });
  return data.polished;
}

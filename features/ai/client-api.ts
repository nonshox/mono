import { apiClient } from "@/lib/api-client";

export async function polishEntry(text: string): Promise<string> {
  const { data } = await apiClient.post<{ polished: string }>("/ai/polish", {
    text,
  });
  return data.polished;
}

export type SuggestedDay = {
  rise: string[];
  midday: string[];
  evening: string[];
};

export type SuggestSource = "ai" | "local";

export async function suggestMyDay(): Promise<{
  picks: SuggestedDay;
  source: SuggestSource;
}> {
  const { data } = await apiClient.post<{ picks: SuggestedDay; source: SuggestSource }>(
    "/ai/suggest",
    {},
  );
  return data;
}

export async function suggestBucket(
  bucket: "rise" | "midday" | "evening",
): Promise<{ items: string[]; source: SuggestSource }> {
  const { data } = await apiClient.post<{ items: string[]; source: SuggestSource }>(
    "/ai/suggest",
    { bucket },
  );
  return data;
}

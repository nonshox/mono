import { apiClient } from "@/lib/api-client";

export type SuggestActionsStats = {
  entries: number;
  timelineItems: number;
  windowDays: number;
};

export type SuggestActionsResponse = {
  actions: string[];
  stats: SuggestActionsStats;
};

/** NLP scan of the last 10 days — deterministic, runs on the server. */
export async function suggestActions(): Promise<SuggestActionsResponse> {
  const { data } = await apiClient.post<SuggestActionsResponse>(
    "/ai/suggest-actions",
    {},
  );
  return data;
}

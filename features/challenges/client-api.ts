import { apiClient } from "@/lib/api-client";
import type { Challenge } from "./types";

export async function fetchActiveChallenges(): Promise<
  Array<Challenge & { joined: boolean }>
> {
  const { data } = await apiClient.get<
    Array<{ challenge: Challenge; joined: boolean }>
  >("/challenges");
  return data.map(({ challenge, joined }) => ({ ...challenge, joined }));
}

export async function toggleChallenge(
  id: string,
  join: boolean,
): Promise<boolean> {
  const { data } = await apiClient.post<{ joined: boolean }>(
    `/challenges/${id}`,
    { join },
  );
  return data.joined;
}

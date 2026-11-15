import { apiClient } from "@/lib/api-client";

export type DayEntry = {
  day: string;
  text: string;
};

export async function fetchYearDays(year: number): Promise<DayEntry[]> {
  const { data } = await apiClient.get<{ days: DayEntry[] }>("/days", {
    params: { year },
  });
  return data.days;
}

export async function saveDay(day: string, text: string): Promise<DayEntry> {
  const { data } = await apiClient.post<{ day: DayEntry }>("/days", {
    day,
    text,
  });
  return data.day;
}

export async function deleteDay(day: string): Promise<void> {
  await apiClient.delete("/days", { data: { day } });
}

export async function fetchFlashback(day: string): Promise<DayEntry[]> {
  const { data } = await apiClient.get<{ entries: DayEntry[] }>(
    "/days/flashback",
    { params: { day } },
  );
  return data.entries;
}

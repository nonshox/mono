import { apiClient } from "@/lib/api-client";
import type { TimelineItem, Bucket } from "./types";

export async function fetchToday(): Promise<{
  items: TimelineItem[];
  satisfied: number | null;
  day: string;
}> {
  const { data } = await apiClient.get<{
    items: TimelineItem[];
    satisfied: number | null;
    day: string;
  }>("/today");
  return data;
}

export async function createItem(
  bucket: Bucket,
  text: string,
): Promise<TimelineItem> {
  const { data } = await apiClient.post<{ item: TimelineItem }>("/today", {
    bucket,
    text,
  });
  return data.item;
}

export async function setItemDone(id: string, done: boolean): Promise<void> {
  await apiClient.patch("/today", { kind: "toggle", id, done });
}

export async function moveItem(
  id: string,
  direction: "up" | "down",
): Promise<void> {
  await apiClient.patch("/today", { kind: "move", id, direction });
}

export async function editItemText(id: string, text: string): Promise<void> {
  await apiClient.patch("/today", { kind: "edit", id, text });
}

export async function deleteItem(id: string): Promise<void> {
  await apiClient.delete("/today", { data: { id } });
}

export async function saveSatisfied(satisfied: number): Promise<void> {
  await apiClient.post("/today/satisfy", { satisfied });
}

export async function resetTicks(): Promise<void> {
  await apiClient.post("/today/reset", {});
}

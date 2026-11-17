import { apiClient } from "@/lib/api-client";
import type { TimelineItem, Bucket } from "./types";

export async function fetchCheck(): Promise<{
  items: TimelineItem[];
  satisfied: number | null;
  day: string;
}> {
  const { data } = await apiClient.get<{
    items: TimelineItem[];
    satisfied: number | null;
    day: string;
  }>("/check");
  return data;
}

export async function createItem(
  bucket: Bucket,
  text: string,
): Promise<TimelineItem> {
  const { data } = await apiClient.post<{ item: TimelineItem }>("/check", {
    bucket,
    text,
  });
  return data.item;
}

export async function setItemDone(id: string, done: boolean): Promise<void> {
  await apiClient.patch("/check", { kind: "toggle", id, done });
}

export async function moveItem(
  id: string,
  direction: "up" | "down",
): Promise<void> {
  await apiClient.patch("/check", { kind: "move", id, direction });
}

export async function editItemText(id: string, text: string): Promise<void> {
  await apiClient.patch("/check", { kind: "edit", id, text });
}

export async function deleteItem(id: string): Promise<void> {
  await apiClient.delete("/check", { data: { id } });
}

export async function saveSatisfied(satisfied: number): Promise<void> {
  await apiClient.post("/check/satisfy", { satisfied });
}

export async function resetTicks(): Promise<void> {
  await apiClient.post("/check/reset", {});
}

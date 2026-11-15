import { apiClient } from "@/lib/api-client";

export type BrainTask = {
  id: string;
  text: string;
  done: boolean;
};

export async function fetchBrainTasks(): Promise<BrainTask[]> {
  const { data } = await apiClient.get<{ tasks: BrainTask[] }>("/brain");
  return data.tasks;
}

export async function createBrainTasks(text: string): Promise<BrainTask[]> {
  const { data } = await apiClient.post<{ tasks: BrainTask[] }>("/brain", {
    text,
  });
  return data.tasks;
}

export async function setBrainTaskDone(
  id: string,
  done: boolean,
): Promise<void> {
  await apiClient.patch("/brain", { id, done });
}

export async function deleteBrainTask(id: string): Promise<void> {
  await apiClient.delete("/brain", { data: { id } });
}

export async function tidyBrain(): Promise<BrainTask[]> {
  const { data } = await apiClient.post<{ tasks: BrainTask[] }>("/brain/tidy");
  return data.tasks;
}

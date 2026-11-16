export type Bucket = "rise" | "midday" | "evening";
export const BUCKETS: Bucket[] = ["rise", "midday", "evening"];
export const BUCKET_LABELS: Record<Bucket, string> = {
  rise: "Rise",
  midday: "Midday",
  evening: "Evening",
};

export type TimelineItem = {
  id: string;
  bucket: Bucket;
  text: string;
  order: number;
  done: boolean;
};

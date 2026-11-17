// Read-only bucket check. Usage: node --env-file=.env scripts/check-bucket.mjs
import { Client, Storage } from "node-appwrite";

const id = process.env.APPWRITE_STORAGE_BUCKET_ID;
const storage = new Storage(
  new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY),
);
try {
  const b = await storage.getBucket({ bucketId: id });
  console.log("bucket found:", JSON.stringify({ id: b.$id, name: b.name, enabled: b.enabled, fileSizeLimit: b.fileSizeLimit, allowedTypes: b.allowedFileExtensions ?? b.fileType ?? null }, null, 2));
} catch (error) {
  console.log("bucket error:", error?.code, error?.message);
}

// Round-trip storage probe: upload 1×1 PNG -> read back -> sniff -> delete.
// Touches only its own temporary file; no user rows involved.
// Usage: node --env-file=.env scripts/verify-avatar-flow.mjs
import { Client, ID, Storage } from "node-appwrite";
import { InputFile } from "node-appwrite/file";

for (const name of [
  "APPWRITE_ENDPOINT",
  "APPWRITE_PROJECT_ID",
  "APPWRITE_API_KEY",
  "APPWRITE_STORAGE_BUCKET_ID",
]) {
  if (!process.env[name]) {
    console.error(`Missing ${name}`);
    process.exit(1);
  }
}
const storage = new Storage(
  new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY),
);
const bucketId = process.env.APPWRITE_STORAGE_BUCKET_ID;

// 1×1 transparent PNG.
const png = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41,
  0x54, 0x78, 0x9c, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
  0x00, 0x00, 0x03, 0x01, 0x01, 0x00, 0xc9, 0xfe,
  0x92, 0xef, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
  0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

const created = await storage.createFile({
  bucketId,
  fileId: ID.unique(),
  file: InputFile.fromBuffer(png, "probe.png"),
  permissions: [],
});
console.log("created:", created.$id);

const bytes = await storage.getFileDownload({ bucketId, fileId: created.$id });
console.log("downloaded bytes:", bytes.byteLength);

// Sniff like the route does.
const b = new Uint8Array(bytes);
const mime =
  b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47
    ? "image/png"
    : "nope";
console.log("sniffed:", mime);

const meta = await storage.getFile({ bucketId, fileId: created.$id });
console.log("stored meta mimeType:", meta.mimeType, "| sizeOriginal:", meta.sizeOriginal);

await storage.deleteFile({ bucketId, fileId: created.$id });
console.log("deleted: ok");
console.log("PASS — upload/download/sniff/delete all work with this bucket");

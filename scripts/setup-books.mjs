// One-off, idempotent provisioning for the reading journey table.
// Usage: node --env-file=.env scripts/setup-books.mjs
import { AppwriteException, Client, TablesDB } from "node-appwrite";

const required = [
  "APPWRITE_ENDPOINT",
  "APPWRITE_PROJECT_ID",
  "APPWRITE_API_KEY",
  "APPWRITE_DATABASE_ID",
];
for (const name of required) {
  if (!process.env[name]) {
    console.error(`Missing ${name} — fill .env and retry.`);
    process.exit(1);
  }
}

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);
const db = new TablesDB(client);
const databaseId = process.env.APPWRITE_DATABASE_ID;

const tableExists = async (tableId) => {
  try {
    await db.getTable({ databaseId, tableId });
    return true;
  } catch (error) {
    if (error instanceof AppwriteException && error.code === 404) return false;
    throw error;
  }
};

if (await tableExists("books")) {
  console.log("books: already exists — keeping it");
} else {
  await db.createTable({
    databaseId,
    tableId: "books",
    name: "books",
    permissions: [],
    columns: [
      { key: "user", type: "string", size: 36, required: true },
      { key: "title", type: "string", size: 200, required: true },
      { key: "author", type: "string", size: 200, required: false, xdefault: "" },
      { key: "note", type: "string", size: 1000, required: false, xdefault: "" },
    ],
    indexes: [{ key: "user", type: "key", attributes: ["user"], orders: ["ASC"] }],
  });
  console.log("books: created (user, title, author, note + key on user)");
}

// Optional "approximate days to finish" — added separately so existing tables get upgraded too.
const booksColumns = await db.listColumns({ databaseId, tableId: "books" });
const ensureIntegerColumn = async (key) => {
  if (booksColumns.columns.some((column) => column.key === key)) {
    console.log(`books.${key}: already exists — keeping it`);
    return;
  }
  await db.createIntegerColumn({
    databaseId,
    tableId: "books",
    key,
    required: false,
    xdefault: null,
  });
  console.log(`books.${key}: created (integer, optional, default null)`);
};

await ensureIntegerColumn("days");

console.log("Setup complete.");

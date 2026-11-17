import { z } from "zod";
import {
  getAuthAccount,
  jsonError,
  logFailure,
} from "@/lib/http";
import { listAllEntries } from "@/features/days/service";
import { listTimeline } from "@/features/check/service";
import { getUserRow } from "@/features/users/service";
import { buildMarkdown, buildPayload } from "@/features/export/build";
import { todayUtc } from "@/lib/dates";

const formatSchema = z.enum(["json", "markdown"]);

/** GET /api/export?format=json|markdown — downloads everything Mono stores. */
export async function GET(request: Request) {
  const auth = await getAuthAccount("Export");
  if ("response" in auth) {
    return auth.response;
  }
  if (!auth.account) {
    return jsonError(401, "UNAUTHENTICATED", "Sign in to export your data.");
  }

  const rawFormat = new URL(request.url).searchParams.get("format") ?? "json";
  const parsed = formatSchema.safeParse(rawFormat);
  if (!parsed.success) {
    return jsonError(400, "INVALID_FORMAT", "Choose json or markdown.");
  }

  try {
    const [entries, items, row] = await Promise.all([
      listAllEntries(auth.account.$id),
      listTimeline(auth.account.$id),
      getUserRow(auth.account.$id),
    ]);
    const profile = {
      name: row?.name ?? "",
      email: row?.email ?? auth.account.email,
    };
    const payload = buildPayload({
      exportedAt: new Date().toISOString(),
      profile,
      days: entries.map((entry) => ({
        day: entry.day,
        text: entry.text,
        satisfied: entry.satisfied ?? null,
      })),
      timeline: items.map((item) => ({
        bucket: item.bucket,
        text: item.text,
        order: item.order,
        done: item.done,
      })),
    });
    const stamp = todayUtc();

    if (parsed.data === "markdown") {
      return new Response(buildMarkdown(payload), {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="mono-export-${stamp}.md"`,
          "Cache-Control": "private, no-store",
        },
      });
    }

    return new Response(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="mono-export-${stamp}.json"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    logFailure("Export", error);
    return jsonError(502, "EXPORT_FAILED", "Your export could not be built.");
  }
}

import { NextResponse } from "next/server";
import {
  getAuthAccount,
  isSameOrigin,
  jsonError,
  logFailure,
} from "@/lib/http";
import {
  isAllowedImage,
  uploadFile,
} from "@/features/files/service";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return jsonError(403, "ORIGIN_REJECTED", "Request origin was rejected.");
  }

  const auth = await getAuthAccount("File upload");
  if ("response" in auth) {
    return auth.response;
  }
  if (!auth.account) {
    return jsonError(401, "UNAUTHENTICATED", "Sign in to upload files.");
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError(400, "INVALID_FORM", "Send the file as multipart form data.");
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return jsonError(400, "INVALID_FORM", "Attach a file field named 'file'.");
  }
  if (!isAllowedImage(file.type, file.size)) {
    return jsonError(
      400,
      "IMAGE_INVALID",
      "Use a JPEG, PNG, or WebP image under 4 MB.",
    );
  }

  try {
    const uploaded = await uploadFile({
      buffer: Buffer.from(await file.arrayBuffer()),
      filename: file.name,
      contentType: file.type,
      publicRead: form.get("public") === "1",
    });
    return NextResponse.json({ file: uploaded }, { status: 201 });
  } catch (error) {
    logFailure("File upload", error);
    return jsonError(502, "UPLOAD_FAILED", "The file could not be stored.");
  }
}

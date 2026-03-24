import { auth } from "@clerk/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { NextResponse } from "next/server";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { extractBookMetadataWithFallback } from "@/lib/books-metadata/service";
import { createLibraryExtractionResponse } from "@/lib/library/import";
import { resolveRoleFromClaims } from "@/lib/rbac";

export const runtime = "nodejs";
export const maxDuration = 300;

type Role = "student" | "professor" | "admin" | "superadmin";

function isAdminRole(role: Role | null): boolean {
  return role === "admin" || role === "superadmin";
}

function isPdfFile(file: File): boolean {
  if (file.type === "application/pdf") {
    return true;
  }

  return file.name.toLowerCase().endsWith(".pdf");
}

function isPdfFileName(fileName: string): boolean {
  return fileName.toLowerCase().endsWith(".pdf");
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Metadata extraction failed";
}

export async function POST(request: Request) {
  const authData = await auth();

  if (!authData.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = resolveRoleFromClaims(
    authData.sessionClaims as Record<string, unknown> | null | undefined,
  ) as Role | null;

  if (!isAdminRole(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const token = await authData.getToken({ template: "convex" });
  const fetchOptions = token ? { token } : undefined;

  try {
    const formData = await request.formData();
    const storageIdValue = formData.get("storageId");
    const fileNameValue = formData.get("fileName");
    const fileValue = formData.get("file");

    let fileName = "";
    let fileBuffer: Buffer | null = null;

    if (
      typeof storageIdValue === "string" &&
      storageIdValue.trim().length > 0
    ) {
      if (!fetchOptions) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const storageId = storageIdValue.trim() as Id<"_storage">;
      fileName =
        typeof fileNameValue === "string" && fileNameValue.trim().length > 0
          ? fileNameValue.trim()
          : `${storageId}.pdf`;

      if (!isPdfFileName(fileName)) {
        return NextResponse.json(
          { error: "Only PDF files are allowed." },
          { status: 400 },
        );
      }

      const fileUrl = await fetchQuery(
        api.library.getLibraryUploadDownloadUrl,
        { storageId },
        fetchOptions,
      );

      const fileResponse = await fetch(fileUrl, { cache: "no-store" });
      if (!fileResponse.ok) {
        return NextResponse.json(
          {
            error: `Unable to read uploaded PDF (HTTP ${fileResponse.status}).`,
          },
          { status: 400 },
        );
      }

      fileBuffer = Buffer.from(await fileResponse.arrayBuffer());
    } else if (fileValue instanceof File) {
      const file = fileValue;
      fileName = file.name;

      if (!isPdfFile(file)) {
        return NextResponse.json(
          { error: "Only PDF files are allowed." },
          { status: 400 },
        );
      }

      if (file.size <= 0) {
        return NextResponse.json(
          { error: "The uploaded PDF is empty." },
          { status: 400 },
        );
      }

      fileBuffer = Buffer.from(await file.arrayBuffer());
    } else {
      return NextResponse.json(
        { error: "A PDF file or storageId is required." },
        { status: 400 },
      );
    }

    if (!fileBuffer || fileBuffer.byteLength <= 0) {
      return NextResponse.json(
        { error: "The uploaded PDF is empty." },
        { status: 400 },
      );
    }

    const result = await extractBookMetadataWithFallback({
      fileName,
      fileBuffer,
    });
    return NextResponse.json(createLibraryExtractionResponse(result));
  } catch (error) {
    console.error("[library.extract] route error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}

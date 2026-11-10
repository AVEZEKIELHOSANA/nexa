/** Helpers for files attached to courses. Safe for client and server code. */
export type AssetKind = "image" | "audio" | "pdf" | "other";

export const COURSE_ASSET_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "audio/mpeg", "audio/mp4", "audio/wav", "audio/ogg", "application/pdf"];
export const COURSE_ASSET_MAX_BYTES = 10 * 1024 * 1024;
export const COURSE_ASSET_MAX_FILES = 10;

export function assetKind(path: string): AssetKind {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return "image";
  if (["mp3", "m4a", "wav", "ogg"].includes(ext)) return "audio";
  if (ext === "pdf") return "pdf";
  return "other";
}

/** "<course id>/<random>-<name>.png" -> "name.png" */
export function assetLabel(path: string): string {
  const file = path.split("/").pop() ?? path;
  return file.replace(/^[0-9a-f]{8}-/, "");
}

/** Safe file name part for a storage path. */
export function safeFileName(name: string): string {
  const cleaned = name.normalize("NFKD").replace(/[^\w.\- ]+/g, "").trim().replace(/\s+/g, "-").slice(-80);
  return cleaned || "file";
}

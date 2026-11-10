import { createClient } from "@/lib/supabase/client";

/**
 * Browser-side file upload to a storage bucket. Who may write where is decided by the bucket's
 * storage policies (admins for course-assets, a professional's own folder for credentials), not by
 * this code. Returns the stored path.
 */
export async function uploadFile(bucket: "course-assets" | "credentials", path: string, file: File, opts: { upsert?: boolean } = {}): Promise<string> {
  const supabase = createClient();
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: opts.upsert ?? false, cacheControl: "3600" });
  if (error) {
    if (/exceeded|too large|size/i.test(error.message)) throw new Error("That file is too large.");
    if (/mime|type/i.test(error.message)) throw new Error("That file type is not allowed.");
    if (/row-level|policy|unauthorized/i.test(error.message)) throw new Error("You are not allowed to upload here.");
    throw new Error("The upload failed. Please try again.");
  }
  return path;
}

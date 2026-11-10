"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { attachCredentialsAction, openMyCredentialsAction, saveProfessionalSettingsAction } from "@/lib/actions/settings";
import { safeFileName } from "@/lib/assets";
import { uploadFile } from "@/lib/data/uploads";

const CREDENTIAL_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const CREDENTIAL_MAX = 5 * 1024 * 1024;

export function ProSettingsForm({
  userId,
  email,
  initial,
  careers,
  verification,
}: {
  userId: string;
  email: string;
  initial: { name: string; bio: string; experienceYears: number | null; careerId: string };
  careers: { id: string; name: string }[];
  verification: { status: "pending" | "verified" | "rejected"; reason: string | null; hasCredentials: boolean; fileName: string | null };
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [bio, setBio] = useState(initial.bio);
  const [years, setYears] = useState(initial.experienceYears === null ? "" : String(initial.experienceYears));
  const [careerId, setCareerId] = useState(initial.careerId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  // the current career may be archived: keep it selectable so saving does not silently change it
  const options = careers.some((c) => c.id === initial.careerId) ? careers : [{ id: initial.careerId, name: "Current career (archived)" }, ...careers];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const r = await saveProfessionalSettingsAction({ name, bio, experienceYears: years.trim() ? Number(years) : null, careerId });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    toast.success("Profile saved");
    router.refresh();
  }

  async function onFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploadError("");
    if (!CREDENTIAL_TYPES.includes(file.type)) return setUploadError("Use a PDF, JPG, PNG or WebP file.");
    if (file.size > CREDENTIAL_MAX) return setUploadError("The file is larger than 5 MB.");
    setUploading(true);
    try {
      const path = `${userId}/${crypto.randomUUID().slice(0, 8)}-${safeFileName(file.name)}`;
      await uploadFile("credentials", path, file);
      const r = await attachCredentialsAction(path);
      if (!r.ok) throw new Error(r.error);
      toast.success(verification.status === "rejected" ? "Credentials sent. Your application is back in review." : "Credentials uploaded");
      router.refresh();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "The upload failed.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function openFile() {
    const tab = window.open("about:blank", "_blank");
    const r = await openMyCredentialsAction();
    if (!r.ok) {
      tab?.close();
      toast.error(r.error);
      return;
    }
    if (tab) {
      tab.opener = null;
      tab.location.href = r.data.url;
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Verification</CardTitle>
            <StatusBadge status={verification.status} />
          </div>
          <CardDescription>
            {verification.status === "verified"
              ? "You are verified. Students can find you and book your open slots."
              : verification.status === "rejected"
                ? `Your application was not approved${verification.reason ? `: ${verification.reason}` : "."} Upload new credentials to apply again.`
                : verification.hasCredentials
                  ? "An administrator is reviewing your credentials."
                  : "Upload proof of your profession (a certificate, licence or work ID) so an administrator can verify you."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {verification.hasCredentials && (
            <button type="button" onClick={openFile} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent">
              <FileText className="h-4 w-4" aria-hidden /> {verification.fileName ?? "View my credentials"}
            </button>
          )}
          <div>
            <input ref={fileInput} id="cred-file" type="file" accept={CREDENTIAL_TYPES.join(",")} className="sr-only" onChange={(e) => onFile(e.target.files)} disabled={uploading} />
            <Button type="button" variant="outline" disabled={uploading} onClick={() => fileInput.current?.click()}>
              {uploading ? "Uploading…" : verification.hasCredentials ? "Replace credentials" : "Upload credentials"}
            </Button>
            <p className="mt-1 text-xs text-muted-foreground">PDF, JPG, PNG or WebP, up to 5 MB. Only you and administrators can open it.</p>
          </div>
          {uploadError && (
            <p role="alert" className="text-sm text-destructive">
              {uploadError}
            </p>
          )}
        </CardContent>
      </Card>

      <form onSubmit={submit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Your profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Name" htmlFor="p-name">
              <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
            </Field>
            <Field label="Email" htmlFor="p-email" hint="To change your email, ask an administrator.">
              <Input id="p-email" value={email} readOnly disabled />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Career" htmlFor="p-career">
                <Select id="p-career" value={careerId} onChange={(e) => setCareerId(e.target.value)}>
                  {options.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Years of experience" htmlFor="p-years">
                <Input id="p-years" type="number" inputMode="numeric" min={0} max={70} value={years} onChange={(e) => setYears(e.target.value)} />
              </Field>
            </div>
            <Field label="Bio" htmlFor="p-bio" hint={`${bio.length} / 2000. Tell students about your work and how you can help.`}>
              <Textarea id="p-bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={2000} rows={6} />
            </Field>
          </CardContent>
        </Card>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </div>
  );
}

import type { Metadata } from "next";
import { DeleteAccountCard } from "@/components/delete-account-card";
import { PageHeader } from "@/components/page-header";
import { requireAccessLevel } from "@/lib/auth";
import { listActiveCareers } from "@/lib/data/careers";
import { getProfessionalSettings } from "@/lib/data/settings";
import { ProSettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings" };

export default async function ProSettingsPage() {
  const me = await requireAccessLevel("professional");
  const [settings, careers] = await Promise.all([getProfessionalSettings(me.id), listActiveCareers()]);
  if (!settings) return <p className="text-muted-foreground">Your professional profile was not found. Contact an administrator.</p>;
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader title="Profile & settings" description="Students see your name, career, experience and bio once you are verified." />
      <ProSettingsForm
        userId={me.id}
        email={me.email ?? ""}
        initial={{ name: me.name, bio: settings.bio, experienceYears: settings.experienceYears, careerId: settings.careerId }}
        careers={careers.map((c) => ({ id: c.id, name: c.name }))}
        verification={{ status: settings.status, reason: settings.rejectionReason, hasCredentials: !!settings.credentialsPath, fileName: settings.credentialsPath ? settings.credentialsPath.split("/").pop()!.replace(/^[0-9a-f]{8}-/, "") : null }}
      />
      <DeleteAccountCard />
    </div>
  );
}

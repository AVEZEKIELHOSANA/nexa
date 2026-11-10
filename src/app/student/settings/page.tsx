import type { Metadata } from "next";
import { DeleteAccountCard } from "@/components/delete-account-card";
import { PageHeader } from "@/components/page-header";
import { requireAccessLevel } from "@/lib/auth";
import { listActiveCareers } from "@/lib/data/careers";
import { getStudentSettings } from "@/lib/data/settings";
import { StudentSettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings" };

export default async function StudentSettingsPage() {
  const me = await requireAccessLevel("student");
  const [settings, careers] = await Promise.all([getStudentSettings(me.id), listActiveCareers()]);
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader title="Profile & settings" description="What other students see is only your first name and your interests." />
      <StudentSettingsForm
        email={me.email ?? ""}
        initial={{ name: me.name, bio: settings.bio, interestIds: settings.interestIds, prefs: settings.prefs }}
        careers={careers.map((c) => ({ id: c.id, name: c.name }))}
        guardian={settings.isMinor ? (settings.guardianConsentAt ? "given" : "awaiting") : "not_needed"}
      />
      <DeleteAccountCard />
    </div>
  );
}

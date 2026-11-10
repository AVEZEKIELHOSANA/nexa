"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { saveStudentSettingsAction } from "@/lib/actions/settings";
import type { NotificationPrefs } from "@/lib/data/settings";

const PREF_LABELS: { key: keyof NotificationPrefs; label: string; hint: string }[] = [
  { key: "messages", label: "New messages", hint: "When a mentor writes to you." },
  { key: "reminders", label: "Session reminders", hint: "A reminder about a day before each session." },
  { key: "peers", label: "Peer requests", hint: "When another student wants to connect." },
];

export function StudentSettingsForm({
  email,
  initial,
  careers,
  guardian,
}: {
  email: string;
  initial: { name: string; bio: string; interestIds: string[]; prefs: NotificationPrefs };
  careers: { id: string; name: string }[];
  guardian: "not_needed" | "given" | "awaiting";
}) {
  const [name, setName] = useState(initial.name);
  const [bio, setBio] = useState(initial.bio);
  const [interests, setInterests] = useState<string[]>(initial.interestIds);
  const [prefs, setPrefs] = useState<NotificationPrefs>(initial.prefs);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function toggleInterest(id: string) {
    setInterests((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= 10 ? cur : [...cur, id]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const r = await saveStudentSettingsAction({ name, bio, interestIds: interests, prefs });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    toast.success("Settings saved");
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>About you</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Name" htmlFor="s-name">
            <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
          </Field>
          <Field label="Email" htmlFor="s-email" hint="To change your email or password, ask an administrator or use “Forgot password” on the login page.">
            <Input id="s-email" value={email} readOnly disabled />
          </Field>
          <Field label="Short bio" htmlFor="s-bio" hint={`${bio.length} / 1000. Only you and administrators can read it.`}>
            <Textarea id="s-bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={1000} rows={4} />
          </Field>
          {guardian !== "not_needed" && (
            <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              {guardian === "given" ? "Your parent or guardian has given their consent." : "We are waiting for your parent or guardian to confirm by email."}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Career interests</CardTitle>
          <CardDescription>Pick up to 10. They help you find mentors and students with the same interests.</CardDescription>
        </CardHeader>
        <CardContent>
          <fieldset>
            <legend className="sr-only">Career interests</legend>
            <div className="flex flex-wrap gap-2">
              {careers.map((c) => {
                const on = interests.includes(c.id);
                return (
                  <label key={c.id} className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors ${on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
                    <input type="checkbox" className="sr-only" checked={on} onChange={() => toggleInterest(c.id)} />
                    {c.name}
                  </label>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{interests.length} of 10 selected</p>
          </fieldset>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Answers to your requests and cancellations are always sent.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {PREF_LABELS.map((p) => (
            <label key={p.key} className="flex items-start gap-3 text-sm">
              <input type="checkbox" className="mt-0.5 h-4 w-4" checked={prefs[p.key]} onChange={(e) => setPrefs((cur) => ({ ...cur, [p.key]: e.target.checked }))} />
              <span>
                <span className="font-medium">{p.label}</span>
                <span className="block text-muted-foreground">{p.hint}</span>
              </span>
            </label>
          ))}
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
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { homePathAction } from "./actions";

type Phase = "checking" | "ready" | "invalid";

/**
 * Invite and reset links arrive as /set-password#access_token=...&refresh_token=...&type=invite
 * (implicit flow, see the Edge Functions). The tokens are in the URL fragment, which the server
 * never sees, so this runs in the browser: read them, start the session, remove them from the
 * address bar, then let the person choose a password with auth.updateUser.
 */
export function SetPasswordForm() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function start() {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        // Remove the tokens from the address bar and the history entry.
        window.history.replaceState(null, "", window.location.pathname);
        if (!cancelled) setPhase(sessionError ? "invalid" : "ready");
        return;
      }

      // No tokens in the URL: valid only if the person is already signed in (e.g. page refreshed).
      const { data } = await supabase.auth.getUser();
      if (!cancelled) setPhase(data.user ? "ready" : "invalid");
    }
    void start();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("The two passwords do not match.");

    setBusy(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setBusy(false);
      return setError(
        /same|different/i.test(updateError.message) ? "Choose a password you have not used before." : updateError.message.includes("weak") ? "That password is too weak. Add length or mix letters and numbers." : "Could not save the password. Please try again."
      );
    }
    toast.success("Password saved");
    const home = await homePathAction();
    router.replace(home);
    router.refresh();
  }

  if (phase === "checking") return <p className="text-sm text-muted-foreground">Checking your link…</p>;

  if (phase === "invalid") {
    return (
      <div role="alert" className="space-y-3 rounded-lg border border-destructive/40 p-4 text-sm">
        <p className="font-medium">This link is invalid or has expired.</p>
        <p className="text-muted-foreground">Links work once and expire. Ask the administrator to send a new invitation, or use “Forgot password” on the login page.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="New password" htmlFor="new-password" hint="At least 8 characters.">
        <Input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
      </Field>
      <Field label="Confirm password" htmlFor="confirm-password">
        <Input id="confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
      </Field>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Saving…" : "Save password and continue"}
      </Button>
    </form>
  );
}

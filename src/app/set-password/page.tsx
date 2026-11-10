import type { Metadata } from "next";
import { SetPasswordForm } from "./set-password-form";

export const metadata: Metadata = { title: "Choose a password" };

export default function SetPasswordPage() {
  return (
    <div className="mx-auto max-w-md space-y-6 py-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Choose your password</h1>
        <p className="text-sm text-muted-foreground">Used by invitation emails and by admin-triggered password resets.</p>
      </div>
      <SetPasswordForm />
    </div>
  );
}

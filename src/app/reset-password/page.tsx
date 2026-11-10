"use client";
import { useActionState } from "react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updatePasswordAction } from "@/lib/data/auth-actions";

export default function ResetPasswordPage() {
  const [state, formAction, pending] = useActionState(updatePasswordAction, undefined);

  return (
    <AuthLayout title="Set a new password" subtitle="Choose a strong password.">
      <form action={formAction} className="space-y-4">
        {state?.error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-stone-800">New Password</label>
          <Input name="password" type="password" required autoComplete="new-password" />
          <p className="text-xs text-stone-500">At least 8 characters.</p>
        </div>
        <Button type="submit" disabled={pending} className="w-full bg-[#1A7F5A] hover:bg-[#156a4a]">
          {pending ? "Updating…" : "Update password"}
        </Button>
      </form>
    </AuthLayout>
  );
}
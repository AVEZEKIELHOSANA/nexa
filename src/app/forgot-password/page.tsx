"use client";
import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { requestPasswordResetAction } from "@/lib/data/auth-actions";

function ForgotPasswordForm() {
  const sent = useSearchParams().get("sent");
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, undefined);

  return (
    <AuthLayout title="Reset your password" subtitle="We'll email you a link to reset it.">
      {sent ? (
        <div className="space-y-4 text-center">
          <div className="rounded-md bg-emerald-50 px-3 py-4 text-sm text-emerald-800">
            If an account exists for that email, a reset link has been sent. Check your inbox (and spam folder).
          </div>
          <Link href="/login" className="text-sm font-medium text-emerald-700 hover:underline">Back to login</Link>
        </div>
      ) : (
        <form action={formAction} className="space-y-4">
          {state?.error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-stone-800">Email</label>
            <Input name="email" type="email" required />
          </div>
          <Button type="submit" disabled={pending} className="w-full bg-[#1A7F5A] hover:bg-[#156a4a]">
            {pending ? "Sending…" : "Send reset link"}
          </Button>
          <div className="text-center text-sm mt-4">
            <Link href="/login" className="text-emerald-700 hover:underline">Back to login</Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}

export default function ForgotPasswordPage() {
  return <Suspense fallback={null}><ForgotPasswordForm /></Suspense>;
}
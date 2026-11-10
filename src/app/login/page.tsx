"use client";
import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { signInAction } from "@/lib/data/auth-actions";

const NOTICES: Record<string, string> = {
  inactive: "Your account is waiting for guardian consent. We emailed your parent or guardian.",
  "password-updated": "Password updated. Log in with your new password.",
};

function LoginForm() {
  const notice = useSearchParams().get("notice");
  const [state, formAction, pending] = useActionState(signInAction, undefined);

  return (
    <AuthLayout
      title="Log in to Nexa"
      subtitle="Welcome back."
      footer={<><span>New here? </span><Link href="/signup" className="font-medium text-emerald-700 hover:underline">Create an account</Link></>}
    >
      <form action={formAction} className="space-y-4">
        {notice && NOTICES[notice] && (
          <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{NOTICES[notice]}</div>
        )}
        {state?.error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>
        )}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-stone-800">Email</label>
          <Input name="email" type="email" required autoComplete="email" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-stone-800">Password</label>
          <Input name="password" type="password" required autoComplete="current-password" />
        </div>
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm text-emerald-700 hover:underline">Forgot your password?</Link>
        </div>
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Signing in…" : "Log in"}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default function Page() {
  return <Suspense fallback={null}><LoginForm /></Suspense>;
}
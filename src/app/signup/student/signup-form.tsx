"use client";
import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CareerInterestPicker } from "@/components/ui/career-interest-picker";
import { signUpStudentAction } from "@/lib/data/auth-actions";

function isMinor(dob: string) {
  if (!dob) return false;
  const d = new Date(dob + "T00:00:00");
  const c = new Date();
  c.setFullYear(c.getFullYear() - 18);
  return d > c;
}

export function StudentSignupForm({ careers }: { careers: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(signUpStudentAction, undefined);
  const [dob, setDob] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const minor = useMemo(() => isMinor(dob), [dob]);

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 5 ? p : [...p, id]));

  return (
    <AuthLayout
      title="Create your student account"
      subtitle="Tell us who you are and what you want to become."
      footer={<><span>Already have an account? </span><Link href="/login" className="font-medium text-emerald-700 hover:underline">Log in</Link></>}
    >
      <form action={formAction} className="space-y-4">
        {state?.error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>}
        
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-stone-800">Full name</label>
          <Input name="name" required />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-stone-800">Email</label>
          <Input name="email" type="email" required autoComplete="email" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-stone-800">Password</label>
          <Input name="password" type="password" required autoComplete="new-password" />
          <p className="text-xs text-stone-500">At least 8 characters, with a letter and a number.</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-stone-800">Date of birth</label>
          <Input name="dateOfBirth" type="date" required value={dob} onChange={(e) => setDob(e.target.value)} />
        </div>

        {minor && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-900">
            <p className="font-medium">You are under 18.</p>
            <p className="mt-1">A parent or guardian needs to agree before your account is activated. We&apos;ll email them a link to confirm.</p>
            <div className="mt-3 space-y-1.5">
              <label className="text-sm font-medium text-amber-900">Parent or guardian&apos;s email</label>
              <Input name="guardianEmail" type="email" required />
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-stone-800">Careers you are interested in (pick up to 5)</label>
          <CareerInterestPicker careers={careers} selected={picked} onToggle={toggle} />
        </div>

        <Button type="submit" disabled={pending} className="w-full bg-[#1A7F5A] hover:bg-[#156a4a]">
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthLayout>
  );
}
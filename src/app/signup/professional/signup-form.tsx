// signup-form.tsx
"use client";
import { useActionState } from "react";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { signUpProfessionalAction } from "@/lib/data/auth-actions";

export function ProfessionalSignupForm({ careers }: { careers: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(signUpProfessionalAction, undefined);

  return (
    <AuthLayout
      title="Apply as a professional"
      subtitle="Your profile is shown to students only after our team has verified your background."
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
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-stone-800">Your career</label>
          <Select name="careerId" required>
            <option value="">Choose your career…</option>
            {careers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-stone-800">Years of experience</label>
          <Input name="experienceYears" type="number" min={0} max={70} required />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-stone-800">About you</label>
          <Textarea name="bio" rows={4} required maxLength={2000} />
          <p className="text-xs text-stone-500">Students will read this. Keep it short and specific.</p>
        </div>
        <Button type="submit" disabled={pending} className="w-full bg-[#1A7F5A] hover:bg-[#156a4a]">
          {pending ? "Submitting…" : "Submit application"}
        </Button>
      </form>
    </AuthLayout>
  );
}
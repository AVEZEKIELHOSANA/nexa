import Link from "next/link";
import { AuthLayout } from "@/components/auth/auth-layout";

export default function SignupPage() {
  return (
    <AuthLayout title="Create your Nexa account" subtitle="Tell us who you are and what you want to become.">
      <div className="grid gap-3">
        <Link href="/signup/student"
              className="rounded-xl border border-stone-200 p-5 hover:border-emerald-600 hover:bg-emerald-50/40 transition">
          <p className="font-medium text-stone-900">I&apos;m a student</p>
          <p className="text-sm text-stone-600">I want to explore careers and find a mentor.</p>
        </Link>
        <Link href="/signup/professional"
              className="rounded-xl border border-stone-200 p-5 hover:border-emerald-600 hover:bg-emerald-50/40 transition">
          <p className="font-medium text-stone-900">I&apos;m a professional</p>
          <p className="text-sm text-stone-600">I want to mentor young people in my field.</p>
        </Link>
      </div>
    </AuthLayout>
  );
}
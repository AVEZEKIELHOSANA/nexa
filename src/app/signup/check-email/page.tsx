import Link from "next/link";
import { AuthLayout } from "@/components/auth/auth-layout";

export default function Page() {
  return (
    <AuthLayout title="Check your email" subtitle="We sent you a confirmation link. Click it to confirm your address, then log in.">
      <p className="text-sm text-stone-600">
        If you signed up as a student under 18, we also emailed your parent or guardian.
        Your account activates after they confirm.
      </p>
      <div className="mt-4">
        <Link href="/login" className="text-sm font-medium text-emerald-700 hover:underline">Go to login</Link>
      </div>
    </AuthLayout>
  );
}
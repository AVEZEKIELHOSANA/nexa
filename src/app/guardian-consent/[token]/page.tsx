import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function GuardianConsentPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;
  const token = resolvedParams.token;
  const errorMsg = resolvedSearch.error;
  const isSuccess = resolvedSearch.success === "true";

  async function handleConsent() {
    "use server";
    const supabase = await createClient();
    const { error } = await supabase.rpc("confirm_guardian_consent", {
      token_input: token,
    });

    if (error) {
      redirect(`/guardian-consent/${token}?error=${encodeURIComponent(error.message)}`);
    }
    redirect(`/guardian-consent/${token}?success=true`);
  }

  if (isSuccess) {
    return (
      <main className="min-h-screen bg-[#F9F9F6] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-8 border border-stone-200 text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
            ✓
          </div>
          <h1 className="text-2xl font-bold mb-2">Consent Recorded</h1>
          <p className="text-stone-600">
            Thank you. The student&apos;s account is now active and they can log in to Nexa.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F9F9F6] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-8 border border-stone-200">
        <h1 className="text-2xl font-bold mb-4">Guardian Consent</h1>
        
        {errorMsg && (
          <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 mb-6">
            {errorMsg}
          </div>
        )}

        <p className="text-sm text-stone-600 mb-6">
          A young person has requested to join Nexa and listed you as their parent or guardian.
          Nexa connects students with verified professionals for career mentoring.
        </p>
        
        <div className="bg-emerald-50 p-4 rounded-lg text-sm text-emerald-900 mb-6">
          <p className="font-semibold mb-2">How we keep young people safe:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Professionals are checked by our team before students see them.</li>
            <li>Students can message a professional only after a session is accepted.</li>
            <li>Emails and dates of birth are never shown to other users.</li>
          </ul>
        </div>

        <form action={handleConsent}>
          <button
            type="submit"
            className="w-full bg-[#1A7F5A] text-white py-3 rounded-lg font-medium hover:bg-[#156a4a]"
          >
            I am the parent/guardian and I consent
          </button>
        </form>
        
        <p className="text-xs text-center text-stone-500 mt-4">
          If you did not expect this, you can safely close this page.
        </p>
      </div>
    </main>
  );
}
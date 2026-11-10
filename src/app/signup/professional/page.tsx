// page.tsx
import { createClient } from "@/lib/supabase/server";
import { ProfessionalSignupForm } from "./signup-form";

export default async function Page() {
  const supabase = await createClient();
  const { data: careers } = await supabase
    .from("careers").select("id, name").eq("is_active", true).order("name");
  return <ProfessionalSignupForm careers={careers ?? []} />;
}
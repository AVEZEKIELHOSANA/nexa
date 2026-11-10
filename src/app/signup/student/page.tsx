import { createClient } from "@/lib/supabase/server";
import { StudentSignupForm } from "./signup-form";

export default async function Page() {
  const supabase = await createClient();
  
  const { data: careers, error } = await supabase
    .from("careers")
    .select("id, name")
    .eq("is_active", true)
    .order("name");
    
  console.log("SERVER FETCHED CAREERS:", careers, "ERROR:", error);

  return <StudentSignupForm careers={careers ?? []} />;
}
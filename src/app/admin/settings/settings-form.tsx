"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export function AdminSettingsForm({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      toast.error("You must be signed in to update your profile.");
      return;
    }

    const { error } = await supabase.from("profiles").update({ name }).eq("id", user.id);

    setBusy(false);

    if (error) {
      toast.error("Failed to update profile.");
    } else {
      toast.success("Profile updated successfully.");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-stone-700">Display Name</label>
        <Input 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          required 
          maxLength={100} 
        />
        <p className="text-xs text-stone-500">This is how your name appears in the admin activity logs.</p>
      </div>

      <div className="pt-4">
        <Button type="submit" disabled={busy || name === initialName} className="bg-[#1A7F5A] hover:bg-[#156a4a]">
          {busy ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
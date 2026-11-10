import type { Metadata } from "next";
import { requireAccessLevel } from "@/lib/auth";
import { AdminSettingsForm } from "./settings-form";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = { title: "Admin Settings" };

export default async function AdminSettingsPage() {
  const me = await requireAccessLevel("admin");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Admin Settings</h1>
        <p className="text-stone-500 mt-1">Manage your administrator account.</p>
      </div>

      <div className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200 shadow-sm">
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-stone-100">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#1A7F5A] flex items-center justify-center">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-stone-900">{me.name}</h2>
            <p className="text-sm text-stone-500">{me.email}</p>
          </div>
        </div>

        <AdminSettingsForm initialName={me.name} />
      </div>
    </div>
  );
}
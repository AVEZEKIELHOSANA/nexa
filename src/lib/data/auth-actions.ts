"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, HOME_BY_LEVEL } from "@/lib/auth";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export type FormState = { error?: string } | undefined;

// ---- Sign in ----
export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Incorrect email or password." };

    // Wait up to 1.5 seconds for the profile to be readable
  let user = await getCurrentUser();
  let retries = 0;
  while (!user && retries < 3) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    user = await getCurrentUser();
    retries++;
  }

  if (!user) return { error: "We couldn't load your profile. Please try again." };
  if (!user.isActive) redirect("/login?notice=inactive");

  redirect(HOME_BY_LEVEL[user.accessLevel]);
}

// ---- Sign out ----
export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

// ---- Student sign-up ----
export async function signUpStudentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const dateOfBirth = String(formData.get("dateOfBirth") ?? "");
  const guardianEmail = String(formData.get("guardianEmail") ?? "").trim().toLowerCase();
  const careerIds = formData.getAll("careerIds").map(String);

  if (!name || !email || !password || !dateOfBirth) return { error: "Fill in every field." };
  if (careerIds.length === 0) return { error: "Pick at least one career interest." };
  if (careerIds.length > 5) return { error: "Pick up to 5 career interests." };

  const dob = new Date(dateOfBirth + "T00:00:00");
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 18);
  const isMinor = dob > cutoff;

  if (isMinor && !guardianEmail) return { error: "A parent or guardian email is required." };
  if (isMinor && guardianEmail === email) return { error: "Guardian email must differ from yours." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email, password,
    options: {
      emailRedirectTo: `${SITE_URL}/auth/callback`,
      data: {
        role: "student",
        name,
        date_of_birth: dateOfBirth,
        guardian_email: isMinor ? guardianEmail : null,
        career_interest_ids: careerIds,
      },
    },
  });
  if (error) return { error: error.message };
  redirect("/signup/check-email");
}

// ---- Professional sign-up ----
export async function signUpProfessionalAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const careerId = String(formData.get("careerId") ?? "");
  const yearsRaw = String(formData.get("experienceYears") ?? "");
  const bio = String(formData.get("bio") ?? "").trim();

  if (!name || !email || !password || !careerId || !yearsRaw || !bio)
    return { error: "Fill in every field." };

  const years = Number(yearsRaw);
  if (!Number.isInteger(years) || years < 0 || years > 70)
    return { error: "Years of experience must be 0–70." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email, password,
    options: {
      emailRedirectTo: `${SITE_URL}/auth/callback`,
      data: {
        role: "professional",
        name,
        career_id: careerId,
        bio,
        experience_years: years,
      },
    },
  });
  if (error) return { error: error.message };
  redirect("/signup/check-email");
}

export async function requestPasswordResetAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Enter your email." };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password` });
  
  redirect("/forgot-password?sent=1");
}

export async function updatePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  
  if (error) return { error: error.message };
  redirect("/login?notice=password-updated");
}
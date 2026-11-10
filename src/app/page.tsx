import { createClient } from "@/lib/supabase/server";
import { LandingNavbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { FeaturedCareers } from "@/components/landing/featured-careers";
import { FeaturedPros } from "@/components/landing/featured-pros";
import { Testimonials } from "@/components/landing/testimonials";
import { About } from "@/components/landing/about";
import { CTA } from "@/components/landing/cta";
import { Footer } from "@/components/landing/footer";

export default async function LandingPage() {
  const supabase = await createClient();
  
  // Fetch top 3 verified professionals from the DATABASE
  const { data: professionals, error } = await supabase
    .from("public_professionals")
    .select("id, name, career_name, bio")
    .limit(3);

  if (error) {
    console.error("Error fetching professionals:", error);
  }

  return (
    <div className="min-h-screen bg-[#F9F9F6]">
      <LandingNavbar />
      <main>
        <Hero />
        <About />
        <HowItWorks />
        <FeaturedCareers />
        {/* Pass the database data */}
        <FeaturedPros professionals={professionals || []} />
        <Testimonials />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
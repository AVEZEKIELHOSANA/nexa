import Image from "next/image";
import { CheckCircle2 } from "lucide-react";

export function About() {
  return (
    <section id="about" className="py-24 bg-white overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Side: Images */}
          <div className="relative">
            {/* Main Image */}
            <div className="relative h-[400px] md:h-[500px] w-full rounded-3xl overflow-hidden shadow-2xl">
              <Image
                src="https://images.unsplash.com/photo-1573164713988-8665fc963095?q=80&w=1000&auto=format&fit=crop"
                alt="African professionals mentoring"
                fill
                className="object-cover"
              />
            </div>
            
            {/* Decorative Floating Image */}
            <div className="absolute -bottom-8 -right-8 w-48 h-48 md:w-64 md:h-64 rounded-2xl overflow-hidden border-8 border-white shadow-xl hidden md:block">
              <Image
                src="https://images.unsplash.com/photo-1531384441138-2736e62e0919?q=80&w=500&auto=format&fit=crop"
                alt="Young African professional"
                fill
                className="object-cover"
              />
            </div>

            {/* Decorative Background Blob */}
            <div className="absolute top-1/2 -left-12 w-64 h-64 bg-emerald-100 rounded-full blur-3xl -z-10 -translate-y-1/2" />
          </div>

          {/* Right Side: Text & Stats */}
          <div>
            <h2 className="text-sm font-bold text-[#1A7F5A] tracking-widest uppercase mb-3">About Nexa</h2>
            <h3 className="text-3xl md:text-4xl font-bold text-stone-900 mb-6 leading-tight">
              Bridging the gap between ambition and reality.
            </h3>
            <p className="text-stone-600 text-lg leading-relaxed mb-8">
              In Cameroon and across Africa, millions of young people have big dreams but lack access to the professionals who can show them the way. Nexa was built to change that. We connect ambitious students directly with verified industry experts for real, one-on-one career mentorship.
            </p>

            {/* Bullet Points */}
            <ul className="space-y-4 mb-10">
              {[
                "Verified professionals across all industries",
                "Safe, guardian-approved environment for minors",
                "Free learning resources and career guidance",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-[#1A7F5A] shrink-0" />
                  <span className="text-stone-700 font-medium">{item}</span>
                </li>
              ))}
            </ul>

            {/* Vibrant Stats Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 text-center">
                <p className="text-3xl font-extrabold text-[#1A7F5A]">50+</p>
                <p className="text-xs text-emerald-800 font-medium mt-1">Verified Mentors</p>
              </div>
              <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 text-center">
                <p className="text-3xl font-extrabold text-amber-600">200+</p>
                <p className="text-xs text-amber-800 font-medium mt-1">Active Students</p>
              </div>
              <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 text-center">
                <p className="text-3xl font-extrabold text-blue-600">12</p>
                <p className="text-xs text-blue-800 font-medium mt-1">Career Fields</p>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
}
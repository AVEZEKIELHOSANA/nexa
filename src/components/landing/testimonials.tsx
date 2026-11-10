import { Quote } from "lucide-react";

export function Testimonials() {
  return (
    <section id="testimonials" className="py-24 bg-[#F9F9F6] text-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-16 text-stone-900">Stories from our community</h2>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="bg-emerald-800 p-8 rounded-3xl relative">
            <Quote className="absolute top-6 right-6 w-10 h-10 text-emerald-600/50" />
            <p className="text-lg leading-relaxed mb-6">
              &quot;I wanted to be a doctor but didn&apos;t know anyone in the field. Through Nexa, I met Dr. Ngassa. Her advice completely changed my study habits.&quot;
            </p>
            <div>
              <p className="font-bold text-emerald-300">Marielle, 17</p>
              <p className="text-sm text-emerald-100/60">Lycéenne, Yaoundé</p>
            </div>
          </div>
          <div className="bg-emerald-800 p-8 rounded-3xl relative">
            <Quote className="absolute top-6 right-6 w-10 h-10 text-emerald-600/50" />
            <p className="text-lg leading-relaxed mb-6">
              &quot;The courses on leadership and the peer network helped me build the confidence to launch my first business while still in university.&quot;
            </p>
            <div>
              <p className="font-bold text-emerald-300">Junior, 20</p>
              <p className="text-sm text-emerald-100/60">Entrepreneur, Douala</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
import { Search, CalendarCheck, MessageSquareHeart, Rocket } from "lucide-react";

const steps = [
  { icon: Search, title: "1. Find your field", desc: "Browse careers like Medicine, Tech, or Law to see who is available.", color: "bg-blue-50 text-blue-600" },
  { icon: CalendarCheck, title: "2. Book a session", desc: "Choose a time slot that works for you and request a meeting.", color: "bg-emerald-50 text-[#1A7F5A]" },
  { icon: MessageSquareHeart, title: "3. Get mentored", desc: "Meet your mentor online, ask questions, and get real advice.", color: "bg-amber-50 text-amber-600" },
  { icon: Rocket, title: "4. Grow", desc: "Keep the connection and keep learning with our course resources.", color: "bg-purple-50 text-purple-600" },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-stone-900 mb-4">How Nexa works</h2>
          <p className="text-stone-600 max-w-2xl mx-auto">Four simple steps to get the career clarity you deserve.</p>
        </div>
        
        <div className="grid md:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="p-6 rounded-2xl bg-[#F9F9F6] border border-stone-100 hover:shadow-lg transition-all hover:-translate-y-1">
              <div className={`w-14 h-14 rounded-2xl ${step.color} flex items-center justify-center mb-6`}>
                <step.icon className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-stone-900">{step.title}</h3>
              <p className="text-sm text-stone-600 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Stethoscope, Scale, Code2, Briefcase } from "lucide-react";

const careers = [
  { name: "Medicine & Healthcare", icon: Stethoscope, count: 12, color: "text-rose-500 bg-rose-50" },
  { name: "Software Engineering", icon: Code2, count: 25, color: "text-blue-500 bg-blue-50" },
  { name: "Law & Legal", icon: Scale, count: 8, color: "text-amber-500 bg-amber-50" },
  { name: "Business & Finance", icon: Briefcase, count: 15, color: "text-emerald-500 bg-emerald-50" },
];

export function FeaturedCareers() {
  return (
    <section id="careers" className="py-24 bg-[#F9F9F6]">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-3xl font-bold text-stone-900 mb-2">Explore Careers</h2>
            <p className="text-stone-600">Find professionals in the field you want to enter.</p>
          </div>
          <Link href="/careers" className="hidden md:block">
            <Button variant="outline" className="border-[#1A7F5A] text-[#1A7F5A] hover:bg-emerald-50">
              View all careers <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {careers.map((c, i) => (
            <Link key={i} href="/careers" className="group p-6 bg-white rounded-2xl border border-stone-200 hover:border-[#1A7F5A] transition-all hover:shadow-md cursor-pointer">
              <div className={`w-12 h-12 rounded-xl ${c.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <c.icon className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-stone-900 mb-1">{c.name}</h3>
              <p className="text-sm text-stone-500">{c.count} mentors</p>
            </Link>
          ))}
        </div>
        
        <div className="mt-8 text-center md:hidden">
          <Link href="/careers">
            <Button className="w-full bg-[#1A7F5A] text-white">View all careers</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
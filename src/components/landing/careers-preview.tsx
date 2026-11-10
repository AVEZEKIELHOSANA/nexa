import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CareersPreview({ careers }: { careers: { id: string; name: string }[] | null }) {
  return (
    <section className="px-4 py-24 bg-[#F9F9F6]">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-4">Careers you can explore</h2>
        <p className="text-stone-600 mb-12">Hover over a field to see what&apos;s possible.</p>
        
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {careers?.map((c, i) => (
            <span 
              key={c.id} 
              className="px-6 py-3 bg-white border border-stone-200 text-stone-700 rounded-full text-sm font-medium hover:border-[#1A7F5A] hover:text-[#1A7F5A] hover:shadow-md transition-all cursor-default animate-fade-in-up"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {c.name}
            </span>
          ))}
          {(!careers || careers.length === 0) && (
            <span className="text-red-500 font-medium">Careers failed to load. Check DB permissions.</span>
          )}
        </div>
        
        <Link href="/signup/student" className="inline-flex items-center gap-2 text-[#1A7F5A] font-bold hover:underline text-lg group">
          Create a free account to see the professionals
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </section>
  );
}
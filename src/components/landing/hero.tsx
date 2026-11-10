import Image from "next/image";
import { Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative w-full h-[85vh] min-h-[600px] flex items-center bg-stone-900">
      
      {/* BACKGROUND IMAGE - Using a reliable Unsplash link */}
      <Image
        src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2000&auto=format&fit=crop"
        alt="African professionals collaborating"
        fill
        priority
      />

      {/* OVERLAY - Reduced to 40% and 60% so the image shows through */}
      <div className="absolute inset-0 bg-[#0a2e1f]/40" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a2e1f]/80 via-[#0a2e1f]/50 to-transparent" />

      {/* CONTENT */}
      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-sm font-medium mb-6 backdrop-blur-sm">
            <Sparkles className="w-4 h-4" />
            <span>Over 50+ verified professionals</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-[1.15] mb-6 drop-shadow-lg">
            Learn directly from people <br className="hidden sm:block" />
            who are <span className="text-emerald-400">already doing it.</span>
          </h1>
          
          <p className="text-base sm:text-lg text-stone-200 mb-8 max-w-xl leading-relaxed drop-shadow-md">
            Connect with real professionals in Cameroon and across Africa. Find a mentor, book a session, and get the guidance you need to build your dream career.
          </p>
          
          {/* SEARCH BAR */}
          <form action="/careers" className="flex flex-col sm:flex-row items-center bg-white p-2 rounded-xl sm:rounded-full shadow-2xl max-w-lg gap-2">
            <div className="flex-1 flex items-center px-4 py-2 w-full gap-3">
              <Search className="w-5 h-5 text-stone-400 shrink-0" />
              <input 
                name="q"
                type="text" 
                placeholder="What career are you interested in?" 
                className="w-full bg-transparent border-none outline-none text-stone-800 placeholder:text-stone-400 text-sm"
              />
            </div>
            <Button type="submit" className="w-full sm:w-auto bg-[#1A7F5A] hover:bg-[#156a4a] text-white rounded-lg sm:rounded-full px-8 h-12 text-sm font-semibold shrink-0">
              Search
            </Button>
          </form>
          
        </div>
      </div>
    </section>
  );
}
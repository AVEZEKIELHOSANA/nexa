import Image from "next/image";
import Link from "next/link";
import { Star, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type FeaturedProfessional = {
  id: string | null;
  name: string | null;
  career_name: string | null;
  img?: string | null;
};

export function FeaturedPros({ professionals }: { professionals: FeaturedProfessional[] }) {
  const displayPros = professionals.filter(
    (pro): pro is FeaturedProfessional & { id: string; name: string } =>
      pro.id !== null && pro.name !== null
  );


  return (
    <section id="mentors" className="py-24 bg-stone-900"> {/* Green Background like the reference image */}
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Recommended Mentors</h2>
          <p className="text-emerald-100 max-w-2xl mx-auto">Connect with real professionals who are already doing the job you want.</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {displayPros.map((pro) => {
            const imgSrc = pro.img || `https://i.pravatar.cc/400?u=${pro.id}`;
            
            return (
              <div key={pro.id} className="group bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all hover:-translate-y-2 flex flex-col">
                <div className="relative h-64 w-full bg-stone-200">
                  <Image 
                    src={imgSrc} 
                    alt={pro.name} 
                    fill 
                    className="object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                </div>
                
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-center gap-1 mb-1">
                    <h3 className="font-bold text-xl text-stone-900">{pro.name}</h3>
                    <ShieldCheck className="w-5 h-5 text-[#1A7F5A]" />
                  </div>
                  <p className="text-stone-500 text-sm font-medium mb-3">{pro.career_name}</p>
                  
                  <div className="flex items-center gap-1 mb-5 mt-auto">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-bold text-stone-700 ml-1">5.0</span>
                  </div>

                  {/* Redirects to login for unauthenticated visitors */}
                  <Link href="/login" className="w-full">
                    <Button className="w-full bg-[#1A7F5A] hover:bg-[#156a4a] text-white font-semibold">
                      View Profile
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Browse All Button */}
        <div className="mt-12 text-center">
          <Link href="/login">
            <Button variant="outline" className="bg-transparent border-white text-white hover:bg-white hover:text-[#1A7F5A] px-8 h-12 rounded-full font-bold">
              Browse all professionals <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
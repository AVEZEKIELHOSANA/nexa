import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CTA() {
  return (
    <section className="py-24 bg-[#F9F9F6] relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10 text-center">
        <h2 className="text-4xl font-extrabold text-stone-900 mb-6">Ready to shape your future?</h2>
        <p className="text-lg text-stone-600 mb-10 max-w-xl mx-auto">
          Join hundreds of young Cameroonians taking control of their career paths today.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link href="/signup/student">
            <Button className="w-full sm:w-auto bg-[#1A7F5A] hover:bg-[#156a4a] text-white h-14 px-8 rounded-full text-lg">
              Join as a Student
            </Button>
          </Link>
          <Link href="/signup/professional">
            <Button variant="outline" className="w-full sm:w-auto h-14 px-8 rounded-full text-lg border-stone-300 text-stone-700 hover:bg-white">
              Become a Mentor
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
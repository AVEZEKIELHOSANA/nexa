import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Menu } from "lucide-react";

export function LandingNavbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#1A7F5A] flex items-center justify-center text-white font-bold text-xl">
            N
          </div>
          <span className="font-bold text-xl text-stone-900 tracking-tight">Nexa</span>
        </Link>

        {/* Desktop Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-stone-600">
          <Link href="#how-it-works" className="hover:text-[#1A7F5A] transition-colors">How it works</Link>
          <Link href="#careers" className="hover:text-[#1A7F5A] transition-colors">Careers</Link>
          <Link href="#mentors" className="hover:text-[#1A7F5A] transition-colors">Mentors</Link>
          <Link href="#testimonials" className="hover:text-[#1A7F5A] transition-colors">Stories</Link>
        </nav>

        {/* Actions */}
        <div className="hidden md:flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-stone-600 hover:text-stone-900">Log in</Link>
          <Link href="/signup" className={buttonVariants({ className: "bg-[#1A7F5A] hover:bg-[#156a4a] text-white rounded-full px-6" })}>
            Join for free
          </Link>
        </div>

        {/* Mobile Menu Icon (Add functionality later if needed) */}
        <button className="md:hidden p-2 text-stone-600">
          <Menu className="w-6 h-6" />
        </button>
      </div>
    </header>
  );
}
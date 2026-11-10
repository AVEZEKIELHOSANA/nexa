import Link from "next/link";
import { Mail, ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-stone-900">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* Brand */}
        <div>
          <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-white">
            <div className="w-8 h-8 rounded-lg bg-[#1A7F5A] flex items-center justify-center text-white text-lg">
              N
            </div>
            Nexa
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-stone-600">
            Helping young people in Cameroon discover careers and learn from professionals who have been there.
          </p>
        </div>

        {/* Explore Links */}
        <nav className="space-y-4" aria-label="Quick links">
          <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider">Explore</h2>
          <ul className="space-y-3">
            <li>
              <Link href="/careers" className="text-sm text-stone-600 transition-colors hover:text-[#1A7F5A]">
                Browse careers
              </Link>
            </li>
            <li>
              <Link href="/signup/student" className="text-sm text-stone-600 transition-colors hover:text-[#1A7F5A]">
                Join as a student
              </Link>
            </li>
            <li>
              <Link href="/signup/professional" className="text-sm text-stone-600 transition-colors hover:text-[#1A7F5A]">
                Become a mentor
              </Link>
            </li>
          </ul>
        </nav>

        {/* Commitment */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider">Our Commitment</h2>
          <p className="flex items-start gap-3 text-sm leading-relaxed text-stone-600">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#1A7F5A]" aria-hidden="true" />
            Youth safety, guardian consent, and trusted mentorship come first.
          </p>
          <Link href="/privacy" className="block text-sm text-stone-600 transition-colors hover:text-[#1A7F5A]">
            Privacy & account access
          </Link>
        </div>

        {/* Contact */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider">Get in touch</h2>
          <p className="text-sm leading-relaxed text-stone-600">
            Sign in to manage your profile and connect with the Nexa community.
          </p>
          <Link href="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-[#1A7F5A] hover:underline">
            <Mail className="h-4 w-4" aria-hidden="true" />
            Go to your account
          </Link>
        </div>
        
      </div>
      
      {/* Bottom Bar */}
      <div className="border-t border-stone-100">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row">
          <p className="text-xs text-stone-500">
            &copy; {new Date().getFullYear()} Nexa by AYFDAS. Career mentorship for young people.
          </p>
          <div className="flex gap-4 text-xs text-stone-500">
            <Link href="/terms" className="hover:text-stone-900">Terms</Link>
            <Link href="/privacy" className="hover:text-stone-900">Privacy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
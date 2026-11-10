import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:py-14">
        <div>
          <Link href="/" className="text-xl font-bold tracking-tight text-[#1A7F5A]">
            Nexa
          </Link>
          
          <Link href="/login" className="block min-h-11 py-2 text-sm text-stone-600 transition-colors hover:text-[#1A7F5A]">
            Privacy &amp; account access
          </Link>
        </div>
      </div>
      <div className="border-t border-stone-100 pb-20 lg:pb-0">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-stone-500">
          &copy; {new Date().getFullYear()} Nexa by AYFDAS. Career mentorship for young people.
        </p>
      </div>
    </footer>
  );
}
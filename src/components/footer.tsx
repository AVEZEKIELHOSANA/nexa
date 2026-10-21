import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>&copy; {new Date().getFullYear()} Nexa by AYFDAS. Career mentorship for young people.</p>
        <nav className="flex gap-4" aria-label="Footer">
          <Link href="/how-it-works" className="hover:underline">
            How it works
          </Link>
          <Link href="/login" className="hover:underline">
            Log in
          </Link>
        </nav>
      </div>
    </footer>
  );
}

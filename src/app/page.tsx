import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

// Placeholder home page. The real landing page (hero, how it works, careers strip) is built on Day 3.
export default function Home() {
  return (
    <section className="mx-auto max-w-2xl space-y-6 py-16 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Nexa</h1>
      <p className="text-lg text-muted-foreground">
        Book one-to-one sessions with experienced professionals and learn what it takes to follow the career you want.
      </p>
      <div className="flex justify-center gap-3">
        <Link href="/signup" className={buttonVariants({ size: "lg" })}>
          Get started
        </Link>
        <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
          Log in
        </Link>
      </div>
    </section>
  );
}

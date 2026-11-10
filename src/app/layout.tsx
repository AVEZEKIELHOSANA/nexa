import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Nexa", template: "%s | Nexa" },
  description: "Career mentorship platform connecting young people with experienced professionals.",
};

export const viewport: Viewport = {
  themeColor: "#1b5e4b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${GeistSans.variable} ${GeistMono.variable} flex min-h-screen flex-col antialiased`}>
        
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 pb-24 lg:pb-8">{children}</main>
        
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}

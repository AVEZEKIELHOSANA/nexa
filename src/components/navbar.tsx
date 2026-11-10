"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, Bell, MessageSquare, Home, Compass, Calendar, User, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";

type User = {
  id: string;
  name: string;
  roleName: string;
  accessLevel: "student" | "professional" | "admin";
};

const STUDENT_LINKS = [
  { href: "/student", label: "Home", icon: Home },
  { href: "/careers", label: "Careers", icon: Compass },
  { href: "/student/sessions", label: "Sessions", icon: Calendar },
  { href: "/messages", label: "Messages", icon: MessageSquare },
];

const PRO_LINKS = [
  { href: "/pro", label: "Home", icon: Home },
  { href: "/pro/availability", label: "Availability", icon: Calendar },
  { href: "/pro/requests", label: "Requests", icon: Bell },
  { href: "/messages", label: "Messages", icon: MessageSquare },
];

const ADMIN_LINKS = [
  { href: "/admin", label: "Dashboard", icon: Home },
  { href: "/admin/users", label: "Users", icon: User },
  { href: "/admin/verification", label: "Verify", icon: Bell },
  { href: "/admin/requests", label: "Requests", icon: MessageSquare },
];

export function Navbar({ user }: { user: User | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  // Determine which links to show based on role
  const links = user?.accessLevel === "admin" 
    ? ADMIN_LINKS 
    : user?.accessLevel === "professional" 
      ? PRO_LINKS 
      : STUDENT_LINKS;

  return (
    <>
      {/* TOP NAVBAR */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-4">
            {/* Hamburger Menu (Mobile Only) */}
            {user && (
              <button 
                onClick={() => setIsDrawerOpen(true)}
                className="md:hidden p-2 -ml-2 text-stone-600 hover:bg-stone-100 rounded-lg"
              >
                <Menu className="w-6 h-6" />
              </button>
            )}
            
            <Link href={user ? `/${user.accessLevel}` : "/"} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#1A7F5A] flex items-center justify-center text-white font-bold text-xl">N</div>
              <span className="font-bold text-xl text-stone-900 tracking-tight hidden sm:block">Nexa</span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {user && links.map((link) => (
              <Link 
                key={link.href} 
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-[#1A7F5A] ${pathname === link.href ? "text-[#1A7F5A]" : "text-stone-600"}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link href="/notifications" className="p-2 text-stone-500 hover:text-[#1A7F5A] relative">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border border-white"></span>
                </Link>
                <div className="relative group">
                  <button className="flex items-center gap-2">
                    <Avatar name={user.name} />
                  </button>
                  {/* Desktop Dropdown */}
                  <div className="absolute right-0 mt-2 hidden w-48 rounded-xl border bg-white p-2 shadow-lg group-hover:block">
                    <p className="px-3 py-2 text-sm font-medium text-stone-900 truncate">{user.name}</p>
                    <button onClick={signOut} className="w-full text-left px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2">
                      <LogOut className="w-4 h-4" /> Sign out
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-stone-600 hover:text-stone-900 hidden sm:block">Log in</Link>
                <Link href="/signup" className="bg-[#1A7F5A] hover:bg-[#156a4a] text-white text-sm font-medium px-4 py-2 rounded-lg">Join for free</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* MOBILE BOTTOM NAVIGATION */}
      {user && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-stone-200 pb-safe">
          <div className="flex justify-around items-center h-16 px-2">
            {links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link 
                  key={link.href} 
                  href={link.href}
                  className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                    isActive ? "text-[#1A7F5A]" : "text-stone-400 hover:text-stone-600"
                  }`}
                >
                  <link.icon className={`w-5 h-5 ${isActive ? "fill-emerald-100" : ""}`} />
                  <span className="text-[10px] font-medium">{link.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      {/* MOBILE DRAWER (Remaining Links & Settings) */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 md:hidden" onClick={() => setIsDrawerOpen(false)}>
          <div className="absolute top-0 left-0 bottom-0 w-3/4 max-w-sm bg-white shadow-xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex justify-between items-center">
              <span className="font-bold text-lg">Menu</span>
              <button onClick={() => setIsDrawerOpen(false)} className="p-2 -mr-2 text-stone-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-2">
              {/* Additional Links */}
              <Link href="/settings" className="block p-3 rounded-lg hover:bg-stone-50 text-stone-700 font-medium">Settings</Link>
              <Link href="/help" className="block p-3 rounded-lg hover:bg-stone-50 text-stone-700 font-medium">Help & Support</Link>
            </div>
            <div className="p-4 border-t">
              <button onClick={signOut} className="w-full text-left p-3 text-rose-600 font-medium hover:bg-rose-50 rounded-lg flex items-center gap-2">
                <LogOut className="w-5 h-5" /> Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
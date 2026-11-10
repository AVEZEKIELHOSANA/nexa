"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, Compass, CalendarClock, MessageSquare, BookOpen, Users, Settings, LogOut, Inbox, CalendarDays, ShieldCheck, ClipboardList, Briefcase, Shield, Activity  
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { AccessLevel } from "@/lib/auth";

// FIXED HERE: Changed icon: any to a proper React component type
const NAV_LINKS: Record<AccessLevel, { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[]> = {
  student: [
    { href: "/student", label: "Dashboard", icon: LayoutDashboard },
    { href: "/student/careers", label: "Explore Careers", icon: Compass },
    { href: "/student/sessions", label: "My Sessions", icon: CalendarClock },
    { href: "/student/messages", label: "Messages", icon: MessageSquare },
    { href: "/student/courses", label: "Learning Resources", icon: BookOpen },
    { href: "/student/peers", label: "Peer Network", icon: Users },
  ],
  professional: [
    { href: "/pro", label: "Dashboard", icon: LayoutDashboard },
    { href: "/pro/availability", label: "Availability", icon: CalendarDays },
    { href: "/pro/requests", label: "Requests", icon: Inbox },
    { href: "/pro/sessions", label: "Sessions", icon: CalendarClock },
    { href: "/pro/mentees", label: "My Mentees", icon: Users },
    { href: "/pro/messages", label: "Messages", icon: MessageSquare },
  ],
   admin: [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/verification", label: "Verification", icon: ShieldCheck },
    { href: "/admin/requests", label: "Requests", icon: ClipboardList },
    { href: "/admin/students", label: "Students", icon: Users },
    { href: "/admin/professionals", label: "Professionals", icon: Briefcase },
    { href: "/admin/careers", label: "Careers", icon: Compass },
    { href: "/admin/courses", label: "Courses", icon: BookOpen },
    { href: "/admin/roles", label: "Roles", icon: Shield },
    { href: "/admin/availability", label: "Availability", icon: CalendarDays },
    { href: "/admin/activity-log", label: "Activity Log", icon: Activity },
  ],
};

export function Sidebar({ role }: { role?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const currentRole = (role && NAV_LINKS[role as AccessLevel]) ? (role as AccessLevel) : "student";
  const links = NAV_LINKS[currentRole];

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <aside className="hidden md:flex flex-col w-64 bg-[#0a2e1f] text-stone-300 h-screen sticky top-0">
      <div className="h-16 flex items-center px-6 border-b border-emerald-900/50">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-bold text-xl">N</div>
          <span className="font-bold text-xl text-white tracking-tight">Nexa</span>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {links.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive 
                  ? "bg-emerald-500/10 text-emerald-400" 
                  : "hover:bg-emerald-900/50 hover:text-white"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-emerald-400" : ""}`} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-emerald-900/50">
        <Link
          href={currentRole === "student" ? "/student/settings" : currentRole === "professional" ? "/pro/settings" : "/admin/settings"}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-stone-400 hover:bg-emerald-900/50 hover:text-white transition-colors"
        >
          <Settings className="w-5 h-5" />
          Settings
        </Link>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-stone-400 hover:bg-rose-900/30 hover:text-rose-400 transition-colors mt-1"
        >
          <LogOut className="w-5 h-5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
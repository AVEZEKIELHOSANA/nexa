import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { MobileNavigation } from "@/components/mobile-navigation";
import { signOutAction } from "@/lib/data/auth-actions";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/login");
  }

  const allLinks = [
    { href: "/student", label: "Dashboard" },
    { href: "/student/careers", label: "Careers" },
    { href: "/student/sessions", label: "Sessions" },
    { href: "/student/messages", label: "Messages" },
    { href: "/student/courses", label: "Courses" },
    { href: "/student/peers", label: "Peer Network" },
    { href: "/student/requests", label: "Requests" },
  ];

  const primaryLinks = [
    { href: "/student", label: "Home" },
    { href: "/careers", label: "Careers" },
    { href: "/student/sessions", label: "Sessions" },
    { href: "/messages", label: "Messages" },
  ];

  // Shared props for the MobileNavigation component
  const mobileNavProps = {
    accessLevel: "student" as const,
    allLinks,
    primaryLinks,
    settingsHref: "/student/settings",
    name: user.name,
    roleName: user.roleName,
    signOutAction,
    unreadMessages: 0, // Wire this to real data later
  };

  return (
    <div className="flex min-h-screen bg-[#F9F9F6]">
      {/* 1. DESKTOP SIDEBAR */}
      <Sidebar />

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP NAVBAR - Hamburger goes here */}
        <Topbar 
          user={user} 
          mobileNav={<MobileNavigation {...mobileNavProps} />}
        />
        
        {/* PAGE CONTENT */}
        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* 3. MOBILE BOTTOM NAV - Fixed at the bottom of the screen */}
      <div className="md:hidden">
        <MobileNavigation {...mobileNavProps} />
      </div>
    </div>
  );
}
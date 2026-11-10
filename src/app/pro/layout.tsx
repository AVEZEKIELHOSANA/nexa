import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { MobileNavigation } from "@/components/mobile-navigation";
import { signOutAction } from "@/lib/data/auth-actions";

export default async function ProLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/login");
  }

  // Links for the mobile drawer and bottom nav
  const allLinks = [
    { href: "/pro", label: "Dashboard" },
    { href: "/pro/availability", label: "Availability" },
    { href: "/pro/requests", label: "Requests" },
    { href: "/pro/sessions", label: "Sessions" },
    { href: "/messages", label: "Messages" },
    { href: "/pro/mentees", label: "Mentees" },
  ];

  const primaryLinks = [
    { href: "/pro", label: "Home" },
    { href: "/pro/availability", label: "Availability" },
    { href: "/pro/requests", label: "Requests" },
    { href: "/messages", label: "Messages" },
  ];

  const mobileNavProps = {
    accessLevel: "professional" as const,
    allLinks,
    primaryLinks,
    settingsHref: "/pro/settings",
    name: user.name,
    roleName: user.roleName,
    signOutAction,
    unreadMessages: 0, 
  };

  return (
    <div className="flex min-h-screen bg-[#F9F9F6]">
      <Sidebar role = "professional"/>
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar 
          user={user} 
          mobileNav={<MobileNavigation {...mobileNavProps} />}
        />
        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
      <div className="md:hidden">
        <MobileNavigation {...mobileNavProps} />
      </div>
    </div>
  );
}
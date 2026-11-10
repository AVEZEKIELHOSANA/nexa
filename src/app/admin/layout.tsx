import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { MobileNavigation } from "@/components/mobile-navigation";
import { signOutAction } from "@/lib/data/auth-actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/login");
  }

  const allLinks = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/verification", label: "Verification" },
    { href: "/admin/requests", label: "Requests" },
    { href: "/admin/careers", label: "Careers" },
    { href: "/admin/availability", label: "Availability" },
  ];

  const primaryLinks = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/verification", label: "Verify" },
    { href: "/admin/requests", label: "Requests" },
  ];

  const mobileNavProps = {
    accessLevel: "admin" as const,
    allLinks,
    primaryLinks,
    name: user.name,
    roleName: user.roleName,
    signOutAction,
    unreadMessages: 0,
  };

  return (
    <div className="flex min-h-screen bg-[#F9F9F6]">
      {/* Pass role="admin" to the Sidebar */}
      <Sidebar role="admin" />
      
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
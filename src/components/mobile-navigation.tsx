"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BriefcaseBusiness,
  CalendarDays,
  ClipboardList,
  Home,
  LayoutDashboard,
  Menu,
  MessageSquare,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import type { AccessLevel } from "@/lib/auth";

type NavLink = { href: string; label: string };
type SignOutAction = (formData: FormData) => Promise<void>;

const ICONS: Record<string, typeof Home> = {
  "/student": Home,
  "/pro": Home,
  "/admin": LayoutDashboard,
  "/careers": BriefcaseBusiness,
  "/student/sessions": CalendarDays,
  "/pro/sessions": CalendarDays,
  "/admin/requests": ClipboardList,
  "/admin/users": Users,
  "/admin/verification": ShieldCheck,
  "/student/requests": ClipboardList,
  "/pro/requests": ClipboardList,
  "/pro/availability": CalendarDays,
  "/pro/mentees": Users,
  "/admin/roles": ShieldCheck,
  "/admin/careers": BriefcaseBusiness,
  "/admin/availability": CalendarDays,
  "/admin/reports": ClipboardList,
  "/student/peers": Users,
  "/courses": BriefcaseBusiness,
  "/messages": MessageSquare,
};

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/student" && href !== "/pro" && href !== "/admin" && pathname.startsWith(`${href}/`));
}

export function MobileNavigation({
  accessLevel,
  allLinks,
  primaryLinks,
  settingsHref,
  name,
  roleName,
  signOutAction,
  unreadMessages,
}: {
  accessLevel: AccessLevel;
  allLinks: NavLink[];
  primaryLinks: NavLink[];
  settingsHref?: string;
  name: string;
  roleName: string;
  signOutAction: SignOutAction;
  unreadMessages: number;
}) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const primaryHrefs = new Set(primaryLinks.map((link) => link.href));
  const remainingLinks = allLinks.filter((link) => !primaryHrefs.has(link.href));

  return (
    <>
      <button
        type="button"
        aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={isOpen}
        aria-controls="mobile-navigation-drawer"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-stone-700 transition-colors hover:bg-emerald-50 lg:hidden"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {isOpen && (
        <div className="fixed inset-0 top-14 z-50 bg-stone-950/30 lg:hidden" onClick={() => setIsOpen(false)}>
          <nav
            id="mobile-navigation-drawer"
            aria-label="More navigation"
            className="ml-auto max-h-[calc(100vh-3.5rem)] w-[min(21rem,90vw)] overflow-y-auto rounded-bl-2xl border-l border-b border-emerald-100 bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 border-b border-stone-100 pb-4">
              <p className="truncate font-semibold text-stone-900">{name}</p>
              <p className="truncate text-sm text-stone-500">{roleName}</p>
              <p className="mt-1 text-xs capitalize text-emerald-800">{accessLevel}</p>
            </div>
            <div className="space-y-1">
              {remainingLinks.map(({ href, label }) => {
                const Icon = ICONS[href] ?? ClipboardList;
                const active = isActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setIsOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${
                      active ? "bg-emerald-50 text-[#1A7F5A]" : "text-stone-700 hover:bg-stone-50"
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {label}
                  </Link>
                );
              })}
            </div>
            {settingsHref && (
              <Link
                href={settingsHref}
                onClick={() => setIsOpen(false)}
                className="mt-3 flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                Profile &amp; settings
              </Link>
            )}
            <form action={signOutAction} className="mt-2 border-t border-stone-100 pt-2">
              <button type="submit" className="min-h-11 w-full rounded-xl px-3 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50">
                Sign out
              </button>
            </form>
          </nav>
        </div>
      )}

      <nav
        aria-label="Primary mobile navigation"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-stone-200 bg-white/95 px-2 pt-2 shadow-[0_-8px_24px_rgba(28,38,32,0.08)] backdrop-blur lg:hidden"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)" }}
      >
        {primaryLinks.map(({ href, label }) => {
          const Icon = ICONS[href] ?? ClipboardList;
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium transition-colors ${
                active ? "text-[#1A7F5A]" : "text-stone-500 hover:text-stone-800"
              }`}
            >
              <span className="relative">
                <Icon className="h-5 w-5" aria-hidden="true" />
                {href === "/messages" && unreadMessages > 0 && (
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white">
                    {unreadMessages > 99 ? "99+" : unreadMessages}
                  </span>
                )}
              </span>
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

"use client";

import { Search, MessageSquare } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/notification-bell";
import Link from "next/link";
import React from "react";
import { buttonVariants } from "@/components/ui/button";
import type { AccessLevel } from "@/lib/auth";

export function Topbar({ 
  user, 
  mobileNav,
  unreadMessages = 0,
  unreadNotifications = 0
}: { 
  // FIXED HERE: Replaced user: any with the actual properties used in this component
  user: { id: string; name: string; accessLevel: AccessLevel; roleName: string }; 
  mobileNav?: React.ReactNode,
  unreadMessages?: number,
  unreadNotifications?: number
}) {
  const showCounters = user.accessLevel !== "admin";

  return (
    <header className="h-16 bg-white border-b border-stone-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <div className="md:hidden">
          {mobileNav}
        </div>
        <h1 className="text-lg font-semibold text-stone-900 hidden sm:block">
          Welcome back, {user.name.split(" ")[0]} 👋
        </h1>
      </div>

      <form action="/careers" className="hidden md:flex flex-1 max-w-md mx-6">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            name="q"
            type="text"
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-2 bg-stone-100 border-none rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#1A7F5A]/20"
          />
        </div>
      </form>

      <div className="flex items-center gap-2 md:gap-4">
        {showCounters && (
          <>
            <Link
              href="/messages"
              className={buttonVariants({ variant: "ghost", size: "icon" }) + " relative text-stone-500"}
            >
              <MessageSquare className="w-5 h-5" />
              {unreadMessages > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold leading-none text-white">
                  {unreadMessages > 99 ? "99+" : unreadMessages}
                </span>
              )}
            </Link>
            <NotificationBell userId={user.id} level={user.accessLevel} initialUnread={unreadNotifications} />
          </>
        )}
        
        <div className="flex items-center gap-3 border-l border-stone-200 pl-4 ml-2">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-stone-900 leading-tight">{user.name}</p>
            <p className="text-xs text-stone-500">{user.roleName}</p>
          </div>
          <Avatar name={user.name} />
        </div>
      </div>
    </header>
  );
}
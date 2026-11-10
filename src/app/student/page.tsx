import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, Compass, Inbox, MessageSquare, BookOpen, Video, ShieldCheck, Search } from "lucide-react";
import { requireAccessLevel } from "@/lib/auth";
import { getStudentDashboard } from "@/lib/data/dashboard";
import { SessionCard } from "@/components/session-card";

export const metadata: Metadata = { title: "Home" };

export default async function StudentHome() {
  const me = await requireAccessLevel("student");
  const d = await getStudentDashboard(me.id);

  return (
    <div className="w-full pb-20 md:pb-0">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">
            Hello, {me.name.split(" ")[0]} 👋
          </h1>
          <p className="text-stone-500 mt-1">Ready for your next step?</p>
        </div>

        <form action="/careers" className="w-full md:w-auto relative flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input 
              name="q"
              type="text" 
              placeholder="Search careers or mentors..." 
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#1A7F5A]/20 text-sm"
            />
          </div>
        </form>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-8">
        <Link href="/student/requests" className="flex flex-col justify-between p-4 rounded-2xl bg-amber-50 border border-amber-100 hover:shadow-md transition-all">
          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-3">
            <Inbox className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-amber-600 leading-none">{d.pendingRequests}</p>
            <p className="text-xs font-medium text-amber-800/70 mt-1">Pending Requests</p>
          </div>
        </Link>

        <Link href="/student/sessions" className="flex flex-col justify-between p-4 rounded-2xl bg-emerald-50 border border-emerald-100 hover:shadow-md transition-all">
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-[#1A7F5A] flex items-center justify-center mb-3">
            <CalendarClock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-[#1A7F5A] leading-none">{d.upcomingSessions}</p>
            <p className="text-xs font-medium text-emerald-800/70 mt-1">Upcoming Sessions</p>
          </div>
        </Link>

        <Link href="/messages" className="col-span-2 md:col-span-1 flex flex-row md:flex-col justify-between md:justify-start items-center md:items-start p-4 rounded-2xl bg-blue-50 border border-blue-100 hover:shadow-md transition-all">
          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center md:mb-3">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="flex md:flex-col items-center md:items-start gap-2 md:gap-0">
            <p className="text-2xl font-extrabold text-blue-600 leading-none">{d.unreadMessages}</p>
            <p className="text-xs font-medium text-blue-800/70 md:mt-1">Unread Messages</p>
          </div>
        </Link>
      </div>

      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-stone-900">Next Session</h2>
          <Link href="/student/sessions" className="text-sm font-medium text-[#1A7F5A] hover:underline">
            View all
          </Link>
        </div>
        {d.nextSession ? (
          <SessionCard session={d.nextSession} viewer="student" />
        ) : (
          <div className="bg-white border border-dashed border-stone-300 rounded-2xl p-8 text-center">
            <Video className="w-8 h-8 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-600 font-medium">No upcoming sessions</p>
            <p className="text-sm text-stone-400 mt-1">Book a mentor to get started.</p>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-bold text-stone-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          <Link href="/careers" className="group flex items-center gap-4 p-4 bg-white rounded-2xl border border-stone-200 hover:border-[#1A7F5A] transition-all">
            <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-stone-900">Browse Careers</p>
              <p className="text-xs text-stone-500">Explore fields</p>
            </div>
          </Link>

          <Link href="/courses" className="group flex items-center gap-4 p-4 bg-white rounded-2xl border border-stone-200 hover:border-[#1A7F5A] transition-all">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-stone-900">Learn Skills</p>
              <p className="text-xs text-stone-500">Short courses</p>
            </div>
          </Link>

          <Link href="/student/peers" className="group flex items-center gap-4 p-4 bg-white rounded-2xl border border-stone-200 hover:border-[#1A7F5A] transition-all">
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-stone-900">Peer Network</p>
              <p className="text-xs text-stone-500">Connect with students</p>
            </div>
          </Link>

        </div>
      </section>

    </div>
  );
}
"use client";

import Link from "next/link";
import { Church, ClipboardCheck, Landmark, LayoutDashboard, Moon, ScrollText, Sun, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";

type AppShellProps = {
  role: "conference" | "district" | "church";
  title: string;
  children: React.ReactNode;
};

const links = {
  conference: [
    { href: "/conference", label: "Dashboard", icon: LayoutDashboard },
    { href: "/conference/districts", label: "Districts", icon: Landmark },
    { href: "/conference/settings", label: "Settings", icon: ClipboardCheck },
    { href: "/conference/audit", label: "Audit", icon: ScrollText },
  ],
  district: [
    { href: "/district", label: "Dashboard", icon: LayoutDashboard },
    { href: "/district/approvals", label: "Approvals", icon: ClipboardCheck },
    { href: "/district/churches", label: "Churches", icon: Church },
  ],
  church: [
    { href: "/church", label: "Home", icon: LayoutDashboard },
    { href: "/church/members", label: "Members", icon: Users },
    { href: "/church/report", label: "Report", icon: ClipboardCheck },
    { href: "/church/history", label: "History", icon: ScrollText },
  ],
};

export default function AppShell({ role, title, children }: AppShellProps) {
  function toggleTheme() {
    document.documentElement.classList.toggle("dark");
  }
  async function signOut() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      const { orionDb } = await import("@/lib/offline/db");
      await orionDb.delete();
      localStorage.clear();
      sessionStorage.clear();
    } finally {
      // Hard navigation is required so no in-memory auth state survives sign-out.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/login";
    }
  }
  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="hidden border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:block">
        <p className="mb-6 text-lg font-bold text-[#0B1B3A] dark:text-sky-100">ORION</p>
        <nav className="space-y-1">
          {links[role].map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="flex min-h-11 items-center gap-3 rounded-xl px-3 hover:bg-slate-100 dark:hover:bg-slate-800">
              <Icon size={18} /> {label}
            </Link>
          ))}
        </nav>
      </aside>
      <div>
        <header className="sticky top-0 z-10 flex min-h-14 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-xl font-semibold">{title}</h1>
          <div className="flex gap-2">
            <button onClick={toggleTheme} aria-label="Toggle dark mode" className="grid w-11 place-items-center rounded-xl"><Sun size={20} /><span className="sr-only dark:hidden"><Moon size={20} /></span></button>
            <button onClick={signOut} className="rounded-xl px-3 text-red-700 dark:text-red-300">Sign out</button>
          </div>
        </header>
        <main className="mx-auto max-w-6xl p-4 pb-24 md:pb-6">{children}</main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 flex justify-around border-t border-slate-200 bg-white px-2 py-2 dark:border-slate-800 dark:bg-slate-900 md:hidden">
        {links[role].map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="flex min-h-11 min-w-16 flex-col items-center justify-center text-xs">
            <Icon size={18} /> {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

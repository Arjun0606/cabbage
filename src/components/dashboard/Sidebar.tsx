"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  LayoutDashboard,
  FolderOpen,
  Library,
  Bot,
  Wrench,
  Settings,
  CreditCard,
  PlusCircle,
} from "lucide-react";

interface Props {
  companyName: string;
  creditsUsed?: number;
  creditsTotal?: number;
}

export function Sidebar({ companyName, creditsUsed = 0, creditsTotal = 1000 }: Props) {
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", label: "CMO", icon: Bot, active: pathname === "/dashboard" },
    { href: "/settings", label: "Settings", icon: Settings, active: pathname === "/settings" },
  ];

  return (
    <div className="w-56 h-screen bg-zinc-950 border-r border-zinc-800 flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-zinc-800">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <Sparkles size={14} className="text-emerald-400" />
          </div>
          <span className="font-semibold text-sm text-zinc-100">CabbageSEO</span>
        </Link>
      </div>

      {/* New chat */}
      <div className="px-3 py-3">
        <Link href="/">
          <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors">
            <PlusCircle size={14} />
            New site
          </button>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon, active }) => (
          <Link key={href} href={href}>
            <button
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-zinc-800/80 text-zinc-100"
                  : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          </Link>
        ))}
      </nav>

      {/* Credits meter */}
      <div className="px-3 py-3 border-t border-zinc-800">
        <div className="px-3 py-2 rounded-lg bg-zinc-900/50">
          <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1.5">
            <span>Credits</span>
            <span>{creditsUsed.toLocaleString()} / {creditsTotal.toLocaleString()}</span>
          </div>
          <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${Math.min(100, (creditsUsed / creditsTotal) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Account */}
      <div className="px-3 py-3 border-t border-zinc-800">
        <div className="flex items-center gap-2 px-3">
          <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400">
            {companyName ? companyName.charAt(0).toUpperCase() : "?"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-zinc-300 truncate">{companyName || "No site"}</div>
            <div className="text-[10px] text-zinc-600">Free trial</div>
          </div>
        </div>
      </div>
    </div>
  );
}

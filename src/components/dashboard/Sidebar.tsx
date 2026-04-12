"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  Bot,
  Settings,
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

  const pct = Math.min(100, (creditsUsed / creditsTotal) * 100);

  return (
    <div className="w-[56px] h-screen bg-[#0a0a0b] border-r border-zinc-800/60 flex flex-col items-center flex-shrink-0">
      {/* Logo */}
      <div className="py-4">
        <Link href="/" className="block">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:border-zinc-700 transition-colors">
            <Sparkles size={15} className="text-emerald-400" />
          </div>
        </Link>
      </div>

      {/* New site */}
      <div className="mb-2">
        <Link href="/">
          <button
            className="w-8 h-8 rounded-lg bg-zinc-900/80 border border-zinc-800/60 flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 hover:border-zinc-700 transition-all"
            title="New site"
          >
            <PlusCircle size={15} />
          </button>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col items-center gap-1 pt-1">
        {navItems.map(({ href, label, icon: Icon, active }) => (
          <Link key={href} href={href}>
            <button
              className={`w-9 h-9 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all ${
                active
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-600 hover:bg-zinc-900 hover:text-zinc-400"
              }`}
              title={label}
            >
              <Icon size={16} />
              <span className="text-[8px] font-medium leading-none">{label}</span>
            </button>
          </Link>
        ))}
      </nav>

      {/* Credits ring */}
      <div className="py-2 mb-1" title={`${creditsUsed} / ${creditsTotal} credits`}>
        <div className="relative w-8 h-8">
          <svg width="32" height="32" className="-rotate-90">
            <circle cx="16" cy="16" r="12" fill="none" stroke="rgb(39 39 42)" strokeWidth="2" />
            <circle
              cx="16" cy="16" r="12"
              fill="none" stroke="rgb(52 211 153)" strokeWidth="2"
              strokeDasharray={2 * Math.PI * 12}
              strokeDashoffset={2 * Math.PI * 12 - (pct / 100) * 2 * Math.PI * 12}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[7px] font-bold text-zinc-500">
            {creditsUsed}
          </span>
        </div>
      </div>

      {/* Account avatar */}
      <div className="pb-3">
        <div
          className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700/50 flex items-center justify-center text-[10px] font-bold text-zinc-400"
          title={companyName || "No site"}
        >
          {companyName ? companyName.charAt(0).toUpperCase() : "?"}
        </div>
      </div>
    </div>
  );
}

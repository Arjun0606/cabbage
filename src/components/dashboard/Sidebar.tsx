"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Bot,
  Settings,
  PlusCircle,
} from "lucide-react";
import Image from "next/image";

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

  const remaining = creditsTotal - creditsUsed;
  const pct = Math.min(100, (remaining / creditsTotal) * 100);

  // Color-code credits ring: green > 60%, amber > 25%, red below
  const ringColor = pct > 60 ? "#7CB342" : pct > 25 ? "#F59E0B" : "#EF4444";

  return (
    <div className="w-[56px] h-screen bg-[#0a0a0b] border-r border-white/[0.06] flex flex-col items-center flex-shrink-0">
      {/* Logo */}
      <div className="py-4">
        <Link href="/" className="block">
          <div className="w-8 h-8 rounded-lg overflow-hidden hover:opacity-80 active:scale-[0.97] transition-all duration-150">
            <Image src="/logo.png" alt="Cabbge" width={32} height={32} className="w-full h-full object-contain" />
          </div>
        </Link>
      </div>

      {/* New site */}
      <div className="mb-2">
        <Link href="/">
          <button
            className="w-8 h-8 rounded-lg bg-zinc-900/80 border border-white/[0.06] flex items-center justify-center text-zinc-500 hover:text-[#7CB342] hover:bg-[#7CB342]/10 hover:border-[#7CB342]/20 active:scale-[0.97] transition-all duration-150"
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
              className={`relative w-9 h-9 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all duration-150 active:scale-[0.97] ${
                active
                  ? "bg-[#7CB342]/10 text-[#7CB342]"
                  : "text-zinc-600 hover:bg-zinc-800/60 hover:text-zinc-400"
              }`}
              title={label}
            >
              {active && (
                <div className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r-full bg-[#7CB342]" />
              )}
              <Icon size={16} />
              <span className="text-[8px] font-medium leading-none">{label}</span>
            </button>
          </Link>
        ))}
      </nav>

      {/* Credits ring — color-coded by remaining */}
      <div className="py-2 mb-1" title={`${remaining.toLocaleString()} credits remaining`}>
        <div className="relative w-8 h-8">
          <svg width="32" height="32" className="-rotate-90">
            <circle cx="16" cy="16" r="12" fill="none" stroke="rgb(39 39 42 / 0.4)" strokeWidth="2" />
            <circle
              cx="16" cy="16" r="12"
              fill="none" stroke={ringColor} strokeWidth="2"
              strokeDasharray={2 * Math.PI * 12}
              strokeDashoffset={2 * Math.PI * 12 - (pct / 100) * 2 * Math.PI * 12}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[7px] font-bold text-zinc-400 tabular-nums">
            {remaining > 999 ? "1K" : remaining}
          </span>
        </div>
      </div>

      {/* Account avatar */}
      <div className="pb-3">
        <div
          className="w-8 h-8 rounded-full bg-zinc-800/80 border border-white/[0.06] flex items-center justify-center text-[10px] font-bold text-zinc-400 hover:border-zinc-600 transition-colors duration-150"
          title={companyName || "No site"}
        >
          {companyName ? companyName.charAt(0).toUpperCase() : "?"}
        </div>
      </div>
    </div>
  );
}

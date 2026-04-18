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

  // Credit display removed — let users use freely, upsell when they see value
  void creditsUsed; void creditsTotal;

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

      {/* Credits ring hidden — product philosophy: let users use freely,
          upsell when they've seen the value. Showing a shrinking counter
          makes users wary and reduces engagement. */}

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

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/tournaments", label: "Tournaments" },
  { href: "/leaderboards", label: "Leaderboards" },
  { href: "/social", label: "Social" },
  { href: "/lfg", label: "LFG" },
  { href: "/clubs", label: "Clubs" },
  { href: "/achievements", label: "Achievements" },
  { href: "/whitepaper", label: "Whitepaper" },
];

export function Header() {
  const { address, isConnected } = useAccount();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 bg-black/70 backdrop-blur-2xl border-b border-white/[0.06]">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 bg-avax-red rounded-lg flex items-center justify-center shadow-lg shadow-avax-red/20 group-hover:shadow-avax-red/40 transition-shadow">
              <span className="text-white font-extrabold text-sm tracking-tight">P1</span>
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="font-bold text-base leading-none tracking-tight">PLAYER1</span>
              <span className="text-[10px] text-avax-text uppercase tracking-[0.2em] leading-none mt-0.5">Protocol</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-0.5">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all relative ${
                  isActive(link.href)
                    ? "text-white bg-white/[0.06]"
                    : "text-avax-text hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                {link.label}
                {isActive(link.href) && (
                  <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-avax-red rounded-full" />
                )}
              </Link>
            ))}
            {isConnected && (
              <Link
                href={`/player/${address}`}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all relative ${
                  pathname.startsWith("/player")
                    ? "text-white bg-white/[0.06]"
                    : "text-avax-text hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                My Profile
                {pathname.startsWith("/player") && (
                  <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-avax-red rounded-full" />
                )}
              </Link>
            )}

            <div className="w-px h-6 bg-avax-border mx-2" />

            <Link
              href="/tournaments/create"
              className="px-4 py-2 bg-avax-red/10 hover:bg-avax-red/20 text-avax-red font-semibold rounded-xl text-sm transition-all border border-avax-red/20 hover:border-avax-red/40"
            >
              + Create
            </Link>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <ConnectButton
              chainStatus="icon"
              showBalance={false}
              accountStatus={{
                smallScreen: "avatar",
                largeScreen: "full",
              }}
            />

            {/* Mobile Menu */}
            <button
              className="md:hidden p-2 text-avax-text hover:text-white rounded-xl hover:bg-white/[0.06] transition-all"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-3 border-t border-white/[0.06] space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`block px-4 py-3 rounded-xl transition-all text-sm font-medium ${
                  isActive(link.href)
                    ? "text-white bg-white/[0.06] border-l-2 border-avax-red"
                    : "text-avax-text hover:text-white hover:bg-white/[0.04]"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {isConnected && (
              <Link
                href={`/player/${address}`}
                className={`block px-4 py-3 rounded-xl transition-all text-sm font-medium ${
                  pathname.startsWith("/player")
                    ? "text-white bg-white/[0.06] border-l-2 border-avax-red"
                    : "text-avax-text hover:text-white hover:bg-white/[0.04]"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                My Profile
              </Link>
            )}
            <Link
              href="/tournaments/create"
              className="block px-4 py-3 mt-2 bg-avax-red text-white font-semibold rounded-xl transition-all text-center text-sm"
              onClick={() => setMobileMenuOpen(false)}
            >
              Create Tournament
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}

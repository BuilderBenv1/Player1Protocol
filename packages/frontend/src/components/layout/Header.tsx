"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/tournaments", label: "Tournaments" },
  { href: "/achievements", label: "Achievements" },
];

export function Header() {
  const { address, isConnected } = useAccount();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Check if a nav link is active (exact match for home, startsWith for others)
  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 bg-avax-darker/80 backdrop-blur-lg border-b border-avax-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-avax-red rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">P1</span>
            </div>
            <span className="font-bold text-xl hidden sm:block">Player1</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg transition-colors relative ${
                  isActive(link.href)
                    ? "text-white"
                    : "text-avax-text hover:text-white hover:bg-avax-card"
                }`}
              >
                {link.label}
                {isActive(link.href) && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-avax-red rounded-full" />
                )}
              </Link>
            ))}
            {isConnected && (
              <Link
                href={`/player/${address}`}
                className={`px-4 py-2 rounded-lg transition-colors relative ${
                  pathname.startsWith("/player")
                    ? "text-white"
                    : "text-avax-text hover:text-white hover:bg-avax-card"
                }`}
              >
                My Profile
                {pathname.startsWith("/player") && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-avax-red rounded-full" />
                )}
              </Link>
            )}
            {/* Create Tournament CTA */}
            <Link
              href="/tournaments/create"
              className="ml-2 px-4 py-2 bg-avax-red hover:bg-avax-red/80 text-white font-semibold rounded-lg transition-colors"
            >
              Create Tournament
            </Link>
          </nav>

          {/* Wallet Connect */}
          <div className="flex items-center gap-4">
            <ConnectButton
              chainStatus="icon"
              showBalance={false}
              accountStatus={{
                smallScreen: "avatar",
                largeScreen: "full",
              }}
            />

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-avax-text hover:text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-avax-border space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`block px-4 py-3 rounded-lg transition-colors ${
                  isActive(link.href)
                    ? "text-white bg-avax-card border-l-2 border-avax-red"
                    : "text-avax-text hover:text-white hover:bg-avax-card"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {isConnected && (
              <Link
                href={`/player/${address}`}
                className={`block px-4 py-3 rounded-lg transition-colors ${
                  pathname.startsWith("/player")
                    ? "text-white bg-avax-card border-l-2 border-avax-red"
                    : "text-avax-text hover:text-white hover:bg-avax-card"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                My Profile
              </Link>
            )}
            {/* Create Tournament CTA - Mobile */}
            <Link
              href="/tournaments/create"
              className="block px-4 py-3 mt-2 bg-avax-red hover:bg-avax-red/80 text-white font-semibold rounded-lg transition-colors text-center"
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

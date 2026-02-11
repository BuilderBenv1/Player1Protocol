"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-avax-border bg-avax-darker">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-avax-red rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">P1</span>
              </div>
              <span className="font-bold text-xl">Player1 Protocol</span>
            </div>
            <p className="text-avax-text text-sm max-w-md">
              Your On-Chain Competitive Identity. Open competitive infrastructure
              for the Avalanche ecosystem. Trustless tournaments, portable reputation,
              achievement-based rewards.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">Protocol</h4>
            <ul className="space-y-2 text-sm text-avax-text">
              <li>
                <Link href="/tournaments" className="hover:text-white transition-colors">
                  Tournaments
                </Link>
              </li>
              <li>
                <Link href="/achievements" className="hover:text-white transition-colors">
                  Achievements
                </Link>
              </li>
              <li>
                <Link href="/tournaments/create" className="hover:text-white transition-colors">
                  Create Tournament
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-2 text-sm text-avax-text">
              <li>
                <a
                  href="#"
                  className="hover:text-white transition-colors"
                >
                  Documentation
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-white transition-colors"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://testnet.snowtrace.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Avalanche Explorer
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-avax-border mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-avax-text">
            Player1 Protocol - Open Competitive Infrastructure
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-avax-text">Built on</span>
            <svg className="w-5 h-5 text-avax-red" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
              <path d="M16.5 8h-3l-1.5 2.5L10.5 8h-3l3 5-3 5h3l1.5-2.5L13.5 18h3l-3-5z" />
            </svg>
            <span className="text-avax-red font-semibold">Avalanche</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

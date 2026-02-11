"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/[0.04] bg-black/40">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-avax-red rounded-lg flex items-center justify-center shadow-lg shadow-avax-red/10">
                <span className="text-white font-extrabold text-xs">P1</span>
              </div>
              <div>
                <span className="font-bold text-base tracking-tight">PLAYER1</span>
                <span className="text-avax-text text-xs ml-1.5">PROTOCOL</span>
              </div>
            </div>
            <p className="text-avax-text text-sm max-w-sm leading-relaxed">
              Open competitive infrastructure for the Avalanche ecosystem.
              Trustless tournaments, portable reputation, achievement-based rewards.
            </p>
          </div>

          {/* Protocol */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-avax-text-light mb-4">Protocol</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/tournaments" className="text-avax-text hover:text-white transition-colors">
                  Tournaments
                </Link>
              </li>
              <li>
                <Link href="/achievements" className="text-avax-text hover:text-white transition-colors">
                  Achievements
                </Link>
              </li>
              <li>
                <Link href="/tournaments/create" className="text-avax-text hover:text-white transition-colors">
                  Create Tournament
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-avax-text-light mb-4">Resources</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a
                  href="https://github.com/BuilderBenv1/Player1Protocol"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-avax-text hover:text-white transition-colors"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://snowtrace.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-avax-text hover:text-white transition-colors"
                >
                  Snowtrace Explorer
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/[0.04] mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-avax-text">
            Player1 Protocol &middot; Open Competitive Infrastructure
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-avax-text">Powered by</span>
            <span className="text-avax-red font-bold text-xs tracking-wide">AVALANCHE</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

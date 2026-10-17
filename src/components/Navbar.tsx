import React, { useState } from 'react';
import { Wallet, Layers, Menu, X, ArrowUpRight } from 'lucide-react';

interface NavbarProps {
  activeCount: number;
  onOpenPortfolio: () => void;
  onSelectPackageScroll: () => void;
  btcPrice: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeCount,
  onOpenPortfolio,
  onSelectPackageScroll,
  btcPrice,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 py-3 sm:py-4">
          {/* Zone 1: Brand title wordmark */}
          <a
            href="#"
            className="group flex items-center gap-2.5 text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 min-h-[44px]"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 shadow-sm shadow-amber-500/20">
              <span className="font-mono text-sm font-black">A</span>
            </div>
            <span>Aurum Capital</span>
          </a>

          {/* Zone 2: Desktop clean single-line navigation links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-400">
            <button
              onClick={onSelectPackageScroll}
              className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer py-2"
            >
              <Layers className="h-4 w-4 text-slate-500" />
              <span>Investment Plans</span>
            </button>
            <button
              onClick={onOpenPortfolio}
              className="hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer py-2"
            >
              <Wallet className="h-4 w-4 text-slate-500" />
              <span>Portfolio</span>
              {activeCount > 0 && (
                <span className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 tabular-nums">
                  {activeCount}
                </span>
              )}
            </button>
          </nav>

          {/* Zone 3: 1 primary action + Mobile toggles */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {/* Live BTC Price Badge */}
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-400 font-mono tabular-nums border border-slate-800 bg-slate-900/80 px-2 sm:px-3 py-1.5 rounded-lg min-h-[36px]">
              <span className="text-amber-400 font-semibold">BTC</span>
              <span>${btcPrice.toLocaleString()}</span>
            </div>

            {/* Primary Action Button (Desktop) */}
            <button
              onClick={activeCount > 0 ? onOpenPortfolio : onSelectPackageScroll}
              className="hidden sm:flex px-4 py-2 text-xs font-semibold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 rounded-lg hover:from-amber-300 hover:to-amber-400 transition-all shadow-sm shadow-amber-500/20 whitespace-nowrap shrink-0 cursor-pointer active:scale-95 min-h-[44px] items-center"
            >
              {activeCount > 0 ? `Portfolio (${activeCount})` : 'Start Investing'}
            </button>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex h-11 w-11 items-center justify-center rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800/80 bg-slate-950/98 px-4 py-4 space-y-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onSelectPackageScroll();
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-900/50 hover:bg-slate-900 text-white text-sm font-semibold cursor-pointer min-h-[48px]"
            >
              <div className="flex items-center gap-3">
                <Layers className="h-5 w-5 text-amber-400" />
                <span>Investment Packages</span>
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-500" />
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenPortfolio();
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-900/50 hover:bg-slate-900 text-white text-sm font-semibold cursor-pointer min-h-[48px]"
            >
              <div className="flex items-center gap-3">
                <Wallet className="h-5 w-5 text-amber-400" />
                <span>Active Portfolio</span>
              </div>
              <div className="flex items-center gap-2">
                {activeCount > 0 && (
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-amber-400 text-slate-950">
                    {activeCount} Active
                  </span>
                )}
                <ArrowUpRight className="h-4 w-4 text-slate-500" />
              </div>
            </button>

            <div className="pt-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onSelectPackageScroll();
                }}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md min-h-[48px]"
              >
                <span>Choose Investment Package</span>
              </button>
            </div>
          </div>
        )}
      </header>
    </>
  );
};

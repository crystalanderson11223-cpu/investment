import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Wallet, Layers, Menu, X, LogIn, LogOut } from 'lucide-react';

interface NavbarProps {
  activeCount: number;
  onOpenPortfolio: () => void;
  onSelectPackageScroll: () => void;
  onOpenAuth: (mode?: 'login' | 'signup') => void;
  onOpenAdmin?: () => void;
  btcPrice: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeCount,
  onOpenPortfolio,
  onSelectPackageScroll,
  onOpenAuth,
  onOpenAdmin,
  btcPrice,
}) => {
  const { currentUser, isAdmin, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 py-3 sm:py-4">
          {/* Zone 1: Brand title wordmark */}
          <a
            href="#"
            className="group flex items-center gap-2 text-xs sm:text-base md:text-lg font-bold tracking-tight text-slate-900 shrink-0 min-h-[44px]"
          >
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 shadow-sm shadow-amber-500/20 shrink-0">
              <span className="font-mono text-xs sm:text-sm font-black">N</span>
            </div>
            <span className="truncate max-w-[150px] sm:max-w-none">New Investment Company</span>
          </a>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              onClick={onSelectPackageScroll}
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer py-2"
            >
              <Layers className="h-4 w-4 text-slate-400" />
              <span>Investment Plans</span>
            </button>
            <button
              onClick={currentUser ? onOpenPortfolio : () => onOpenAuth('login')}
              className="hover:text-amber-600 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer py-2"
            >
              <Wallet className="h-4 w-4 text-slate-400" />
              <span>Portfolio</span>
              {currentUser && activeCount > 0 && (
                <span className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 tabular-nums">
                  {activeCount}
                </span>
              )}
            </button>
          </nav>

          {/* Zone 3: Actions & Auth */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Live BTC Price Badge */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600 font-mono tabular-nums border border-slate-200 bg-slate-50 px-2.5 py-1.5 rounded-lg min-h-[36px]">
              <span className="text-amber-600 font-semibold">BTC</span>
              <span>${btcPrice.toLocaleString()}</span>
            </div>

            {/* User Auth Info */}
            {currentUser ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    if (isAdmin && onOpenAdmin) {
                      onOpenAdmin();
                    }
                  }}
                  className={`hidden md:block text-xs font-mono truncate max-w-[140px] px-2 py-1 rounded transition-colors ${
                    isAdmin
                      ? 'text-slate-700 hover:text-amber-700 hover:bg-amber-50 cursor-pointer'
                      : 'text-slate-600 cursor-default'
                  }`}
                  title={isAdmin ? 'Administrator Profile' : 'Current User'}
                >
                  {currentUser.email}
                </button>
                <button
                  onClick={() => logout()}
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1 min-h-[36px]"
                  title="Sign Out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onOpenAuth('login')}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer min-h-[36px] flex items-center gap-1"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Sign In</span>
                </button>
                <button
                  onClick={() => onOpenAuth('signup')}
                  className="hidden sm:flex px-3 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors cursor-pointer min-h-[36px] items-center shadow-sm"
                >
                  Sign Up
                </button>
              </div>
            )}

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-2 shadow-lg">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onSelectPackageScroll();
              }}
              className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-50 text-slate-900 text-xs font-semibold"
            >
              <div className="flex items-center gap-2.5">
                <Layers className="h-4 w-4 text-amber-500" />
                <span>Investment Packages</span>
              </div>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                if (currentUser) {
                  onOpenPortfolio();
                } else {
                  onOpenAuth('login');
                }
              }}
              className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-50 text-slate-900 text-xs font-semibold"
            >
              <div className="flex items-center gap-2.5">
                <Wallet className="h-4 w-4 text-amber-500" />
                <span>Portfolio</span>
              </div>
              {currentUser && activeCount > 0 && (
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-bold">
                  {activeCount}
                </span>
              )}
            </button>

            {!currentUser ? (
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('login');
                  }}
                  className="py-2.5 rounded-lg bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('signup');
                  }}
                  className="py-2.5 rounded-lg bg-amber-400 text-slate-950 text-xs font-bold shadow-sm"
                >
                  Sign Up
                </button>
              </div>
            ) : (
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  onClick={() => {
                    if (isAdmin && onOpenAdmin) {
                      setMobileMenuOpen(false);
                      onOpenAdmin();
                    }
                  }}
                  className="text-slate-600 font-mono truncate max-w-[200px] text-left"
                >
                  {currentUser.email}
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="text-red-600 font-semibold cursor-pointer"
                >
                  Log Out
                </button>
              </div>
            )}
          </div>
        )}
      </header>
    </>
  );
};

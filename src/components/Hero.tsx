import React from 'react';
import { Wallet, ShieldCheck, Zap } from 'lucide-react';

interface HeroProps {
  onOpenPortfolio: () => void;
  activeCount: number;
}

export const Hero: React.FC<HeroProps> = ({ onOpenPortfolio, activeCount }) => {
  return (
    <section className="py-8 sm:py-12 border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 space-y-6">
        {/* Introductory Overview */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md font-mono">
            <Zap className="h-3 w-3" />
            <span>Digital Asset Investment & Yield Portal</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Institutional Bitcoin Wealth Management
          </h1>

          <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
            Welcome to New Investment Company. We provide structured digital asset packages offering predictable annualized returns settled on the Bitcoin blockchain. Monitor live market exchange rates, review package parameters, and manage your active positions with direct on-chain verification.
          </p>
        </div>

        {/* Action Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-4 text-xs text-slate-500 font-mono">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Direct Bitcoin Settlement</span>
            </span>
            <span>·</span>
            <span>Fixed Duration Tiers</span>
          </div>

          {activeCount > 0 && (
            <button
              onClick={onOpenPortfolio}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold cursor-pointer shadow-xs transition-colors"
            >
              <Wallet className="h-4 w-4 text-amber-500" />
              <span>Active Portfolio ({activeCount})</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

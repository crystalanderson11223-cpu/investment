import React from 'react';
import { Wallet } from 'lucide-react';

interface HeroProps {
  onOpenPortfolio: () => void;
  activeCount: number;
}

export const Hero: React.FC<HeroProps> = ({ onOpenPortfolio, activeCount }) => {
  return (
    <section className="py-8 sm:py-12 border-b border-slate-800">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Investment Packages
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Select a package below to invest via Bitcoin.
            </p>
          </div>

          {activeCount > 0 && (
            <button
              onClick={onOpenPortfolio}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 hover:text-white text-xs font-semibold cursor-pointer w-fit"
            >
              <Wallet className="h-4 w-4 text-amber-400" />
              <span>My Investments ({activeCount})</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

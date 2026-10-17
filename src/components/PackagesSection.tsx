import React from 'react';
import { InvestmentPackage } from '../types/investment';
import { formatUSD } from '../utils/bitcoin';
import { ArrowRight } from 'lucide-react';

interface PackagesSectionProps {
  packages: InvestmentPackage[];
  onSelectPackage: (pkg: InvestmentPackage) => void;
}

export const PackagesSection: React.FC<PackagesSectionProps> = ({
  packages,
  onSelectPackage,
}) => {
  return (
    <section id="packages" className="py-8 sm:py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h2 className="text-base font-bold text-white">{pkg.name}</h2>
                  <span className="text-base font-bold text-amber-400 font-mono">
                    {pkg.apyPercent}% APY
                  </span>
                </div>

                <div className="py-4 space-y-2 text-xs font-mono text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Duration:</span>
                    <span className="text-white font-semibold">{pkg.termDays} Days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Payouts:</span>
                    <span className="text-white font-semibold">{pkg.payoutFrequency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Min Deposit:</span>
                    <span className="text-white font-semibold">{formatUSD(pkg.minAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Max Deposit:</span>
                    <span className="text-white font-semibold">{formatUSD(pkg.maxAmount)}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onSelectPackage(pkg)}
                className="w-full mt-2 py-3 px-4 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-98 min-h-[44px]"
              >
                <span>Select & Pay via Bitcoin</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

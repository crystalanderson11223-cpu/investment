import React from 'react';
import { InvestmentPackage } from '../types/investment';
import { formatUSD } from '../utils/bitcoin';
import { ArrowRight, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface PackagesSectionProps {
  packages: InvestmentPackage[];
  onSelectPackage: (pkg: InvestmentPackage) => void;
  onRequireAuth: (mode?: 'login' | 'signup') => void;
}

export const PackagesSection: React.FC<PackagesSectionProps> = ({
  packages,
  onSelectPackage,
  onRequireAuth,
}) => {
  const { currentUser } = useAuth();

  return (
    <section id="packages" className="py-8 sm:py-12 border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Investment Packages
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {currentUser
              ? 'Select a package below to fund directly via Bitcoin.'
              : 'Sign in or sign up to view available offers.'}
          </p>
        </div>

        {/* If user is NOT signed in: Concise Gated View */}
        {!currentUser ? (
          <div className="p-8 sm:p-10 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white border border-slate-200 text-amber-500 shadow-sm">
              <Lock className="h-5 w-5" />
            </div>

            <p className="text-sm font-semibold text-slate-800">
              Sign in or sign up to view available offers.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              <button
                onClick={() => onRequireAuth('login')}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-colors cursor-pointer shadow-sm min-h-[42px]"
              >
                Sign In
              </button>
              <button
                onClick={() => onRequireAuth('signup')}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold transition-colors cursor-pointer min-h-[42px]"
              >
                Sign Up
              </button>
            </div>
          </div>
        ) : (
          /* Logged In: Full Investment Packages Grid in Light Mode */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="p-5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between hover:border-slate-300 transition-colors shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <h3 className="text-base font-bold text-slate-900">{pkg.name}</h3>
                    <span className="text-base font-bold text-amber-600 font-mono">
                      {pkg.apyPercent}% APY
                    </span>
                  </div>

                  <div className="py-4 space-y-2 text-xs font-mono text-slate-700">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Duration:</span>
                      <span className="text-slate-900 font-semibold">{pkg.termDays} Days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Payouts:</span>
                      <span className="text-slate-900 font-semibold">{pkg.payoutFrequency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Min Deposit:</span>
                      <span className="text-slate-900 font-semibold">{formatUSD(pkg.minAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Max Deposit:</span>
                      <span className="text-slate-900 font-semibold">{formatUSD(pkg.maxAmount)}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onSelectPackage(pkg)}
                  className="w-full mt-2 py-3 px-4 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-98 min-h-[44px] shadow-sm"
                >
                  <span>Select & Pay via Bitcoin</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

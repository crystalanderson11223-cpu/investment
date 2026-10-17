import React from 'react';
import { UserCheck, ShieldCheck, Cpu } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  return (
    <section className="py-10 border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="mb-8">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-600 font-mono mb-1">
            Platform Workflow
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            How The Allocation System Works
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Three simple steps to fund and manage your Bitcoin yield positions.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 shadow-sm">
            <div className="flex items-center gap-2 text-amber-600">
              <UserCheck className="h-5 w-5" />
              <span className="font-mono text-xs font-bold">01. Account Access</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900">Create Client Profile</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Register your authenticated profile with email credentials to access package allocation parameters.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 shadow-sm">
            <div className="flex items-center gap-2 text-amber-600">
              <Cpu className="h-5 w-5" />
              <span className="font-mono text-xs font-bold">02. Select Strategy</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900">Choose Yield Term</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Review minimum deposit thresholds, APY percentage, and scheduled distribution cycles.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 shadow-sm">
            <div className="flex items-center gap-2 text-amber-600">
              <ShieldCheck className="h-5 w-5" />
              <span className="font-mono text-xs font-bold">03. BTC Settlement</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900">Fund via Bitcoin</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Complete on-chain transfer to the unique SegWit deposit address. Submissions undergo manual verification.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

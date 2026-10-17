import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 py-6 text-slate-500 text-xs font-mono">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        <div>
          <span>© {new Date().getFullYear()} New Investment Company · Bitcoin Payments</span>
        </div>

        <div className="flex items-center gap-4 text-slate-400 text-[11px]">
          <span>Institutional Yield Desks</span>
          <span>·</span>
          <span>Verified Bitcoin Ledger</span>
        </div>
      </div>
    </footer>
  );
};

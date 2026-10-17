import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 py-6 text-slate-500 text-xs font-mono">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
        <span>© {new Date().getFullYear()} Aurum Capital · Bitcoin Payments</span>
        <span>Native SegWit (BTC)</span>
      </div>
    </footer>
  );
};

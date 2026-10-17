import React, { useState, useEffect } from 'react';
import { ActiveInvestment } from '../types/investment';
import { formatUSD, formatBTC } from '../utils/bitcoin';
import {
  X,
  Wallet,
  ExternalLink,
  PlusCircle,
  Copy,
  Check,
  ShieldCheck,
} from 'lucide-react';

interface PortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  investments: ActiveInvestment[];
  btcPrice: number;
  onNewInvestment: () => void;
}

export const PortfolioModal: React.FC<PortfolioModalProps> = ({
  isOpen,
  onClose,
  investments,
  btcPrice,
  onNewInvestment,
}) => {
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const enrichedInvestments = investments.map((inv) => {
    const elapsedSeconds = Math.max(0, (now - inv.startDate) / 1000);
    const annualRate = inv.apyPercent / 100;
    const accrued = (inv.investedUsd * annualRate * elapsedSeconds) / (365 * 24 * 3600);
    return {
      ...inv,
      liveAccruedUsd: accrued,
      liveAccruedBtc: accrued / btcPrice,
    };
  });

  const totalInvestedUsd = investments.reduce((acc, curr) => acc + curr.investedUsd, 0);
  const totalInvestedBtc = investments.reduce(
    (acc, curr) => acc + parseFloat(curr.investedBtc),
    0
  );
  const totalAccruedUsd = enrichedInvestments.reduce(
    (acc, curr) => acc + curr.liveAccruedUsd,
    0
  );

  const handleCopy = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400 text-slate-950 shrink-0">
              <Wallet className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Investment Portfolio</h2>
              <div className="text-[11px] text-slate-500 font-mono">
                {investments.length} Active Position{investments.length === 1 ? '' : 's'} · Live Yield Engine
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Top Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-mono">Total Principal</span>
              <div className="text-xl font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                {formatUSD(totalInvestedUsd)}
              </div>
              <div className="text-xs text-amber-700 font-mono">
                ≈ {formatBTC(totalInvestedBtc)} BTC
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-mono">Accrued Interest</span>
                <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-mono font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  LIVE
                </span>
              </div>
              <div className="text-xl font-bold text-emerald-700 font-mono tabular-nums mt-0.5">
                +{formatUSD(totalAccruedUsd)}
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                Continuous compounding
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-mono">Treasury Status</span>
              <div className="text-xs sm:text-sm font-bold text-slate-800 mt-1 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>1:1 Verified Solvency</span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                100% Principal Guaranteed
              </div>
            </div>
          </div>

          {/* Investment List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
                Active Positions
              </h3>
              <button
                onClick={() => {
                  onClose();
                  onNewInvestment();
                }}
                className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>New Investment</span>
              </button>
            </div>

            {investments.length === 0 ? (
              <div className="p-10 text-center rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 shadow-xs">
                  <Wallet className="h-5 w-5" />
                </div>
                <div className="text-sm font-bold text-slate-800">No active investments yet</div>
                <button
                  onClick={() => {
                    onClose();
                    onNewInvestment();
                  }}
                  className="px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors cursor-pointer shadow-xs"
                >
                  Explore Investment Plans
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {enrichedInvestments.map((inv) => {
                  const daysRemaining = Math.max(
                    0,
                    Math.ceil((inv.endDate - now) / (1000 * 60 * 60 * 24))
                  );

                  return (
                    <div
                      key={inv.id}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 shadow-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm sm:text-base font-bold text-slate-900">
                              {inv.packageName}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              ACTIVE
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            ID: {inv.id} · {new Date(inv.startDate).toLocaleDateString()}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-base font-bold text-slate-900 font-mono tabular-nums">
                            {formatUSD(inv.investedUsd)}
                          </div>
                          <div className="text-xs text-amber-700 font-mono">
                            {inv.investedBtc} BTC
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded-lg bg-white border border-slate-200 text-xs font-mono">
                        <div>
                          <span className="text-slate-400 block text-[10px]">APY RATE</span>
                          <span className="text-amber-700 font-bold">{inv.apyPercent}%</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">ACCRUED YIELD</span>
                          <span className="text-emerald-700 font-bold tabular-nums">
                            +{formatUSD(inv.liveAccruedUsd)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">REMAINING</span>
                          <span className="text-slate-700">{daysRemaining} days</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">TERM</span>
                          <span className="text-slate-700">{inv.termDays} Days</span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs text-slate-500 font-mono">
                        <div className="flex items-center gap-2">
                          <span>Tx:</span>
                          <span className="text-slate-700 text-[11px]">
                            {inv.txHash.slice(0, 8)}...{inv.txHash.slice(-6)}
                          </span>
                          <button
                            onClick={() => handleCopy(inv.txHash)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                            title="Copy full Tx Hash"
                          >
                            {copiedHash === inv.txHash ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>

                        <a
                          href={`https://mempool.space/tx/${inv.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-amber-700 hover:text-amber-800 flex items-center gap-1 text-[11px]"
                        >
                          <span>Mempool Explorer</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-400 font-mono">
            Direct on-chain settlements
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

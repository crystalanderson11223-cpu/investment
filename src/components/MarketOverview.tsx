import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface CryptoPrice {
  symbol: string;
  name: string;
  priceUsd: number;
  change24h: number;
}

const DEFAULT_MARKET_DATA: CryptoPrice[] = [
  { symbol: 'BTC', name: 'Bitcoin', priceUsd: 68450, change24h: 2.14 },
  { symbol: 'ETH', name: 'Ethereum', priceUsd: 2640, change24h: 1.82 },
  { symbol: 'SOL', name: 'Solana', priceUsd: 154.2, change24h: -0.65 },
  { symbol: 'USDT', name: 'Tether USD', priceUsd: 1.0, change24h: 0.01 },
];

export const MarketOverview: React.FC = () => {
  const [marketData, setMarketData] = useState<CryptoPrice[]>(DEFAULT_MARKET_DATA);

  useEffect(() => {
    async function loadPrices() {
      try {
        const res = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,tether&vs_currencies=usd&include_24hr_change=true'
        );
        if (res.ok) {
          const json = await res.json();
          setMarketData([
            {
              symbol: 'BTC',
              name: 'Bitcoin',
              priceUsd: json.bitcoin?.usd || 68450,
              change24h: json.bitcoin?.usd_24h_change || 2.14,
            },
            {
              symbol: 'ETH',
              name: 'Ethereum',
              priceUsd: json.ethereum?.usd || 2640,
              change24h: json.ethereum?.usd_24h_change || 1.82,
            },
            {
              symbol: 'SOL',
              name: 'Solana',
              priceUsd: json.solana?.usd || 154.2,
              change24h: json.solana?.usd_24h_change || -0.65,
            },
            {
              symbol: 'USDT',
              name: 'Tether USD',
              priceUsd: json.tether?.usd || 1.0,
              change24h: json.tether?.usd_24h_change || 0.01,
            },
          ]);
        }
      } catch {
        // Fallback silently
      }
    }

    loadPrices();
    const interval = setInterval(loadPrices, 90000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-6 border-b border-slate-200 bg-slate-50/70">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="flex items-center justify-between pb-3">
          <div className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-500">
            Digital Asset Market Index
          </div>
          <div className="text-[11px] text-slate-400 font-mono">Live L1 Reference Rates</div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {marketData.map((c) => {
            const isPositive = c.change24h >= 0;
            return (
              <div
                key={c.symbol}
                className="p-3 rounded-lg bg-white border border-slate-200 shadow-sm flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">{c.symbol}</span>
                  <span
                    className={`text-[10px] font-mono flex items-center gap-0.5 font-semibold ${
                      isPositive ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {isPositive ? (
                      <TrendingUp className="h-2.5 w-2.5" />
                    ) : (
                      <TrendingDown className="h-2.5 w-2.5" />
                    )}
                    <span>{isPositive ? `+${c.change24h.toFixed(2)}%` : `${c.change24h.toFixed(2)}%`}</span>
                  </span>
                </div>
                <div className="mt-2 text-sm font-mono font-bold text-slate-900 tabular-nums">
                  ${c.priceUsd.toLocaleString(undefined, { minimumFractionDigits: c.priceUsd < 10 ? 2 : 0 })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

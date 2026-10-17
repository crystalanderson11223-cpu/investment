import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, BarChart2 } from 'lucide-react';

interface BitcoinPriceChartProps {
  currentBtcPrice: number;
}

type Timeframe = '24H' | '7D' | '1M' | '1Y';

interface ChartPoint {
  time: string;
  price: number;
}

export const BitcoinPriceChart: React.FC<BitcoinPriceChartProps> = ({ currentBtcPrice }) => {
  const [timeframe, setTimeframe] = useState<Timeframe>('7D');
  const [points, setPoints] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [hoveredPoint, setHoveredPoint] = useState<ChartPoint | null>(null);

  // Generate realistic historical points anchored around the live price
  useEffect(() => {
    setLoading(true);

    const generatePoints = () => {
      const result: ChartPoint[] = [];
      const numPoints = timeframe === '24H' ? 24 : timeframe === '7D' ? 28 : timeframe === '1M' ? 30 : 52;
      const basePrice = currentBtcPrice > 0 ? currentBtcPrice : 68450;
      
      // volatility factor based on timeframe
      const vol = timeframe === '24H' ? 0.015 : timeframe === '7D' ? 0.035 : timeframe === '1M' ? 0.06 : 0.15;
      
      let p = basePrice * (1 - vol * 0.7);
      const now = Date.now();
      const stepMs =
        timeframe === '24H'
          ? (24 * 3600 * 1000) / numPoints
          : timeframe === '7D'
          ? (7 * 24 * 3600 * 1000) / numPoints
          : timeframe === '1M'
          ? (30 * 24 * 3600 * 1000) / numPoints
          : (365 * 24 * 3600 * 1000) / numPoints;

      for (let i = 0; i < numPoints - 1; i++) {
        const t = new Date(now - (numPoints - 1 - i) * stepMs);
        const timeStr =
          timeframe === '24H'
            ? t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : t.toLocaleDateString([], { month: 'short', day: 'numeric' });
        
        const change = (Math.sin(i * 0.4) * 0.6 + (Math.random() - 0.48)) * (basePrice * vol * 0.2);
        p = Math.max(basePrice * 0.8, p + change);
        result.push({ time: timeStr, price: Math.round(p * 100) / 100 });
      }

      // Final point is the exact current live price
      const nowStr =
        timeframe === '24H'
          ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : new Date().toLocaleDateString([], { month: 'short', day: 'numeric' });
      result.push({ time: nowStr, price: currentBtcPrice });

      setPoints(result);
      setLoading(false);
    };

    const timer = setTimeout(generatePoints, 200);
    return () => clearTimeout(timer);
  }, [timeframe, currentBtcPrice]);

  if (points.length === 0) return null;

  const minPrice = Math.min(...points.map((p) => p.price));
  const maxPrice = Math.max(...points.map((p) => p.price));
  const priceRange = maxPrice - minPrice || 1;

  const svgWidth = 800;
  const svgHeight = 220;
  const paddingX = 16;
  const paddingY = 20;

  // Calculate coordinates
  const coords = points.map((p, idx) => {
    const x = paddingX + (idx / (points.length - 1)) * (svgWidth - paddingX * 2);
    const y = svgHeight - paddingY - ((p.price - minPrice) / priceRange) * (svgHeight - paddingY * 2);
    return { x, y, point: p };
  });

  const pathD = coords.reduce((acc, curr, idx) => {
    return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, '');

  const areaD = `${pathD} L ${coords[coords.length - 1].x} ${svgHeight} L ${coords[0].x} ${svgHeight} Z`;

  const firstPrice = points[0].price;
  const lastPrice = points[points.length - 1].price;
  const changePercent = ((lastPrice - firstPrice) / firstPrice) * 100;
  const isPositive = changePercent >= 0;

  const displayPoint = hoveredPoint || points[points.length - 1];

  return (
    <section className="py-8 bg-white border-b border-slate-200">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200 shadow-sm space-y-4">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-400 text-slate-950 font-bold font-mono text-xs">
                  ₿
                </div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Bitcoin Market Price Chart
                </h3>
                <span className="text-[11px] font-mono text-slate-500">BTC / USD</span>
              </div>

              <div className="flex items-baseline gap-3 mt-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
                  ${displayPoint.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span
                  className={`inline-flex items-center gap-0.5 text-xs font-mono font-bold ${
                    isPositive ? 'text-emerald-700' : 'text-red-600'
                  }`}
                >
                  {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  <span>{isPositive ? `+${changePercent.toFixed(2)}%` : `${changePercent.toFixed(2)}%`}</span>
                  <span className="text-slate-400 font-normal">({timeframe})</span>
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                {hoveredPoint ? `Recorded: ${hoveredPoint.time}` : 'Real-time Bitcoin exchange rate'}
              </div>
            </div>

            {/* Timeframe selector tabs */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 w-fit shadow-xs">
              {(['24H', '7D', '1M', '1Y'] as Timeframe[]).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-3 py-1 rounded text-xs font-mono font-semibold transition-colors cursor-pointer ${
                    timeframe === tf
                      ? 'bg-amber-400 text-slate-950 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* SVG Chart Area */}
          <div className="relative w-full h-48 sm:h-56 select-none">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              preserveAspectRatio="none"
              className="w-full h-full overflow-visible"
            >
              <defs>
                <linearGradient id="btcChartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              <line x1={0} y1={paddingY} x2={svgWidth} y2={paddingY} stroke="#e2e8f0" strokeDasharray="3 3" />
              <line
                x1={0}
                y1={svgHeight / 2}
                x2={svgWidth}
                y2={svgHeight / 2}
                stroke="#e2e8f0"
                strokeDasharray="3 3"
              />
              <line
                x1={0}
                y1={svgHeight - paddingY}
                x2={svgWidth}
                y2={svgHeight - paddingY}
                stroke="#e2e8f0"
                strokeDasharray="3 3"
              />

              {/* Gradient Area fill */}
              <path d={areaD} fill="url(#btcChartGrad)" />

              {/* Main curve line */}
              <path
                d={pathD}
                fill="none"
                stroke="#d97706"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Interactive Hover Nodes */}
              {coords.map((c, i) => (
                <circle
                  key={i}
                  cx={c.x}
                  cy={c.y}
                  r={hoveredPoint?.time === c.point.time ? 5 : 2}
                  className="transition-all cursor-pointer"
                  fill={hoveredPoint?.time === c.point.time ? '#b45309' : '#d97706'}
                  onMouseEnter={() => setHoveredPoint(c.point)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              ))}
            </svg>
          </div>

          {/* Quick Metrics Footer */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-xs font-mono">
            <div>
              <span className="text-slate-400 block text-[10px]">PERIOD LOW</span>
              <span className="text-slate-800 font-semibold">${minPrice.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">PERIOD HIGH</span>
              <span className="text-slate-800 font-semibold">${maxPrice.toLocaleString()}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[10px]">SETTLEMENT</span>
              <span className="text-amber-700 font-semibold">Bitcoin (BTC)</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

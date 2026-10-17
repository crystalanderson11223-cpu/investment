import { InvestmentPackage } from '../types/investment';

export const INVESTMENT_PACKAGES: InvestmentPackage[] = [
  {
    id: 'starter',
    name: 'Starter Liquidity',
    tagline: 'Capital preservation with automated daily compounding',
    minAmount: 250,
    maxAmount: 2500,
    defaultAmount: 1000,
    apyPercent: 7.5,
    termDays: 30,
    payoutFrequency: 'Daily',
    strategy: 'USDC/BTC delta-neutral automated liquidity provisioning',
    riskProfile: 'Capital Preserved',
    highlights: [
      '7.5% Fixed Annualized Return',
      'Daily automated interest credit',
      'Short 30-day liquidity lock',
      'Full principal return at maturity',
      'Zero management or withdrawal fees'
    ],
    isPopular: false,
  },
  {
    id: 'growth',
    name: 'Growth Alpha',
    tagline: 'Balanced risk-adjusted returns for expanding portfolios',
    minAmount: 2500,
    maxAmount: 15000,
    defaultAmount: 5000,
    apyPercent: 12.8,
    termDays: 90,
    payoutFrequency: 'Weekly',
    strategy: 'Cross-exchange statistical arbitrage & funding-rate capture',
    riskProfile: 'Moderate Growth',
    highlights: [
      '12.8% Target Annualized Yield',
      'Weekly automated payouts to your wallet',
      '90-day structured investment horizon',
      'Dedicated portfolio allocation overview',
      '24/7 Priority support channel'
    ],
    isPopular: true,
  },
  {
    id: 'prime',
    name: 'Premier Yield',
    tagline: 'High-conviction quantitative market-making allocation',
    minAmount: 15000,
    maxAmount: 50000,
    defaultAmount: 25000,
    apyPercent: 18.5,
    termDays: 180,
    payoutFrequency: 'Bi-Weekly',
    strategy: 'Algorithmic market-making & institutional DeFi vault staking',
    riskProfile: 'High Alpha',
    highlights: [
      '18.5% High-Yield Annualized Return',
      'Bi-weekly automated yield distribution',
      '180-day strategic wealth building cycle',
      'Direct account manager allocation',
      'Detailed monthly audit & performance reports'
    ],
    isPopular: false,
  },
  {
    id: 'institutional',
    name: 'Institutional Bespoke',
    tagline: 'Custom private treasury desk for high-net-worth investors',
    minAmount: 50000,
    maxAmount: 250000,
    defaultAmount: 75000,
    apyPercent: 24.0,
    termDays: 365,
    payoutFrequency: 'Monthly',
    strategy: 'Dedicated private arbitrage desks and off-market over-the-counter liquidity',
    riskProfile: 'Bespoke Institutional',
    highlights: [
      '24.0% Institutional Preferred Rate',
      'Custom compounding or monthly payout',
      'Overcollateralized reserve protection',
      'Direct private banker & senior desk contact',
      'Comprehensive legal indemnity & SLA agreement'
    ],
    isPopular: false,
  },
];

// Default company Bitcoin receiving address
export const DEFAULT_BTC_ADDRESS = 'bc1q8w7h7e4vupk7j5x9a2mn07w3k4g8u67v9pl0qa';

// Fallback BTC/USD reference price
export const DEFAULT_BTC_PRICE = 68450;

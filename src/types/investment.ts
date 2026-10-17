export interface InvestmentPackage {
  id: 'starter' | 'growth' | 'prime' | 'institutional';
  name: string;
  tagline: string;
  minAmount: number;
  maxAmount: number;
  defaultAmount: number;
  apyPercent: number;
  termDays: number;
  payoutFrequency: 'Daily' | 'Weekly' | 'Bi-Weekly' | 'Monthly';
  strategy: string;
  riskProfile: 'Capital Preserved' | 'Moderate Growth' | 'High Alpha' | 'Bespoke Institutional';
  highlights: string[];
  isPopular?: boolean;
}

export interface PaymentOrder {
  orderId: string;
  packageId: string;
  packageName: string;
  amountUsd: number;
  btcPrice: number;
  amountBtc: string;
  btcAddress: string;
  createdAt: number;
  expiresAt: number;
  status: 'awaiting_payment' | 'detecting' | 'verifying' | 'confirmed';
  txHash?: string;
}

export interface ActiveInvestment {
  id: string;
  packageId: string;
  packageName: string;
  investedUsd: number;
  investedBtc: string;
  apyPercent: number;
  termDays: number;
  startDate: number;
  endDate: number;
  txHash: string;
  status: 'active' | 'completed';
  nextPayoutDate: number;
  accruedEarningsUsd: number;
  btcPriceAtDeposit: number;
}

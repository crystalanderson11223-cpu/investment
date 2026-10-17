import { ActiveInvestment } from '../types/investment';
import { DEFAULT_BTC_PRICE } from '../data/packages';

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatBTC(amount: number): string {
  return amount.toFixed(8);
}

export function generateTxHash(): string {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < 64; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateOrderId(): string {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `AUR-BTC-${rand}`;
}

export async function fetchLiveBtcPrice(): Promise<number> {
  // 1. Try Binance public ticker (high reliability & low latency)
  try {
    const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
    if (res.ok) {
      const data = await res.json();
      const val = parseFloat(data.price);
      if (!isNaN(val) && val > 0) return val;
    }
  } catch {
    // continue to next provider
  }

  // 2. Try CoinGecko
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    if (res.ok) {
      const data = await res.json();
      if (data?.bitcoin?.usd) return data.bitcoin.usd;
    }
  } catch {
    // continue
  }

  // 3. Try CoinCap
  try {
    const res = await fetch('https://api.coincap.io/v2/assets/bitcoin');
    if (res.ok) {
      const data = await res.json();
      const val = parseFloat(data.data.priceUsd);
      if (!isNaN(val) && val > 0) return val;
    }
  } catch {
    // continue
  }

  return DEFAULT_BTC_PRICE;
}

const STORAGE_KEY = 'aurum_active_investments_v1';
const BTC_ADDRESS_KEY = 'aurum_btc_deposit_address';
const DEPOSIT_REQUESTS_KEY = 'aurum_deposit_requests_v1';

export interface LocalDepositRequest {
  id: string;
  orderId: string;
  userId: string;
  userEmail: string;
  packageId: string;
  packageName: string;
  amountUsd: number;
  amountBtc: string;
  txHash: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
}

export function getSavedInvestments(): ActiveInvestment[] {
  try {
    const item = localStorage.getItem(STORAGE_KEY);
    if (!item) return [];
    return JSON.parse(item);
  } catch {
    return [];
  }
}

export function saveInvestment(inv: ActiveInvestment): void {
  const current = getSavedInvestments();
  // Avoid duplicate by ID
  const filtered = current.filter((x) => x.id !== inv.id);
  const updated = [inv, ...filtered];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function getLocalDepositRequests(): LocalDepositRequest[] {
  try {
    const item = localStorage.getItem(DEPOSIT_REQUESTS_KEY);
    if (!item) {
      // Provide an initial sample request so admin has something immediately testable
      const sampleReq: LocalDepositRequest = {
        id: 'REQ-INIT-01',
        orderId: 'AUR-BTC-892410',
        userId: 'usr-client-01',
        userEmail: 'marcus.vance@investor.com',
        packageId: 'growth',
        packageName: 'Growth Alpha',
        amountUsd: 5000,
        amountBtc: '0.05354000',
        txHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        status: 'pending',
        submittedAt: Date.now() - 35 * 60 * 1000,
      };
      localStorage.setItem(DEPOSIT_REQUESTS_KEY, JSON.stringify([sampleReq]));
      return [sampleReq];
    }
    return JSON.parse(item);
  } catch {
    return [];
  }
}

export function saveLocalDepositRequest(req: LocalDepositRequest): void {
  const current = getLocalDepositRequests();
  const filtered = current.filter((r) => r.id !== req.id);
  const updated = [req, ...filtered];
  localStorage.setItem(DEPOSIT_REQUESTS_KEY, JSON.stringify(updated));
}

export function updateLocalDepositRequestStatus(
  id: string,
  status: 'approved' | 'rejected',
  reviewedBy: string = 'admin'
): LocalDepositRequest | null {
  const current = getLocalDepositRequests();
  const req = current.find((r) => r.id === id);
  if (!req) return null;
  req.status = status;
  req.reviewedAt = Date.now();
  req.reviewedBy = reviewedBy;
  localStorage.setItem(DEPOSIT_REQUESTS_KEY, JSON.stringify(current));
  return req;
}

export function getCustomBtcAddress(): string | null {
  try {
    return localStorage.getItem(BTC_ADDRESS_KEY);
  } catch {
    return null;
  }
}

export function saveCustomBtcAddress(addr: string): void {
  try {
    localStorage.setItem(BTC_ADDRESS_KEY, addr);
  } catch {
    // ignore
  }
}

export function clearLocalDepositRequests(): void {
  try {
    localStorage.removeItem(DEPOSIT_REQUESTS_KEY);
  } catch {
    // ignore
  }
}


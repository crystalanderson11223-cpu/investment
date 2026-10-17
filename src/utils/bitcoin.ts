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
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd', {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.bitcoin?.usd) {
        return data.bitcoin.usd;
      }
    }
  } catch {
    // Silently fallback to reference price on network or CORS restrictions
  }
  return DEFAULT_BTC_PRICE;
}

const STORAGE_KEY = 'aurum_active_investments_v1';
const BTC_ADDRESS_KEY = 'aurum_btc_deposit_address';

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
  const updated = [inv, ...current];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
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

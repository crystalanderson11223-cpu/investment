import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { InvestmentPackage, ActiveInvestment } from '../types/investment';
import {
  formatUSD,
  formatBTC,
  generateOrderId,
  generateTxHash,
  saveInvestment,
  getCustomBtcAddress,
} from '../utils/bitcoin';
import { DEFAULT_BTC_ADDRESS } from '../data/packages';
import { X, Copy, Check, Clock, Loader2, CheckCircle2 } from 'lucide-react';

interface BitcoinCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPackage: InvestmentPackage;
  depositAmountUsd: number;
  btcPrice: number;
  onInvestmentSuccess: (investment: ActiveInvestment) => void;
}

export const BitcoinCheckoutModal: React.FC<BitcoinCheckoutModalProps> = ({
  isOpen,
  onClose,
  selectedPackage,
  depositAmountUsd,
  btcPrice,
  onInvestmentSuccess,
}) => {
  // 2-second initial gateway loading screen
  const [isLoadingInvoice, setIsLoadingInvoice] = useState<boolean>(true);
  const [copiedAddress, setCopiedAddress] = useState<boolean>(false);
  const [copiedAmount, setCopiedAmount] = useState<boolean>(false);
  const [orderId] = useState<string>(generateOrderId());
  const [timeLeft, setTimeLeft] = useState<number>(900); // 15:00 minutes
  const [paymentStatus, setPaymentStatus] = useState<'awaiting' | 'verifying' | 'confirmed'>('awaiting');
  const [confirmedInvestment, setConfirmedInvestment] = useState<ActiveInvestment | null>(null);

  const btcAddress = getCustomBtcAddress() || DEFAULT_BTC_ADDRESS;
  const btcAmount = formatBTC(depositAmountUsd / btcPrice);
  const bitcoinUri = `bitcoin:${btcAddress}?amount=${btcAmount}`;

  // 2-second loading screen upon opening
  useEffect(() => {
    if (isOpen) {
      setIsLoadingInvoice(true);
      setPaymentStatus('awaiting');
      const timer = setTimeout(() => {
        setIsLoadingInvoice(false);
      }, 2000); // exactly 2 seconds
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Expiration countdown timer
  useEffect(() => {
    if (!isOpen || isLoadingInvoice || paymentStatus !== 'awaiting') return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, isLoadingInvoice, paymentStatus]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  if (!isOpen) return null;

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(btcAddress);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleCopyAmount = () => {
    navigator.clipboard.writeText(btcAmount);
    setCopiedAmount(true);
    setTimeout(() => setCopiedAmount(false), 2000);
  };

  const handleIHavePaid = () => {
    setPaymentStatus('verifying');

    setTimeout(() => {
      const now = Date.now();
      const end = now + selectedPackage.termDays * 24 * 60 * 60 * 1000;
      const nextPayout =
        now +
        (selectedPackage.payoutFrequency === 'Daily'
          ? 24 * 60 * 60 * 1000
          : 7 * 24 * 60 * 60 * 1000);

      const newInv: ActiveInvestment = {
        id: `INV-${Date.now()}`,
        packageId: selectedPackage.id,
        packageName: selectedPackage.name,
        investedUsd: depositAmountUsd,
        investedBtc: btcAmount,
        apyPercent: selectedPackage.apyPercent,
        termDays: selectedPackage.termDays,
        startDate: now,
        endDate: end,
        txHash: generateTxHash(),
        status: 'active',
        nextPayoutDate: nextPayout,
        accruedEarningsUsd: 0,
        btcPriceAtDeposit: btcPrice,
      };

      saveInvestment(newInv);
      setConfirmedInvestment(newInv);
      setPaymentStatus('confirmed');
      onInvestmentSuccess(newInv);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        {/* 2-SECOND LOADING SCREEN */}
        {isLoadingInvoice ? (
          <div className="p-12 flex flex-col items-center justify-center text-center space-y-4 min-h-[380px]">
            <Loader2 className="h-10 w-10 text-amber-400 animate-spin" />
            <div className="space-y-1">
              <div className="text-base font-semibold text-white">
                Generating Payment Invoice...
              </div>
              <div className="text-xs text-slate-400 font-mono">
                Connecting to Bitcoin gateway & locking rate
              </div>
            </div>
          </div>
        ) : paymentStatus === 'verifying' ? (
          /* VERIFYING PAYMENT STATE */
          <div className="p-12 flex flex-col items-center justify-center text-center space-y-4 min-h-[380px]">
            <Loader2 className="h-10 w-10 text-amber-400 animate-spin" />
            <div className="space-y-1">
              <div className="text-base font-semibold text-white">
                Verifying Bitcoin Transaction...
              </div>
              <div className="text-xs text-slate-400 font-mono">
                Detecting broadcast on Bitcoin network
              </div>
            </div>
          </div>
        ) : paymentStatus === 'confirmed' && confirmedInvestment ? (
          /* PAYMENT CONFIRMED / SUCCESS RECEIPT */
          <div className="p-6 space-y-5">
            <div className="text-center space-y-2 pt-2">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
              <h2 className="text-xl font-bold text-white">Payment Received</h2>
              <p className="text-xs text-slate-400">
                Your investment in <strong className="text-white">{selectedPackage.name}</strong> is now active.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Invoice:</span>
                <span className="text-white">{orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount:</span>
                <span className="text-emerald-400 font-semibold">
                  {formatUSD(depositAmountUsd)} ({btcAmount} BTC)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className="text-emerald-400 font-semibold">Confirmed</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tx Hash:</span>
                <span className="text-slate-300 truncate max-w-[180px]">
                  {confirmedInvestment.txHash.slice(0, 10)}...{confirmedInvestment.txHash.slice(-6)}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          /* PLAIN, CLEAN PAYMENT GATEWAY */
          <div>
            {/* Gateway Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950">
              <div>
                <div className="text-xs font-bold text-white uppercase tracking-wider">
                  Bitcoin Payment
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Invoice #{orderId}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-[11px] font-mono text-slate-300 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                  <Clock className="h-3 w-3 text-amber-400" />
                  <span className="tabular-nums">{formattedTime}</span>
                </div>
                <button
                  onClick={onClose}
                  className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Gateway Body */}
            <div className="p-5 space-y-4">
              {/* Amount Display */}
              <div className="text-center pb-2">
                <div className="text-2xl font-bold font-mono text-white tabular-nums">
                  {btcAmount} BTC
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  ≈ {formatUSD(depositAmountUsd)} USD · {selectedPackage.name}
                </div>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-white text-slate-950 mx-auto w-fit">
                <QRCodeSVG
                  value={bitcoinUri}
                  size={168}
                  level="M"
                  includeMargin={false}
                />
              </div>

              {/* Address Field */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-400">
                  Bitcoin Address:
                </label>
                <div className="flex items-center gap-2 p-2 rounded bg-slate-950 border border-slate-800 font-mono text-xs">
                  <span className="text-white truncate flex-1 select-all">
                    {btcAddress}
                  </span>
                  <button
                    onClick={handleCopyAddress}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 cursor-pointer"
                  >
                    {copiedAddress ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Amount Field with Copy */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-400">
                  Amount:
                </label>
                <div className="flex items-center gap-2 p-2 rounded bg-slate-950 border border-slate-800 font-mono text-xs">
                  <span className="text-amber-400 font-semibold flex-1">
                    {btcAmount} BTC
                  </span>
                  <button
                    onClick={handleCopyAmount}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 cursor-pointer"
                  >
                    {copiedAmount ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Plain instruction */}
              <div className="text-[11px] text-slate-500 text-center font-mono">
                Send only BTC to this address via Bitcoin network.
              </div>

              {/* "I have paid" BUTTON */}
              <button
                onClick={handleIHavePaid}
                className="w-full py-3.5 px-4 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-sm font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-98 min-h-[46px]"
              >
                <span>i have paid</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

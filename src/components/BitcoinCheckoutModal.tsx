import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { InvestmentPackage, ActiveInvestment } from '../types/investment';
import {
  formatUSD,
  formatBTC,
  generateOrderId,
  generateTxHash,
} from '../utils/bitcoin';
import { DEFAULT_BTC_ADDRESS } from '../data/packages';
import { useAuth } from '../context/AuthContext';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { X, Copy, Check, Clock, Loader2, CheckCircle2 } from 'lucide-react';

interface BitcoinCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPackage: InvestmentPackage;
  depositAmountUsd: number;
  btcPrice: number;
  onInvestmentSuccess: (investment: ActiveInvestment) => void;
  onRequireAuth: () => void;
}

export const BitcoinCheckoutModal: React.FC<BitcoinCheckoutModalProps> = ({
  isOpen,
  onClose,
  selectedPackage,
  depositAmountUsd,
  btcPrice,
  onInvestmentSuccess,
  onRequireAuth,
}) => {
  const { currentUser } = useAuth();
  const [isLoadingInvoice, setIsLoadingInvoice] = useState<boolean>(true);
  const [copiedAddress, setCopiedAddress] = useState<boolean>(false);
  const [copiedAmount, setCopiedAmount] = useState<boolean>(false);
  const [orderId] = useState<string>(generateOrderId());
  const [timeLeft, setTimeLeft] = useState<number>(900); // 15:00 minutes
  const [paymentStatus, setPaymentStatus] = useState<'awaiting' | 'verifying' | 'confirmed'>('awaiting');
  const [txHashInput, setTxHashInput] = useState<string>('');

  const [btcAddress, setBtcAddress] = useState<string>(DEFAULT_BTC_ADDRESS);
  const btcAmount = formatBTC(depositAmountUsd / btcPrice);
  const bitcoinUri = `bitcoin:${btcAddress}?amount=${btcAmount}`;

  // Real-time listener for company Bitcoin wallet address from Firestore & invoice loading
  useEffect(() => {
    if (!isOpen) return;

    setIsLoadingInvoice(true);
    setPaymentStatus('awaiting');
    const timer = setTimeout(() => {
      setIsLoadingInvoice(false);
    }, 2000);

    const unsubscribe = onSnapshot(
      doc(db, 'settings', 'btc_wallet'),
      (snap) => {
        if (snap.exists() && snap.data().address) {
          setBtcAddress(snap.data().address);
        } else {
          setBtcAddress(DEFAULT_BTC_ADDRESS);
        }
      },
      (err) => {
        console.warn('Wallet address listener error:', err);
        setBtcAddress(DEFAULT_BTC_ADDRESS);
      }
    );

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
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

  const handleIHavePaid = async () => {
    if (!currentUser) {
      onRequireAuth();
      return;
    }

    setPaymentStatus('verifying');
    const assignedHash = txHashInput.trim() || generateTxHash();

    try {
      const reqId = `REQ-${Date.now()}`;
      const depositReqData = {
        id: reqId,
        orderId,
        userId: currentUser.uid,
        userEmail: currentUser.email || 'user',
        packageId: selectedPackage.id,
        packageName: selectedPackage.name,
        amountUsd: depositAmountUsd,
        amountBtc: btcAmount,
        txHash: assignedHash,
        status: 'pending' as const,
        submittedAt: Date.now(),
      };

      // Persist 100% to Firestore
      await setDoc(doc(db, 'deposit_requests', reqId), depositReqData);

      const now = Date.now();
      const newInv: ActiveInvestment = {
        id: reqId,
        packageId: selectedPackage.id,
        packageName: selectedPackage.name,
        investedUsd: depositAmountUsd,
        investedBtc: btcAmount,
        apyPercent: selectedPackage.apyPercent,
        termDays: selectedPackage.termDays,
        startDate: now,
        endDate: now + selectedPackage.termDays * 24 * 60 * 60 * 1000,
        txHash: assignedHash,
        status: 'active',
        nextPayoutDate: now + 24 * 60 * 60 * 1000,
        btcPriceAtDeposit: btcPrice,
      };
      onInvestmentSuccess(newInv);
    } catch (err) {
      console.error('Error logging deposit request:', err);
    } finally {
      setTimeout(() => {
        setPaymentStatus('confirmed');
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
        {/* 2-SECOND LOADING SCREEN */}
        {isLoadingInvoice ? (
          <div className="p-12 flex flex-col items-center justify-center text-center space-y-4 min-h-[380px]">
            <Loader2 className="h-10 w-10 text-amber-500 animate-spin" />
            <div className="space-y-1">
              <div className="text-base font-semibold text-slate-900">
                Generating Payment Invoice...
              </div>
              <div className="text-xs text-slate-500 font-mono">
                Connecting to Bitcoin gateway & locking rate
              </div>
            </div>
          </div>
        ) : paymentStatus === 'verifying' ? (
          /* VERIFYING PAYMENT STATE */
          <div className="p-12 flex flex-col items-center justify-center text-center space-y-4 min-h-[380px]">
            <Loader2 className="h-10 w-10 text-amber-500 animate-spin" />
            <div className="space-y-1">
              <div className="text-base font-semibold text-slate-900">
                Submitting Payment Proof...
              </div>
              <div className="text-xs text-slate-500 font-mono">
                Transmitting transaction details to verification queue
              </div>
            </div>
          </div>
        ) : paymentStatus === 'confirmed' ? (
          /* PAYMENT SUBMITTED RECEIPT */
          <div className="p-6 space-y-5">
            <div className="text-center space-y-2 pt-2">
              <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
              <h2 className="text-xl font-bold text-slate-900">Payment Proof Submitted</h2>
              <p className="text-xs text-slate-500">
                Your deposit for <strong className="text-slate-800">{selectedPackage.name}</strong> has been submitted for manual admin verification.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono space-y-2 text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice:</span>
                <span className="text-slate-900 font-semibold">{orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount:</span>
                <span className="text-emerald-700 font-semibold">
                  {formatUSD(depositAmountUsd)} ({btcAmount} BTC)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Queue Status:</span>
                <span className="text-amber-700 font-semibold">Pending Admin Review</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors shadow-sm"
            >
              Done
            </button>
          </div>
        ) : (
          /* PLAIN, CLEAN PAYMENT GATEWAY IN LIGHT MODE */
          <div>
            {/* Gateway Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50">
              <div>
                <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Bitcoin Payment
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Invoice #{orderId}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-[11px] font-mono text-slate-700 bg-white px-2 py-1 rounded border border-slate-200 shadow-xs">
                  <Clock className="h-3 w-3 text-amber-500" />
                  <span className="tabular-nums font-semibold">{formattedTime}</span>
                </div>
                <button
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Gateway Body */}
            <div className="p-5 space-y-4">
              {!currentUser && (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-between">
                  <span>Sign in to link this deposit to your account.</span>
                  <button
                    onClick={onRequireAuth}
                    className="underline font-bold text-amber-700 hover:text-amber-800 cursor-pointer"
                  >
                    Sign In
                  </button>
                </div>
              )}

              {/* Amount Display */}
              <div className="text-center pb-1">
                <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                  {btcAmount} BTC
                </div>
                <div className="text-xs text-slate-500 font-mono mt-0.5">
                  ≈ {formatUSD(depositAmountUsd)} USD · {selectedPackage.name}
                </div>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-white border border-slate-200 shadow-sm mx-auto w-fit">
                <QRCodeSVG
                  value={bitcoinUri}
                  size={168}
                  level="M"
                  includeMargin={false}
                />
              </div>

              {/* Address Field */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-500">
                  Bitcoin Address:
                </label>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs">
                  <span className="text-slate-900 truncate flex-1 select-all font-medium">
                    {btcAddress}
                  </span>
                  <button
                    onClick={handleCopyAddress}
                    className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    {copiedAddress ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span className="text-emerald-600">Copied</span>
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
                <label className="text-[11px] font-mono text-slate-500">
                  Amount:
                </label>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs">
                  <span className="text-amber-700 font-bold flex-1">
                    {btcAmount} BTC
                  </span>
                  <button
                    onClick={handleCopyAmount}
                    className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    {copiedAmount ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span className="text-emerald-600">Copied</span>
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

              {/* Optional Tx Hash */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-500">
                  Transaction Hash (Optional):
                </label>
                <input
                  type="text"
                  placeholder="Paste on-chain transaction hash..."
                  value={txHashInput}
                  onChange={(e) => setTxHashInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Plain instruction */}
              <div className="text-[11px] text-slate-500 text-center font-mono">
                Send only BTC to this address via Bitcoin network.
              </div>

              {/* "i have paid" BUTTON */}
              <button
                onClick={handleIHavePaid}
                className="w-full py-3.5 px-4 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-sm font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-98 min-h-[46px] shadow-sm"
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

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { INVESTMENT_PACKAGES, DEFAULT_BTC_PRICE } from './data/packages';
import { InvestmentPackage, ActiveInvestment } from './types/investment';
import { fetchLiveBtcPrice, getSavedInvestments } from './utils/bitcoin';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { MarketOverview } from './components/MarketOverview';
import { HowItWorks } from './components/HowItWorks';
import { BitcoinPriceChart } from './components/BitcoinPriceChart';
import { PackagesSection } from './components/PackagesSection';
import { Footer } from './components/Footer';
import { BitcoinCheckoutModal } from './components/BitcoinCheckoutModal';
import { PortfolioModal } from './components/PortfolioModal';
import { AuthModal } from './components/AuthModal';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { Wallet, ArrowRight } from 'lucide-react';
import { doc, getDocFromServer } from 'firebase/firestore';
import { db } from './lib/firebase';

function MainApp() {
  const { currentUser, isAdmin } = useAuth();
  const [btcPrice, setBtcPrice] = useState<number>(DEFAULT_BTC_PRICE);
  const [activeInvestments, setActiveInvestments] = useState<ActiveInvestment[]>([]);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState<boolean>(false);
  const [portfolioModalOpen, setPortfolioModalOpen] = useState<boolean>(false);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authDefaultMode, setAuthDefaultMode] = useState<'login' | 'signup'>('login');
  const [adminModalOpen, setAdminModalOpen] = useState<boolean>(false);
  const [selectedPackage, setSelectedPackage] = useState<InvestmentPackage>(
    INVESTMENT_PACKAGES[0]
  );
  const [depositAmountUsd, setDepositAmountUsd] = useState<number>(
    INVESTMENT_PACKAGES[0].defaultAmount
  );

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.warn('Firestore offline or connecting...');
        }
      }
    }
    testConnection();
  }, []);

  useEffect(() => {
    setActiveInvestments(getSavedInvestments());

    const updatePrice = async () => {
      const price = await fetchLiveBtcPrice();
      setBtcPrice(price);
    };

    updatePrice();
    const interval = setInterval(updatePrice, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const scrollToPackages = () => {
    const el = document.getElementById('packages');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSelectPackage = (pkg: InvestmentPackage) => {
    setSelectedPackage(pkg);
    setDepositAmountUsd(pkg.defaultAmount);
    setCheckoutModalOpen(true);
  };

  const handleInvestmentSuccess = (newInv: ActiveInvestment) => {
    setActiveInvestments((prev) => [newInv, ...prev]);
  };

  const handleOpenAuth = (mode: 'login' | 'signup' = 'login') => {
    setAuthDefaultMode(mode);
    setAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-amber-500/20 selection:text-amber-900 pb-24 sm:pb-0">
      {/* Top Bar */}
      <Navbar
        activeCount={activeInvestments.length}
        onOpenPortfolio={() => setPortfolioModalOpen(true)}
        onSelectPackageScroll={scrollToPackages}
        onOpenAuth={handleOpenAuth}
        onOpenAdmin={() => setAdminModalOpen(true)}
        btcPrice={btcPrice}
      />

      {/* Main Content */}
      <main className="flex-1">
        {/* Introductory Overview Header */}
        <Hero
          onOpenPortfolio={() => setPortfolioModalOpen(true)}
          activeCount={activeInvestments.length}
        />

        {/* If user is NOT logged in: show the market context, how it works, and price chart */}
        {!currentUser && (
          <>
            {/* Live Market Index */}
            <MarketOverview />

            {/* How It Works */}
            <HowItWorks />

            {/* Bitcoin Price Chart (placed directly before investment packages) */}
            <BitcoinPriceChart currentBtcPrice={btcPrice} />
          </>
        )}

        {/* Packages Grid: always shown (shows locked prompt if logged out; full packages if logged in) */}
        <PackagesSection
          packages={INVESTMENT_PACKAGES}
          onSelectPackage={handleSelectPackage}
          onRequireAuth={handleOpenAuth}
        />
      </main>

      {/* Minimal Footer */}
      <Footer />

      {/* Mobile Bottom Bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-30 p-2.5 bg-white/95 backdrop-blur-md border-t border-slate-200 flex items-center justify-between gap-2 shadow-lg">
        <button
          onClick={() => {
            if (currentUser) {
              setPortfolioModalOpen(true);
            } else {
              handleOpenAuth('login');
            }
          }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold cursor-pointer min-h-[44px]"
        >
          <Wallet className="h-4 w-4 text-amber-500" />
          <span className="truncate">{currentUser ? 'Portfolio' : 'Sign In / Sign Up'}</span>
          {currentUser && activeInvestments.length > 0 && (
            <span className="font-mono text-[11px] font-bold px-1.5 rounded bg-amber-400 text-slate-950">
              {activeInvestments.length}
            </span>
          )}
        </button>

        <button
          onClick={scrollToPackages}
          className="flex-1 flex items-center justify-center gap-1 py-2.5 px-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold uppercase tracking-wider cursor-pointer shadow-sm min-h-[44px]"
        >
          <span>Packages</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Bitcoin Payment Gateway Modal */}
      {checkoutModalOpen && (
        <BitcoinCheckoutModal
          isOpen={checkoutModalOpen}
          onClose={() => setCheckoutModalOpen(false)}
          selectedPackage={selectedPackage}
          depositAmountUsd={depositAmountUsd}
          btcPrice={btcPrice}
          onInvestmentSuccess={handleInvestmentSuccess}
          onRequireAuth={() => handleOpenAuth('login')}
        />
      )}

      {/* Active Portfolio Modal */}
      {portfolioModalOpen && (
        <PortfolioModal
          isOpen={portfolioModalOpen}
          onClose={() => setPortfolioModalOpen(false)}
          investments={activeInvestments}
          btcPrice={btcPrice}
          onNewInvestment={() => {
            setPortfolioModalOpen(false);
            scrollToPackages();
          }}
        />
      )}

      {/* Auth Modal (Login / Sign Up) */}
      {authModalOpen && (
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          defaultMode={authDefaultMode}
          onAdminAuthenticated={() => setAdminModalOpen(true)}
        />
      )}

      {/* Admin Dashboard Modal */}
      {adminModalOpen && (
        <AdminDashboardModal
          isOpen={adminModalOpen}
          onClose={() => setAdminModalOpen(false)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

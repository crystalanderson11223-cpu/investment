/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { INVESTMENT_PACKAGES, DEFAULT_BTC_PRICE } from './data/packages';
import { InvestmentPackage, ActiveInvestment } from './types/investment';
import { fetchLiveBtcPrice, getSavedInvestments } from './utils/bitcoin';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { PackagesSection } from './components/PackagesSection';
import { Footer } from './components/Footer';
import { BitcoinCheckoutModal } from './components/BitcoinCheckoutModal';
import { PortfolioModal } from './components/PortfolioModal';
import { Wallet, ArrowRight } from 'lucide-react';

export default function App() {
  const [btcPrice, setBtcPrice] = useState<number>(DEFAULT_BTC_PRICE);
  const [activeInvestments, setActiveInvestments] = useState<ActiveInvestment[]>([]);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState<boolean>(false);
  const [portfolioModalOpen, setPortfolioModalOpen] = useState<boolean>(false);
  const [selectedPackage, setSelectedPackage] = useState<InvestmentPackage>(
    INVESTMENT_PACKAGES[0]
  );
  const [depositAmountUsd, setDepositAmountUsd] = useState<number>(
    INVESTMENT_PACKAGES[0].defaultAmount
  );

  // Fetch live BTC price and load saved investments
  useEffect(() => {
    setActiveInvestments(getSavedInvestments());

    const updatePrice = async () => {
      const price = await fetchLiveBtcPrice();
      setBtcPrice(price);
    };

    updatePrice();
    const interval = setInterval(updatePrice, 60000);
    return () => clearInterval(interval);
  }, []);

  const scrollToPackages = () => {
    const el = document.getElementById('packages');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Handler when user selects a package
  const handleSelectPackage = (pkg: InvestmentPackage) => {
    setSelectedPackage(pkg);
    setDepositAmountUsd(pkg.defaultAmount);
    setCheckoutModalOpen(true);
  };

  // Handler when an investment completes
  const handleInvestmentSuccess = (newInv: ActiveInvestment) => {
    setActiveInvestments((prev) => [newInv, ...prev]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500/20 selection:text-amber-200 pb-16 sm:pb-0">
      {/* Top Bar */}
      <Navbar
        activeCount={activeInvestments.length}
        onOpenPortfolio={() => setPortfolioModalOpen(true)}
        onSelectPackageScroll={scrollToPackages}
        btcPrice={btcPrice}
      />

      {/* Main Content */}
      <main className="flex-1">
        {/* Simple Page Header */}
        <Hero
          onOpenPortfolio={() => setPortfolioModalOpen(true)}
          activeCount={activeInvestments.length}
        />

        {/* Plain Packages Grid */}
        <PackagesSection
          packages={INVESTMENT_PACKAGES}
          onSelectPackage={handleSelectPackage}
        />
      </main>

      {/* Minimal Footer */}
      <Footer />

      {/* Mobile Bottom Quick Bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-30 p-2.5 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-between gap-2.5">
        <button
          onClick={() => setPortfolioModalOpen(true)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs font-semibold cursor-pointer min-h-[44px]"
        >
          <Wallet className="h-4 w-4 text-amber-400" />
          <span>My Investments</span>
          {activeInvestments.length > 0 && (
            <span className="font-mono text-[11px] font-bold px-1.5 rounded bg-amber-400 text-slate-950">
              {activeInvestments.length}
            </span>
          )}
        </button>

        <button
          onClick={scrollToPackages}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold uppercase tracking-wider cursor-pointer min-h-[44px]"
        >
          <span>Choose Package</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Bitcoin Payment Gateway Modal (Simulated Payment Gateway with 2s loading screen) */}
      {checkoutModalOpen && (
        <BitcoinCheckoutModal
          isOpen={checkoutModalOpen}
          onClose={() => setCheckoutModalOpen(false)}
          selectedPackage={selectedPackage}
          depositAmountUsd={depositAmountUsd}
          btcPrice={btcPrice}
          onInvestmentSuccess={handleInvestmentSuccess}
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
    </div>
  );
}

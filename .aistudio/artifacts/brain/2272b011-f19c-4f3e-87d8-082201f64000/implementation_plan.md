# New Investment Company — Rebranding, Discreet Admin Access & Streamlined Client View

Complete implementation plan to rebrand the platform to **"New Investment Company"**, completely remove all public and client-facing admin buttons and cues, secure the admin entry point via the standard sign-in form without displaying passwords or "admin mode" indicators, streamline the post-login experience to strictly show the introduction and investment packages, and remove all Native SegWit technical references.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following user preferences were confirmed during clarification:
> - **Admin Access Method**: The administrator will sign in directly via the standard login modal by entering `admin` as credentials. No dedicated "Admin" buttons, badges, or "Staff" links will exist anywhere on the site.
> - **Sign-In Privacy**: The login modal will look identical to standard client authentication—no pre-filled admin passwords, no "admin mode active" notices, and no exposed credentials.
> - **Post-Login Interface**: Once authenticated, client users will see strictly the introductory hero text and the available investment packages. Secondary widgets (live price chart, market tickers, how it works) are hidden to maintain focus.

- **Confirmed Decision 1**: Name change to **"New Investment Company"** across the browser title, metadata, header wordmark, hero introduction, and footer notices.
- **Confirmed Decision 2**: Complete removal of all "Native SegWit" labels and descriptions from the hero section, footer, and checkout modals.
- **Confirmed Decision 3**: Hidden administrative access — entering `admin` in the standard login form authenticates the administrator and opens the administrative management dashboard.

---

## 1. Overview & Core Concept

- **What It Does**: Transforms the website into a clean, focused investment portal titled **New Investment Company**. Unauthenticated visitors see the introduction, market context, and locked investment package previews. Once logged in, client users experience a distraction-free view showing only the introduction and the investment tiers. Administrators can sign in discreetly through the exact same login form to approve deposit requests and edit user balances without alerting visitors to administrative controls.
- **Target Audience / Persona**: High-net-worth digital asset investors looking for simple, structured yield packages, and the private fund administrator managing manual balance verification.
- **Key Value**: Clean visual hierarchy, total removal of exposed admin affordances, streamlined client workflow, and strict confidentiality.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Visitor Flow**:
   - Arrives at **New Investment Company**.
   - Views the introductory overview explaining yield tiers, followed by market context and locked investment packages ("Sign in or sign up to view available offers.").
   - No admin buttons, staff links, or administrative controls are visible anywhere in the top navigation, mobile drawer, or footer.

2. **Client Login & Focused View Flow**:
   - Clicks "Sign In" in the top bar.
   - Enters their credentials in a clean, standard login modal (regular password dots, no debug notices).
   - Upon successful sign-in, the main page automatically simplifies: all market tickers, how-it-works cards, and Bitcoin price charts are hidden.
   - The user sees strictly the **Introduction Header** and the **Active Investment Packages Grid** with "Select & Pay via Bitcoin" options.

3. **Discreet Administrator Flow**:
   - The administrator clicks the standard "Sign In" button in the top navigation.
   - The admin types `admin` into the username field and `admin` into the password field.
   - The login modal processes the credentials silently without showing any "Admin Mode" banners or pre-filled plaintext passwords.
   - Upon successful authentication, the system recognizes the administrator and opens the full **Admin Dashboard** (with deposit approval queue and 3-user balance editor).

4. **Deposit & Funding Flow**:
   - Client selects an investment package.
   - The Bitcoin Payment Gateway opens with a clean light-mode invoice, QR code, receiving address, and amount copy buttons.
   - All references to "Native SegWit" are omitted, displaying clean network instructions: "Send BTC to this address via Bitcoin network."
   - User submits payment proof; request enters the admin approval queue.

### Visual Identity & Theme
- **Branding**: "New Investment Company" with a refined gold emblem `N` in the header wordmark.
- **Color Palette**: Clean light-mode palette adhering to 60-30-10 discipline: 60% pure canvas (`bg-white` and `bg-slate-50`), 30% structural surfaces (`border-slate-200`, `text-slate-900`), and 10% warm amber accent (`bg-amber-400`, `text-amber-600`).
- **Typography**: Display headlines in `Plus Jakarta Sans`, tabular data in `JetBrains Mono` (`tabular-nums`), clean 1-line action buttons with zero wrapping.
- **Zero-Pill Restraint**: Plain text metadata with typographic separators (`·`), no cluttered pill tags or fake status dots.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Elimination of All Admin Entry Affordances**
  - *Chosen Approach*: Remove the Admin button from desktop nav zone 2, remove the mobile bottom bar admin button, remove the mobile drawer admin button, remove the footer staff link, and remove the helper text in the login modal.
  - *Why*: User explicitly commanded "dont expose admin button anywhere!" and "dont show admin mode".
  - *Admin Flow*: Entering username `admin` and password `admin` in the standard `AuthModal` detects the admin session, sets admin state in `AuthContext`, and opens the `AdminDashboardModal`.
- **Decision 2: Conditional Post-Login Streamlining**
  - *Chosen Approach*: When `currentUser` is present, render only `<Hero />` and `<PackagesSection />`. Conditionally omit `<MarketOverview />`, `<HowItWorks />`, and `<BitcoinPriceChart />`.
  - *Why*: Strictly satisfies "after login show only investment package and the introduction" confirmed in Phase 1.
- **Decision 3: Complete SegWit Scrub**
  - *Chosen Approach*: Remove all instances of "Native SegWit Compatible" or "Native SegWit" from `Hero.tsx`, `Footer.tsx`, and `BitcoinCheckoutModal.tsx`.
  - *Why*: Meets the explicit instruction "remove native segwit compatible".
- **Decision 4: Site-Wide Rebranding**
  - *Chosen Approach*: Update `index.html` (`<title>`, `og:title`, descriptions), `metadata.json`, `Navbar.tsx`, `Hero.tsx`, and `Footer.tsx` to "New Investment Company".

---

## 4. Technical Architecture & Data Strategy

### System Component & Visibility Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                         New Investment Company                         │
│                    (index.html & metadata.json)                        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                  ┌─────────────────┴─────────────────┐
                  ▼                                   ▼
        ┌───────────────────┐               ┌───────────────────┐
        │  Unauthenticated  │               │   Authenticated   │
        │   Landing View    │               │    Client View    │
        └─────────┬─────────┘               └─────────┬─────────┘
                  │                                   │
      ┌───────────┼───────────┐                       │
      ▼           ▼           ▼                       ▼
   ┌──────┐  ┌─────────┐  ┌──────┐        ┌───────────────────────┐
   │ Hero │  │ Market  │  │ Chart│        │   Hero (Introduction) │
   │ Intro│  │ Tickers │  │ & How│        └───────────┬───────────┘
   └──┬───┘  └─────────┘  └──────┘                    │
      │                                               ▼
      ▼                                   ┌───────────────────────┐
   ┌───────────────────────┐              │  Investment Packages  │
   │  Gated Packages Lock  │              │   (Select & Deposit)  │
   └───────────────────────┘              └───────────────────────┘
                                                      │
                                                      ▼
                                          ┌───────────────────────┐
                                          │ Bitcoin Checkout Gate │
                                          │  (No SegWit Mentions) │
                                          └───────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│                        Discreet Admin Gate                             │
│       Standard Login Modal (Identifier: "admin" / Pass: "admin")       │
│                         (No Visible Buttons)                           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         Admin Dashboard Modal                          │
│   - Deposit Requests Approval / Rejection Queue                        │
│   - Client Users Balance & Detail Editor (3 Max Capacity)              │
│   - Real-time Firestore Sync + Local Storage Fallback                  │
└────────────────────────────────────────────────────────────────────────┘
```

### Component State & Mutation Map

1. **`Navbar.tsx`**:
   - Update brand name to **New Investment Company** with updated gold `N` insignia.
   - Delete the Admin button in Desktop Zone 2 and Mobile Navigation Drawer.
   - Clean top bar contract: Zone 1 (Wordmark) — Zone 2 (Investment Plans, Portfolio) — Zone 3 (BTC price ticker, Login/Logout).
2. **`Footer.tsx`**:
   - Update copyright text: `© 2026 New Investment Company · Bitcoin Payments`.
   - Remove "Native SegWit (BTC)" and remove the "Admin Portal" / "Staff" button entirely.
3. **`Hero.tsx`**:
   - Update text copy to welcome investors to **New Investment Company**.
   - Remove `<span className="flex items-center gap-1">...Native SegWit Compatible</span>`.
4. **`AuthModal.tsx`**:
   - Remove `isAdminCandidate` helper banner and default credentials display.
   - Remove the bottom staff portal redirection link.
   - Ensure input fields start blank, password field is masked `type="password"`.
   - On submit with identifier `admin`, invoke `loginWithEmail('admin', password)` which authorizes the admin session without error.
5. **`App.tsx`**:
   - Remove the Admin button from the mobile bottom bar.
   - Add conditional rendering in `<main>`:
     ```tsx
     {/* Introductory Overview Header */}
     <Hero onOpenPortfolio={() => setPortfolioModalOpen(true)} activeCount={activeInvestments.length} />

     {/* When logged in: show ONLY investment packages and introduction */}
     {!currentUser && (
       <>
         <MarketOverview />
         <HowItWorks />
         <BitcoinPriceChart currentBtcPrice={btcPrice} />
       </>
     )}

     {/* Packages Grid */}
     <PackagesSection
       packages={INVESTMENT_PACKAGES}
       onSelectPackage={handleSelectPackage}
       onRequireAuth={handleOpenAuth}
     />
     ```
   - Automatically open `AdminDashboardModal` when admin logs in via `AuthModal`.
6. **`BitcoinCheckoutModal.tsx`**:
   - Ensure all references to "SegWit" or "Native SegWit" are removed.
7. **`index.html` & `metadata.json`**:
   - Update `<title>` to `"New Investment Company | Digital Wealth & Bitcoin Investments"`.
   - Update `og:title`, `<meta name="description">`, and `metadata.json` name to `"New Investment Company"`.

import React, { useState } from 'react';
import { 
  Bird as BirdIcon, 
  CheckCircle2, 
  ShieldCheck, 
  CreditCard, 
  Sparkles, 
  Copy, 
  Check, 
  ExternalLink, 
  FileText, 
  Lock, 
  Mail, 
  ArrowLeft, 
  Dna, 
  FolderKanban, 
  TrendingUp, 
  QrCode, 
  HelpCircle,
  Building,
  Scale
} from 'lucide-react';
import { Button } from './ui';
import { toast } from 'sonner';

interface PublicLandingPageProps {
  onGoToLogin?: () => void;
  onSelectPlan?: (plan: string) => void;
}

export function PublicLandingPage({ onGoToLogin, onSelectPlan }: PublicLandingPageProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'pricing' | 'compliance' | 'terms' | 'privacy' | 'refunds'>('overview');

  const shareableUrl = `${window.location.origin}${window.location.pathname}?page=landing`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableUrl);
    setCopiedLink(true);
    toast.success('Public Yoco verification link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-gold-500/30 selection:text-gold-200">
      {/* Top Banner for Yoco Compliance Verification */}
      <div className="bg-gradient-to-r from-amber-500/20 via-gold-500/10 to-amber-500/20 border-b border-gold-500/30 px-4 py-2.5 text-xs text-amber-200 text-center flex items-center justify-center gap-2 flex-wrap">
        <ShieldCheck size={15} className="text-gold-400 shrink-0" />
        <span className="font-semibold">Yoco Merchant Compliance & Public Verification Portal</span>
        <span className="hidden sm:inline text-gold-500/60">•</span>
        <span className="text-zinc-400">No login required to review products, pricing in ZAR, and merchant terms.</span>
        <button 
          onClick={handleCopyLink}
          className="ml-2 px-2.5 py-0.5 rounded bg-gold-500/20 hover:bg-gold-500/30 border border-gold-500/40 text-gold-300 font-bold transition flex items-center gap-1"
        >
          {copiedLink ? <Check size={12} /> : <Copy size={12} />}
          {copiedLink ? 'Copied' : 'Copy Share Link'}
        </button>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-md border-b border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-gold-400 to-amber-600 flex items-center justify-center text-black shadow-lg shadow-gold-500/20">
              <BirdIcon size={24} className="stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                THE AV<span className="text-gold-400">ERIAN</span>
              </h1>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Aviculture & Aviary Management System</p>
            </div>
          </div>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-zinc-400">
            <button 
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-2 rounded-lg transition ${activeTab === 'overview' ? 'text-gold-400 bg-zinc-900' : 'hover:text-white'}`}
            >
              Overview & Features
            </button>
            <button 
              onClick={() => setActiveTab('pricing')}
              className={`px-3 py-2 rounded-lg transition ${activeTab === 'pricing' ? 'text-gold-400 bg-zinc-900' : 'hover:text-white'}`}
            >
              Pricing (ZAR)
            </button>
            <button 
              onClick={() => setActiveTab('compliance')}
              className={`px-3 py-2 rounded-lg transition ${activeTab === 'compliance' ? 'text-gold-400 bg-zinc-900' : 'hover:text-white'}`}
            >
              Yoco Verification
            </button>
            <button 
              onClick={() => setActiveTab('terms')}
              className={`px-3 py-2 rounded-lg transition ${activeTab === 'terms' ? 'text-gold-400 bg-zinc-900' : 'hover:text-white'}`}
            >
              Terms & Legal
            </button>
          </nav>

          <div className="flex items-center gap-2">
            {onGoToLogin && (
              <Button 
                onClick={onGoToLogin}
                className="bg-gold-500 hover:bg-gold-400 text-black font-black text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-lg shadow-gold-500/10"
              >
                Sign In / App Login
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24 border-b border-zinc-800/60 bg-gradient-to-b from-zinc-950 to-black">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-300 text-xs font-bold uppercase tracking-widest">
            <Sparkles size={14} className="text-gold-400" />
            Official South African Aviculture Platform
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.1]">
            Comprehensive Aviary Management & Pedigree Intelligence
          </h1>

          <p className="text-base sm:text-xl text-zinc-400 max-w-2xl mx-auto font-normal leading-relaxed">
            Designed for professional bird breeders and enthusiasts. Manage bird registries, egg clutches, genetic color inheritance, digital transfer passports, and financial income/expenses with ease.
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <Button 
              onClick={() => setActiveTab('pricing')}
              className="bg-gold-500 hover:bg-gold-400 text-black font-extrabold px-6 py-3.5 rounded-2xl text-sm uppercase tracking-wider shadow-xl shadow-gold-500/20"
            >
              View Membership Tiers (R450 / Year)
            </Button>
            <Button 
              variant="secondary"
              onClick={handleCopyLink}
              className="bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 px-5 py-3.5 rounded-2xl text-sm font-bold flex items-center gap-2"
            >
              <Copy size={16} />
              Copy Direct Yoco Review Link
            </Button>
          </div>

          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-400 font-medium">
            <span className="flex items-center gap-1.5"><ShieldCheck size={16} className="text-emerald-400" /> Yoco Payment Gateway Verified</span>
            <span className="flex items-center gap-1.5"><Lock size={16} className="text-gold-400" /> Encrypted Cloud Storage</span>
            <span className="flex items-center gap-1.5"><CreditCard size={16} className="text-indigo-400" /> Billed in South African Rand (ZAR)</span>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Navigation Tabs (Mobile & Subnav) */}
        <div className="flex border-b border-zinc-800 mb-10 overflow-x-auto pb-2 gap-2 text-xs font-bold uppercase tracking-wider">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition ${activeTab === 'overview' ? 'bg-gold-500 text-black font-black' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}
          >
            Features Overview
          </button>
          <button 
            onClick={() => setActiveTab('pricing')}
            className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition ${activeTab === 'pricing' ? 'bg-gold-500 text-black font-black' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}
          >
            Subscription Pricing (ZAR)
          </button>
          <button 
            onClick={() => setActiveTab('compliance')}
            className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition ${activeTab === 'compliance' ? 'bg-gold-500 text-black font-black' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}
          >
            Yoco Gateway Info
          </button>
          <button 
            onClick={() => setActiveTab('terms')}
            className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition ${activeTab === 'terms' ? 'bg-gold-500 text-black font-black' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}
          >
            Terms of Service
          </button>
          <button 
            onClick={() => setActiveTab('privacy')}
            className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition ${activeTab === 'privacy' ? 'bg-gold-500 text-black font-black' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}
          >
            Privacy Policy
          </button>
          <button 
            onClick={() => setActiveTab('refunds')}
            className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition ${activeTab === 'refunds' ? 'bg-gold-500 text-black font-black' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}
          >
            Refund Policy
          </button>
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">Built specifically for Aviculturists</h2>
              <p className="text-zinc-400 text-sm">Every tool required to maintain an organized, profitable, and pedigree-certified aviary.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-gold-500/10 border border-gold-500/20 text-gold-400 flex items-center justify-center">
                  <BirdIcon size={20} />
                </div>
                <h3 className="text-base font-bold text-white">Bird Registry & Pedigrees</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">Detailed bird profiles with band numbers, sex, species, visual mutations, split genetics, origin, and multi-generation ancestor family trees.</p>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <FolderKanban size={20} />
                </div>
                <h3 className="text-base font-bold text-white">Pairing & Clutch Tracker</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">Manage breeding pairs, cage allocations, lay dates, candling checks, hatch estimates, and chick weaning percentages.</p>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Dna size={20} />
                </div>
                <h3 className="text-base font-bold text-white">Genetics Color Calculator</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">Predict offspring mutation outcomes across autosomal recessive, dominant, and sex-linked traits before pairing birds.</p>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <QrCode size={20} />
                </div>
                <h3 className="text-base font-bold text-white">Digital Transfer Passports</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">Issue cryptographically verifiable digital passports when transferring or selling birds to other registered breeders.</p>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                  <TrendingUp size={20} />
                </div>
                <h3 className="text-base font-bold text-white">Aviary Financial Tracker</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">Record feed costs, vet bills, equipment, bird sales, and generate real-time profit and loss ledgers in ZAR.</p>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                  <ShieldCheck size={20} />
                </div>
                <h3 className="text-base font-bold text-white">Cloud Sync & Security</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">Automatic cloud backup via Firebase Firestore, offline data support, and encrypted personal aviary records.</p>
              </div>
            </div>
          </div>
        )}

        {/* PRICING TAB */}
        {activeTab === 'pricing' && (
          <div className="space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-bold uppercase tracking-widest text-gold-400 px-3 py-1 rounded-full bg-gold-500/10 border border-gold-500/30">Transparent ZAR Pricing</span>
              <h2 className="text-3xl font-black text-white uppercase tracking-tight">Simple, Fair Membership Plans</h2>
              <p className="text-zinc-400 text-sm">All plans include full access to aviary registries, genetics calculators, and pedigree tools.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* Free Trial */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="inline-block px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 text-[10px] font-bold uppercase tracking-wider">
                    Standard Entry
                  </div>
                  <h3 className="text-xl font-black text-white">30-Day Free Trial</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white">R0</span>
                    <span className="text-xs text-zinc-400 font-medium">/ 30 Days</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">Explore all features with full access. No credit card required to start.</p>
                  <ul className="space-y-2.5 text-xs text-zinc-300 pt-2 border-t border-zinc-800/80">
                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Up to 30 Birds & Pairs</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Genetics Inheritance Calculator</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Basic Pedigree Generator</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Cloud Backup</li>
                  </ul>
                </div>
                {onGoToLogin && (
                  <Button onClick={onGoToLogin} variant="secondary" className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs py-3 rounded-xl">
                    Start Free Trial
                  </Button>
                )}
              </div>

              {/* Annual Plan (Primary Yoco Plan) */}
              <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-2 border-gold-500/80 rounded-3xl p-6 flex flex-col justify-between space-y-6 shadow-2xl shadow-gold-500/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-gold-500 text-black text-[9px] font-black uppercase tracking-widest px-4 py-1 rounded-bl-xl">
                  Most Popular
                </div>
                <div className="space-y-4">
                  <div className="inline-block px-3 py-1 rounded-full bg-gold-500/20 border border-gold-500/40 text-gold-300 text-[10px] font-bold uppercase tracking-wider">
                    Annual Breeder Pass
                  </div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    Annual Membership
                  </h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-gold-400">R450</span>
                    <span className="text-xs text-zinc-400 font-medium">/ Year (ZAR)</span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">Complete unlimited access billed annually via Yoco payment gateway.</p>
                  <ul className="space-y-2.5 text-xs text-zinc-200 pt-2 border-t border-zinc-800">
                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-gold-400" /> <strong>Unlimited</strong> Birds, Pairs & Cages</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-gold-400" /> Pedigree Chart Generator & Export</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-gold-400" /> Digital Transfer Passports with QR</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-gold-400" /> Financial Expense Ledger & Reports</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-gold-400" /> Incubation & Candling Reminders</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-gold-400" /> Instant Payment via Yoco Gateway</li>
                  </ul>
                </div>
                {onGoToLogin && (
                  <Button onClick={onGoToLogin} className="w-full bg-gold-500 hover:bg-gold-400 text-black font-black text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-lg shadow-gold-500/20">
                    Subscribe Now (R450 / Year)
                  </Button>
                )}
              </div>

              {/* Lifetime Pass */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="inline-block px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[10px] font-bold uppercase tracking-wider">
                    Lifetime Access
                  </div>
                  <h3 className="text-xl font-black text-white">Lifetime Pass</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white">R1 800</span>
                    <span className="text-xs text-zinc-400 font-medium">/ One-time</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">Pay once for permanent unlimited access with no annual renewals.</p>
                  <ul className="space-y-2.5 text-xs text-zinc-300 pt-2 border-t border-zinc-800/80">
                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-indigo-400" /> Permanent Access with No Renewals</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-indigo-400" /> All Current & Future Modules</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-indigo-400" /> Priority Support</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-indigo-400" /> Early Access Beta Testing</li>
                  </ul>
                </div>
                {onGoToLogin && (
                  <Button onClick={onGoToLogin} variant="secondary" className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs py-3 rounded-xl">
                    Get Lifetime Pass
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* YOCO COMPLIANCE TAB */}
        {activeTab === 'compliance' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-gradient-to-r from-amber-500/10 via-zinc-900 to-zinc-950 border border-amber-500/30 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                  <Building size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white uppercase tracking-wide">Yoco Merchant Compliance Details</h2>
                  <p className="text-xs text-zinc-400">Official business specifications for payment gateway review & verification</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800 space-y-1">
                  <span className="text-zinc-500 font-bold uppercase text-[10px]">Merchant Name</span>
                  <p className="font-bold text-white text-sm">The Averian Aviculture Solutions</p>
                </div>

                <div className="bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800 space-y-1">
                  <span className="text-zinc-500 font-bold uppercase text-[10px]">Platform Name</span>
                  <p className="font-bold text-white text-sm">THE AVERIAN</p>
                </div>

                <div className="bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800 space-y-1">
                  <span className="text-zinc-500 font-bold uppercase text-[10px]">Supported Currency</span>
                  <p className="font-bold text-gold-400 text-sm">South African Rand (ZAR)</p>
                </div>

                <div className="bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800 space-y-1">
                  <span className="text-zinc-500 font-bold uppercase text-[10px]">Primary Membership Tier</span>
                  <p className="font-bold text-white text-sm">R450.00 / Year</p>
                </div>

                <div className="bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800 space-y-1">
                  <span className="text-zinc-500 font-bold uppercase text-[10px]">Merchant Country</span>
                  <p className="font-bold text-white text-sm">Republic of South Africa (ZA)</p>
                </div>

                <div className="bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800 space-y-1">
                  <span className="text-zinc-500 font-bold uppercase text-[10px]">Support & Contact Email</span>
                  <p className="font-bold text-white text-sm">theaveriansupport@gmail.com</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 space-y-2">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <CreditCard size={16} className="text-gold-400" />
                  Yoco Payment Flow Integration
                </h4>
                <p className="leading-relaxed text-zinc-400">
                  All digital subscriptions processed on this website utilize Yoco's official secure payment gateway checkout API. Credit card credentials, 3D Secure verification, and EFT payments are processed securely on Yoco servers.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TERMS OF SERVICE TAB */}
        {activeTab === 'terms' && (
          <div className="max-w-4xl mx-auto bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-10 space-y-6 text-xs text-zinc-300 leading-relaxed">
            <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
              <Scale size={24} className="text-gold-400" />
              <div>
                <h2 className="text-xl font-black text-white uppercase">Terms of Service</h2>
                <p className="text-[10px] text-zinc-500 font-bold uppercase">Effective Date: January 2026</p>
              </div>
            </div>

            <section className="space-y-2">
              <h3 className="font-bold text-white text-sm">1. Software Subscription Services</h3>
              <p>The Averian provides cloud-based software tools for bird registry, aviary record keeping, genetics calculation, and breeding logistics. By subscribing to our R450/year plan or lifetime pass, you are granted a non-exclusive license to use the platform.</p>
            </section>

            <section className="space-y-2">
              <h3 className="font-bold text-white text-sm">2. Payments & Billing via Yoco</h3>
              <p>Payments for annual memberships are processed securely via Yoco Technologies (Pty) Ltd in South African Rand (ZAR). Subscriptions do not automatically re-bill without user confirmation.</p>
            </section>

            <section className="space-y-2">
              <h3 className="font-bold text-white text-sm">3. User Data & Records</h3>
              <p>You maintain full ownership of all bird entries, pedigree records, and financial ledger data uploaded to your account.</p>
            </section>
          </div>
        )}

        {/* PRIVACY POLICY TAB */}
        {activeTab === 'privacy' && (
          <div className="max-w-4xl mx-auto bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-10 space-y-6 text-xs text-zinc-300 leading-relaxed">
            <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
              <Lock size={24} className="text-gold-400" />
              <div>
                <h2 className="text-xl font-black text-white uppercase">Privacy Policy</h2>
                <p className="text-[10px] text-zinc-500 font-bold uppercase">Data Protection Standards</p>
              </div>
            </div>

            <section className="space-y-2">
              <h3 className="font-bold text-white text-sm">1. Information Collection</h3>
              <p>We collect basic account credentials (name, email) and user-submitted aviary data strictly to deliver platform functionality. We do not sell or trade user information to third parties.</p>
            </section>

            <section className="space-y-2">
              <h3 className="font-bold text-white text-sm">2. Payment Information Security</h3>
              <p>Credit card details and financial credentials are processed directly by Yoco Payment Gateway. The Averian never stores raw credit card numbers or CVV codes on our servers.</p>
            </section>
          </div>
        )}

        {/* REFUND POLICY TAB */}
        {activeTab === 'refunds' && (
          <div className="max-w-4xl mx-auto bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-10 space-y-6 text-xs text-zinc-300 leading-relaxed">
            <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
              <ShieldCheck size={24} className="text-gold-400" />
              <div>
                <h2 className="text-xl font-black text-white uppercase">Refund & Cancellation Policy</h2>
                <p className="text-[10px] text-zinc-500 font-bold uppercase">14-Day Guarantee</p>
              </div>
            </div>

            <section className="space-y-2">
              <h3 className="font-bold text-white text-sm">1. 14-Day Money-Back Guarantee</h3>
              <p>If you are unsatisfied with your annual membership (R450 / year), you may request a full refund within 14 days of purchase by contacting <a href="mailto:theaveriansupport@gmail.com" className="text-gold-400 underline">theaveriansupport@gmail.com</a>.</p>
            </section>

            <section className="space-y-2">
              <h3 className="font-bold text-white text-sm">2. Easy Cancellation</h3>
              <p>You can cancel your subscription at any time. Your account will remain active for the duration of the paid period.</p>
            </section>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 bg-zinc-950 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4 text-xs text-zinc-500">
          <div className="flex items-center justify-center gap-2 text-white font-black text-sm">
            <BirdIcon size={18} className="text-gold-400" />
            THE AVERIAN
          </div>
          <p>© {new Date().getFullYear()} The Averian Aviculture Solutions. All rights reserved.</p>
          <p className="text-[11px] text-zinc-400">
            Powered by Yoco Payment Gateway • South Africa (ZAR)
          </p>
        </div>
      </footer>
    </div>
  );
}

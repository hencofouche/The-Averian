import React from 'react';
import { Bird as BirdIcon, Shield, Cloud, QrCode, Share2, Calendar, FileText, ArrowLeft, CheckCircle2, Dna, Store, BookOpen } from 'lucide-react';
import { Button } from './ui';

export function PublicLanding({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-gold-500/30 selection:text-gold-200">
      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 w-8 h-8 flex items-center justify-center bg-secondary rounded-lg text-black-950 shadow-lg shadow-secondary/20">
              <BirdIcon size={18} />
            </div>
            <span className="font-black text-xl tracking-tighter text-white">THE AV<span className="text-secondary">ERIAN</span></span>
          </div>
          <Button variant="outline" onClick={onBack} className="text-sm font-medium hover:bg-white/5 hover:text-white transition-colors">
            <ArrowLeft size={16} className="mr-2" />
            Back to Login
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="pt-24 pb-16 sm:pt-32 sm:pb-24 lg:pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white mb-6">
            The Ultimate <span className="text-secondary block sm:inline">Aviculture Management</span> Platform
          </h1>
          <p className="mt-4 max-w-2xl text-lg sm:text-xl text-black-50 mx-auto font-medium">
            The Averian is a comprehensive software solution designed for professional aviculturists, breeders, and hobbyists. We provide powerful tools to track genetics, manage breeding records, and maintain detailed aviary health logs.
          </p>
        </div>

        {/* Features Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20 sm:mt-24">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 lg:p-8 transition-all hover:bg-zinc-900/80 hover:border-secondary/30">
              <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary mb-6">
                <FileText size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Comprehensive Records</h3>
              <p className="text-black-50 leading-relaxed">
                Maintain detailed profiles for every bird in your collection, including species, mutations, hatch dates, medical history, and complete pedigree tracking.
              </p>
            </div>

            <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 lg:p-8 transition-all hover:bg-zinc-900/80 hover:border-secondary/30">
              <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary mb-6">
                <Calendar size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Breeding Management</h3>
              <p className="text-black-50 leading-relaxed">
                Track breeding pairs, clutches, and incubation periods with precision. Get automated reminders for candling and expected hatch dates.
              </p>
            </div>

            <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 lg:p-8 transition-all hover:bg-zinc-900/80 hover:border-secondary/30">
              <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary mb-6">
                <Cloud size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Secure Cloud Sync</h3>
              <p className="text-black-50 leading-relaxed">
                Your data is securely synchronized across all your devices. Enjoy a seamless experience whether you are in the aviary on your phone or at your desk.
              </p>
            </div>

            <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 lg:p-8 transition-all hover:bg-zinc-900/80 hover:border-secondary/30">
              <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary mb-6">
                <QrCode size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Smart QR Scanning</h3>
              <p className="text-black-50 leading-relaxed">
                Generate and print custom QR codes for your cages. Instantly access bird profiles and breeding logs by scanning with your mobile device.
              </p>
            </div>

            <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 lg:p-8 transition-all hover:bg-zinc-900/80 hover:border-secondary/30">
              <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary mb-6">
                <Share2 size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Secure Transfers</h3>
              <p className="text-black-50 leading-relaxed">
                Safely transfer digital ownership of birds to other breeders within the platform, ensuring pedigree integrity and historical data preservation.
              </p>
            </div>

            <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 lg:p-8 transition-all hover:bg-zinc-900/80 hover:border-secondary/30">
              <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary mb-6">
                <Shield size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Data Privacy</h3>
              <p className="text-black-50 leading-relaxed">
                We take your privacy seriously. Your aviary data is encrypted and accessible only by you, protected by industry-standard authentication.
              </p>
            </div>

            <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 lg:p-8 transition-all hover:bg-zinc-900/80 hover:border-secondary/30">
              <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary mb-6">
                <Dna size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Genetic Calculator</h3>
              <p className="text-black-50 leading-relaxed">
                Predict offspring outcomes with our advanced genetic calculator. Analyze mutations and inheritance patterns before pairing your birds.
              </p>
            </div>

            <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 lg:p-8 transition-all hover:bg-zinc-900/80 hover:border-secondary/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <span className="bg-secondary/20 text-secondary text-[10px] font-bold uppercase tracking-wider py-1 px-2.5 rounded-full">Coming Soon</span>
              </div>
              <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary mb-6 opacity-60">
                <Store size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Vetted Marketplace</h3>
              <p className="text-black-50 leading-relaxed">
                Buy and sell birds with confidence in our exclusive marketplace. Connect with other verified, reputable breeders on the platform.
              </p>
            </div>

            <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 lg:p-8 transition-all hover:bg-zinc-900/80 hover:border-secondary/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <span className="bg-secondary/20 text-secondary text-[10px] font-bold uppercase tracking-wider py-1 px-2.5 rounded-full">Coming Soon</span>
              </div>
              <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary mb-6 opacity-60">
                <BookOpen size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Bird Wiki</h3>
              <p className="text-black-50 leading-relaxed">
                A comprehensive, community-driven encyclopedia covering species-specific care, genetics, health issues, and breeding best practices.
              </p>
            </div>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20 sm:mt-32">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-black-50">One comprehensive plan, unlimited access to all features.</p>
          </div>
          
          <div className="max-w-lg mx-auto bg-zinc-900/50 border border-secondary/30 rounded-3xl p-8 sm:p-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <span className="bg-secondary text-black-950 text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full">All Inclusive</span>
            </div>
            
            <h3 className="text-2xl font-bold text-white mb-2">Pro Breeder Plan</h3>
            <p className="text-black-100 mb-6">Everything you need to manage your aviary efficiently.</p>
            
            <div className="flex flex-col gap-1 mb-8 border-b border-white/10 pb-8">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black text-white">R450</span>
                <span className="text-lg text-black-50 font-medium">ZAR / year</span>
              </div>
              <p className="text-emerald-400 font-medium text-sm">Equivalent to only R37.50 ZAR per month</p>
            </div>
            
            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <div className="p-1.5 rounded-full bg-secondary/10 text-secondary mt-0.5">
                  <CheckCircle2 size={16} />
                </div>
                <span className="text-black-50 leading-tight">Unlimited Bird Profiles, Cages & Pairings</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="p-1.5 rounded-full bg-secondary/10 text-secondary mt-0.5">
                  <CheckCircle2 size={16} />
                </div>
                <span className="text-black-50 leading-tight">Advanced Breeding & Clutch Tracking</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="p-1.5 rounded-full bg-secondary/10 text-secondary mt-0.5">
                  <CheckCircle2 size={16} />
                </div>
                <span className="text-black-50 leading-tight">Custom QR Code Generation & Scanning</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="p-1.5 rounded-full bg-secondary/10 text-secondary mt-0.5">
                  <CheckCircle2 size={16} />
                </div>
                <span className="text-black-50 leading-tight">Full Pedigree Archiving & Visualizer</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="p-1.5 rounded-full bg-secondary/10 text-secondary mt-0.5">
                  <CheckCircle2 size={16} />
                </div>
                <span className="text-black-50 leading-tight">Secure Bird Transfers between Breeders</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="p-1.5 rounded-full bg-secondary/10 text-secondary mt-0.5">
                  <CheckCircle2 size={16} />
                </div>
                <span className="text-black-50 leading-tight">Advanced Genetic Calculator</span>
              </li>
            </ul>
            
            <div className="bg-black/50 rounded-xl p-4 border border-white/5">
              <p className="text-xs text-black-100 text-center leading-relaxed">
                Secure payments processed by Yoco. <br />Manual annual renewal (no automatic charges).
              </p>
            </div>
          </div>
        </div>

        {/* Company Info Section */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-20 sm:mt-32 text-center">
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-6">About The Averian</h2>
          <p className="text-black-50 mb-8 leading-relaxed">
            The Averian is a dedicated SaaS (Software as a Service) platform tailored to the unique needs of the avian breeding community. Our mission is to modernize aviary management through intuitive technology, helping breeders make informed genetic decisions and maintain impeccable records.
          </p>
          <div className="inline-flex items-center justify-center space-x-2 text-sm font-medium text-black-100 bg-zinc-900/50 px-4 py-2 rounded-full border border-white/5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Platform Status: Fully Operational</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-black-100 text-sm">
          <p>&copy; {new Date().getFullYear()} The Averian. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

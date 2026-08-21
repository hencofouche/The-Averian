import React from 'react';
import { 
  Clock, Sparkles, ArrowLeft, Shield, Rocket, CheckCircle2, 
  HelpCircle, Eye, EyeOff, Wrench, Bell
} from 'lucide-react';
import { Button } from './ui';
import { AppPageId, ComingSoonPageConfig } from '../types';
import { motion } from 'motion/react';

interface ComingSoonViewProps {
  pageId: AppPageId;
  pageName: string;
  icon: React.ReactNode;
  config?: ComingSoonPageConfig;
  onNavigateHome: () => void;
  isAdmin?: boolean;
  isAdminPreviewMode?: boolean;
  onExitAdminPreview?: () => void;
  onTogglePageComingSoon?: (pageId: AppPageId, enabled: boolean) => void;
}

const DEFAULT_PAGE_DETAILS: Record<AppPageId, { title: string; subtitle: string; description: string; features: string[]; estimatedRelease: string }> = {
  birds: {
    title: 'Bird Flock Management',
    subtitle: 'Next-Generation Aviary Records',
    description: 'We are currently upgrading the core bird records engine with advanced analytics, health logs, and media archives.',
    features: ['High-resolution photo galleries', 'Detailed lineage tracing', 'Direct ring scanner integration'],
    estimatedRelease: 'Coming Soon'
  },
  cages: {
    title: 'Cage & Aviary Management',
    subtitle: 'Smart Housing & Spatial Organization',
    description: 'Upgrading cage mapping, occupancy limits, and automated cleaning reminders for your aviaries.',
    features: ['Visual cage layouts', 'Capacity monitoring', 'Cleaning & maintenance schedules'],
    estimatedRelease: 'Coming Soon'
  },
  pairs: {
    title: 'Breeding Pairs Hub',
    subtitle: 'Strategic Genetic Pairing',
    description: 'Our breeding pair analyzer is undergoing high-performance optimizations to calculate fertility rates and mutation compatibility.',
    features: ['Historical clutch records', 'Genetic compatibility scores', 'Pair bonding timeline'],
    estimatedRelease: 'Coming Soon'
  },
  breeding: {
    title: 'Breeding & Incubator Hub',
    subtitle: 'Smart Candling & Egg Tracking',
    description: 'The smart candling, incubation schedules, and chick weaning monitors are receiving exciting enhancements.',
    features: ['Multi-clutch candling photos', 'Incubation countdown timer', 'Automated ringing notifications'],
    estimatedRelease: 'Coming Soon'
  },
  marketplace: {
    title: 'Classifieds & Aviary Marketplace',
    subtitle: 'Verified Breeder Community Hub',
    description: 'We make vetting simple: everyone who has access must get vetted immediately. Simply accept a quick WhatsApp video call to verify you are who you are and gain immediate access to our secure community.',
    features: ['Sell Classifieds', 'Wanted Classifieds', 'Vetted Buyers & Sellers'],
    estimatedRelease: 'Launching Very Soon'
  },
  financials: {
    title: 'Aviary Financials & Accounting',
    subtitle: 'ROI, Feed & Bird Sales Ledger',
    description: 'Comprehensive financial tracking, feed costs, equipment depreciation, and bird sales profit analytics.',
    features: ['Interactive monthly cashflow graphs', 'Exportable tax & expense reports', 'Bird investment vs ROI calculator'],
    estimatedRelease: 'Coming Soon'
  },
  genetics: {
    title: 'Genetics & Mutation Engine',
    subtitle: 'Predictive Punnett Square Calculator',
    description: 'The world\'s most comprehensive companion bird genetics calculator for sex-linked, recessive, and dominant mutations.',
    features: ['Instant probability percentages', 'Visual plumage simulations', 'Multi-mutation combination breakdowns'],
    estimatedRelease: 'Coming Soon'
  },
  wiki: {
    title: 'Wiki & Species Care Guides',
    subtitle: 'Dynamic Avian Encyclopedia',
    description: 'Curated species care sheets, dietary guides, incubation standards, and mutation reference galleries.',
    features: ['Community-verified care sheets', 'Scientific & common name index', 'Mutation visual guides with photos'],
    estimatedRelease: 'Coming Soon'
  },
  tasks: {
    title: 'Aviary Tasks & Daily Routine',
    subtitle: 'Smart Reminders & Schedules',
    description: 'Streamlined task management for feeding, ringing, cleaning, vet checkups, and breeding reminders.',
    features: ['Interactive calendar timeline', 'Push notification alerts', 'Bird & cage specific subtasks'],
    estimatedRelease: 'Coming Soon'
  },
  contacts: {
    title: 'Contacts & Aviary Network',
    subtitle: 'Breeders, Vets & Suppliers Directory',
    description: 'Organize your network of trusted aviculturists, veterinary specialists, seed merchants, and customers.',
    features: ['Direct contact quick dial & email', 'Purchase & transaction history per contact', 'Breeder verification badges'],
    estimatedRelease: 'Coming Soon'
  },
  print: {
    title: 'Print & QR Label Studio',
    subtitle: 'Physical Aviary Organization',
    description: 'Generate high-definition printable cage labels, bird birth certificates, and pedigree documents.',
    features: ['Waterproof cage QR tags', 'Official pedigree certificates', 'Full aviary inventory PDF exports'],
    estimatedRelease: 'Coming Soon'
  },
  pedigree: {
    title: 'Interactive Pedigree Trees',
    subtitle: 'Multi-Generational Lineage Viewer',
    description: 'Explore interactive ancestral family trees, inbreeding coefficient calculations, and champion bloodlines.',
    features: ['5-generation zoomable family tree', 'Visual mutation inheritance markers', 'Direct PDF export'],
    estimatedRelease: 'Coming Soon'
  },
  stats: {
    title: 'Aviary Insights & Statistics',
    subtitle: 'Breeding & Facility Analytics',
    description: 'Deep data analytics on clutch hatch rates, species productivity, seasonal trends, and aviary growth.',
    features: ['Hatch rate trends & charts', 'Mortality & weaning statistics', 'Facility capacity analysis'],
    estimatedRelease: 'Coming Soon'
  },
  settings: {
    title: 'System Preferences & Settings',
    subtitle: 'Personalized Aviary Customization',
    description: 'Configure your custom mutations, species definitions, currency, and display preferences.',
    features: ['Custom mutation catalog', 'Backup & data export tools', 'Custom aviary branding'],
    estimatedRelease: 'Coming Soon'
  }
};

export function ComingSoonView({
  pageId,
  pageName,
  icon,
  config,
  onNavigateHome,
  isAdmin,
  isAdminPreviewMode,
  onExitAdminPreview,
  onTogglePageComingSoon
}: ComingSoonViewProps) {
  const defaults = DEFAULT_PAGE_DETAILS[pageId] || {
    title: pageName,
    subtitle: 'Exciting Feature In Development',
    description: 'Our development team is currently polishing this module to deliver an exceptional aviary management experience.',
    features: ['Streamlined user interface', 'Fast cloud synchronization', 'Offline support'],
    estimatedRelease: 'Coming Soon'
  };

  let title = config?.title?.trim() || defaults.title;
  let subtitle = config?.subtitle?.trim() || defaults.subtitle;
  let description = config?.description?.trim() || defaults.description;
  let estimatedRelease = config?.estimatedRelease?.trim() || defaults.estimatedRelease;
  let badgeText = config?.badgeText?.trim() || 'COMING SOON';
  let features = (config?.featuresList && config.featuresList.length > 0) ? config.featuresList : defaults.features;

  if (pageId === 'marketplace') {
    description = 'We make vetting simple: everyone who has access must get vetted immediately. Simply accept a quick WhatsApp video call to verify you are who you are and gain immediate access to our secure community.';
    features = ['Sell Classifieds', 'Wanted Classifieds', 'Vetted Buyers & Sellers'];
  }

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center p-4 sm:p-6 md:p-10 relative select-none">
      {/* Admin Testing Notification (if admin is previewing user mode) */}
      {isAdmin && isAdminPreviewMode && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
              <Eye size={20} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-amber-400">Admin User Preview</p>
              <p className="text-xs text-zinc-300">You are viewing what regular users see for this page.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onExitAdminPreview && (
              <Button 
                variant="secondary"
                onClick={onExitAdminPreview}
                className="w-full sm:w-auto text-xs font-bold py-1.5 px-3"
              >
                <Shield size={14} className="mr-1 text-amber-400" />
                Return to Admin Testing
              </Button>
            )}
            {onTogglePageComingSoon && (
              <Button
                variant="secondary"
                onClick={() => onTogglePageComingSoon(pageId, false)}
                className="w-full sm:w-auto text-xs border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 py-1.5 px-3"
              >
                <CheckCircle2 size={14} className="mr-1" />
                Launch Live
              </Button>
            )}
          </div>
        </motion.div>
      )}

      {/* Background Glow */}
      <div className="absolute inset-0 max-w-4xl mx-auto flex items-center justify-center pointer-events-none opacity-20">
        <div className="w-96 h-96 bg-gradient-to-tr from-amber-500/40 via-secondary/30 to-blue-500/20 blur-3xl rounded-full" />
      </div>

      {/* Main Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-2xl bg-zinc-950/80 border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl relative overflow-hidden text-center z-10"
      >
        {/* Subtle top ambient line */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-secondary to-transparent opacity-70" />

        {/* Floating Icon with Glow */}
        <div className="mx-auto mb-6 relative w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-secondary/20 to-amber-500/10 border border-secondary/30 blur-[2px] animate-pulse" />
          <div className="relative w-16 h-16 rounded-2xl bg-zinc-900 border border-secondary/40 flex items-center justify-center text-secondary shadow-lg shadow-secondary/10">
            {icon ? React.cloneElement(icon as React.ReactElement<any>, { size: 32 }) : <Wrench size={32} />}
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-black flex items-center justify-center shadow-md">
            <Clock size={14} className="animate-spin" style={{ animationDuration: '6s' }} />
          </div>
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-black uppercase tracking-widest mb-3 shadow-inner">
          <Sparkles size={12} className="text-amber-400" />
          <span>{badgeText}</span>
        </div>

        {/* Titles */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight mb-2">
          {title}
        </h1>
        <p className="text-sm sm:text-base font-bold text-secondary tracking-wide uppercase text-[12px] mb-4">
          {subtitle}
        </p>

        {/* Description */}
        <p className="text-zinc-400 text-sm sm:text-base leading-relaxed max-w-lg mx-auto mb-8 font-medium">
          {description}
        </p>

        {/* What to expect list */}
        {features && features.length > 0 && (
          <div className="bg-zinc-900/60 border border-white/5 rounded-2xl p-4 sm:p-5 text-left mb-8 max-w-lg mx-auto">
            <div className="flex items-center gap-2 mb-3 text-xs font-black uppercase tracking-wider text-zinc-300">
              <Rocket size={14} className="text-secondary" />
              <span>What to Expect in This Release</span>
            </div>
            <div className="space-y-2.5">
              {features.map((feat, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-300">
                  <div className="w-4 h-4 rounded-full bg-secondary/10 border border-secondary/30 flex items-center justify-center shrink-0 mt-0.5 text-secondary">
                    <CheckCircle2 size={10} />
                  </div>
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Release Estimation Banner */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 border border-white/5 text-zinc-300 text-xs font-bold mb-8">
          <Clock size={14} className="text-amber-400" />
          <span>Status: <span className="text-white font-extrabold">{estimatedRelease}</span></span>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button 
            onClick={onNavigateHome}
            variant="primary"
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold bg-secondary hover:bg-secondary/90 text-black shadow-lg shadow-secondary/20"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to Aviary Dashboard
          </Button>

          {isAdmin && (
            <Button
              onClick={onExitAdminPreview}
              variant="secondary"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold border border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
            >
              <Shield size={16} className="mr-2 text-amber-400" />
              Admin Testing Mode
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

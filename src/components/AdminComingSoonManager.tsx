import React, { useState } from 'react';
import { 
  Clock, Shield, Eye, CheckCircle2, Sliders, Search, 
  ExternalLink, Sparkles, AlertTriangle, ArrowUpRight, 
  Bird, Home, Heart, Egg, ShoppingBag, DollarSign, 
  Dna, BookOpen, CheckSquare, Users, QrCode, FileText, 
  BarChart3, Tag, Lock, Unlock, HelpCircle
} from 'lucide-react';
import { Button, Input, Card, Badge } from './ui';
import { AppPageId, AppComingSoonSettings, ComingSoonPageConfig } from '../types';
import { AdminComingSoonModal } from './AdminComingSoonModal';
import { toast } from 'sonner';

interface AdminComingSoonManagerProps {
  comingSoonSettings: AppComingSoonSettings;
  onUpdatePageConfig: (pageId: AppPageId, config: ComingSoonPageConfig) => Promise<void>;
  onNavigateToTab: (tabId: any) => void;
}

interface PageDef {
  id: AppPageId;
  name: string;
  category: 'Core Aviary' | 'Commercial & Network' | 'Tools & Utilities';
  description: string;
  icon: React.ReactNode;
}

const ALL_APP_PAGES: PageDef[] = [
  { id: 'birds', name: 'Birds Flock', category: 'Core Aviary', description: 'Bird records, photo archives, DNA and lineage.', icon: <Bird size={18} /> },
  { id: 'cages', name: 'Cages & Aviaries', category: 'Core Aviary', description: 'Housing facilities, capacity and spatial mapping.', icon: <Home size={18} /> },
  { id: 'pairs', name: 'Breeding Pairs', category: 'Core Aviary', description: 'Active and archived mating pairs & bonding dates.', icon: <Heart size={18} /> },
  { id: 'breeding', name: 'Breeding & Incubation', category: 'Core Aviary', description: 'Egg candling logs, clutch timelines & weaning.', icon: <Egg size={18} /> },
  { id: 'marketplace', name: 'Classifieds & Marketplace', category: 'Commercial & Network', description: 'Breeder listings, buy/sell adverts & reviews.', icon: <ShoppingBag size={18} /> },
  { id: 'financials', name: 'Financials & Ledger', category: 'Commercial & Network', description: 'Bird sales, feed expenses, ROI & accounting.', icon: <DollarSign size={18} /> },
  { id: 'genetics', name: 'Genetics Engine', category: 'Tools & Utilities', description: 'Punnett square calculator for plumage mutations.', icon: <Dna size={18} /> },
  { id: 'wiki', name: 'Wiki & Care Guides', category: 'Tools & Utilities', description: 'Curated species care guides & mutation databases.', icon: <BookOpen size={18} /> },
  { id: 'tasks', name: 'Tasks & Reminders', category: 'Core Aviary', description: 'Daily feeding, ringing, cleaning and vet schedules.', icon: <CheckSquare size={18} /> },
  { id: 'contacts', name: 'Contacts & Network', category: 'Commercial & Network', description: 'Breeders, veterinarians, suppliers directory.', icon: <Users size={18} /> },
  { id: 'print', name: 'Print & QR Labels', category: 'Tools & Utilities', description: 'Cage labels, birth certificates & pedigree sheets.', icon: <QrCode size={18} /> },
  { id: 'pedigree', name: 'Pedigree Tree Viewer', category: 'Tools & Utilities', description: 'Multi-generational interactive ancestral trees.', icon: <FileText size={18} /> },
  { id: 'stats', name: 'Aviary Analytics', category: 'Tools & Utilities', description: 'Breeding statistics, clutch sizes and hatch rates.', icon: <BarChart3 size={18} /> },
  { id: 'settings', name: 'System Settings', category: 'Tools & Utilities', description: 'Custom species, mutations, colors and backups.', icon: <Tag size={18} /> },
];

export function AdminComingSoonManager({
  comingSoonSettings,
  onUpdatePageConfig,
  onNavigateToTab
}: AdminComingSoonManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'Core Aviary' | 'Commercial & Network' | 'Tools & Utilities'>('all');
  const [selectedPageForModal, setSelectedPageForModal] = useState<PageDef | null>(null);
  const [isTogglingId, setIsTogglingId] = useState<string | null>(null);

  const pagesMap = comingSoonSettings?.pages || {};

  const filteredPages = ALL_APP_PAGES.filter(page => {
    const matchesSearch = page.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          page.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || page.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalPages = ALL_APP_PAGES.length;
  const comingSoonCount = ALL_APP_PAGES.filter(p => pagesMap[p.id]?.enabled).length;
  const liveCount = totalPages - comingSoonCount;

  const handleQuickToggle = async (page: PageDef) => {
    const currentConfig = pagesMap[page.id] || { enabled: false };
    const nextState = !currentConfig.enabled;
    setIsTogglingId(page.id);
    try {
      await onUpdatePageConfig(page.id, {
        ...currentConfig,
        enabled: nextState,
        allowAdminTesting: true,
        updatedAt: new Date().toISOString()
      });
      if (nextState) {
        toast.success(`Marked "${page.name}" as Coming Soon. (Admins can still test it!)`);
      } else {
        toast.success(`Launched "${page.name}" to Live for all users!`);
      }
    } catch (err: any) {
      toast.error('Failed to toggle status: ' + err.message);
    } finally {
      setIsTogglingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-900/60 border border-white/5 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Total Modules</p>
            <p className="text-2xl font-black text-white mt-1">{totalPages}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-zinc-300">
            <Tag size={20} />
          </div>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Marked Coming Soon</p>
            <p className="text-2xl font-black text-amber-300 mt-1">{comingSoonCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock size={20} />
          </div>
        </div>

        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Public & Live</p>
            <p className="text-2xl font-black text-emerald-300 mt-1">{liveCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 size={20} />
          </div>
        </div>
      </div>

      {/* Admin Testing Guarantee Banner */}
      <div className="p-4 rounded-2xl bg-zinc-900/80 border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shrink-0">
            <Shield size={22} />
          </div>
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              Admin Real-Time Sandbox Testing
              <span className="text-[10px] bg-amber-500 text-black font-extrabold px-2 py-0.5 rounded-full uppercase">
                Active
              </span>
            </h3>
            <p className="text-xs text-zinc-300 mt-0.5 max-w-2xl leading-relaxed">
              When a page is toggled to <strong>Coming Soon</strong>, standard non-admin users will see an aesthetic Coming Soon splash screen. As an administrator, you always maintain <strong>full interactive access</strong> to test, add records, and inspect all features.
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pages or descriptions..."
            className="pl-9 bg-zinc-900/80 border-white/10 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {(['all', 'Core Aviary', 'Commercial & Network', 'Tools & Utilities'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                categoryFilter === cat 
                  ? 'bg-secondary text-black shadow-md shadow-secondary/20' 
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/5'
              }`}
            >
              {cat === 'all' ? 'All Modules' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Pages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPages.map(page => {
          const config = pagesMap[page.id];
          const isComingSoon = Boolean(config?.enabled);
          const isToggling = isTogglingId === page.id;

          return (
            <div 
              key={page.id}
              className={`p-5 rounded-2xl border transition-all relative flex flex-col justify-between ${
                isComingSoon 
                  ? 'bg-amber-950/20 border-amber-500/40 shadow-lg shadow-amber-500/5' 
                  : 'bg-zinc-900/40 border-white/5 hover:border-white/10'
              }`}
            >
              <div>
                {/* Header & Badges */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                      isComingSoon 
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' 
                        : 'bg-zinc-800 text-zinc-300 border-white/10'
                    }`}>
                      {page.icon}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                        {page.name}
                      </h4>
                      <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                        {page.category}
                      </span>
                    </div>
                  </div>

                  {/* Status Tag */}
                  {isComingSoon ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-black uppercase tracking-wider">
                      <Clock size={11} />
                      {config?.badgeText || 'COMING SOON'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                      <CheckCircle2 size={11} />
                      LIVE
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-xs text-zinc-400 line-clamp-2 mb-3">
                  {config?.description || page.description}
                </p>

                {/* Admin Status Note & Beta Tester Note */}
                {isComingSoon && (
                  <div className="space-y-1.5 mb-4">
                    <div className="p-2 rounded-lg bg-zinc-900/90 border border-white/5 text-[11px] text-zinc-300 flex items-center gap-1.5">
                      <Shield size={12} className="text-amber-400 shrink-0" />
                      <span>Admin test status: <strong className="text-amber-300">Full Access</strong></span>
                    </div>

                    {config?.allowBetaTesters !== false && (
                      <div className="p-2 rounded-lg bg-indigo-950/40 border border-indigo-500/20 text-[11px] text-indigo-300 flex items-center gap-1.5">
                        <Sparkles size={12} className="text-indigo-400 shrink-0" />
                        <span>Beta Testers Early Access: <strong className="text-indigo-200">Authorized</strong></span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2 mt-2">
                {/* Left quick actions */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setSelectedPageForModal(page)}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors text-xs font-semibold flex items-center gap-1"
                    title="Customize Coming Soon details"
                  >
                    <Sliders size={13} />
                    <span className="hidden sm:inline">Customize</span>
                  </button>

                  <button
                    onClick={() => onNavigateToTab(page.id)}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-secondary hover:text-black text-zinc-300 transition-colors text-xs font-semibold flex items-center gap-1"
                    title="Test and view this page as Admin"
                  >
                    <ArrowUpRight size={13} />
                    <span className="hidden sm:inline">Test Page</span>
                  </button>
                </div>

                {/* Right Toggle Button */}
                <Button
                  variant={isComingSoon ? "secondary" : "primary"}
                  disabled={isToggling}
                  onClick={() => handleQuickToggle(page)}
                  className={`text-xs font-black px-3 py-1.5 ${
                    isComingSoon 
                      ? 'border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10' 
                      : 'bg-amber-500 hover:bg-amber-400 text-black'
                  }`}
                >
                  {isComingSoon ? (
                    <>
                      <Unlock size={13} className="mr-1" />
                      Make Live
                    </>
                  ) : (
                    <>
                      <Lock size={13} className="mr-1" />
                      Mark Soon
                    </>
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Configuration Modal */}
      {selectedPageForModal && (
        <AdminComingSoonModal
          isOpen={true}
          pageId={selectedPageForModal.id}
          pageName={selectedPageForModal.name}
          initialConfig={pagesMap[selectedPageForModal.id]}
          onClose={() => setSelectedPageForModal(null)}
          onSave={async (pId, newCfg) => {
            await onUpdatePageConfig(pId, newCfg);
            toast.success(`Updated settings for "${selectedPageForModal.name}"!`);
          }}
        />
      )}
    </div>
  );
}

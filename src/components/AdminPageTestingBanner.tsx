import React from 'react';
import { 
  Shield, Eye, CheckCircle2, Sliders, AlertTriangle, 
  Sparkles, Lock, Unlock, X
} from 'lucide-react';
import { Button } from './ui';
import { AppPageId, ComingSoonPageConfig } from '../types';
import { motion } from 'motion/react';

interface AdminPageTestingBannerProps {
  pageId: AppPageId;
  pageName: string;
  config?: ComingSoonPageConfig;
  onPreviewAsUser: () => void;
  onLaunchLive: () => void;
  onOpenConfigModal: () => void;
  isProcessing?: boolean;
}

export function AdminPageTestingBanner({
  pageId,
  pageName,
  config,
  onPreviewAsUser,
  onLaunchLive,
  onOpenConfigModal,
  isProcessing
}: AdminPageTestingBannerProps) {
  const badgeText = config?.badgeText || 'COMING SOON';

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-gradient-to-r from-amber-950/80 via-amber-900/40 to-zinc-950 border-b border-amber-500/40 px-4 py-2.5 sm:px-6 sm:py-3 shadow-lg z-20 sticky top-0 backdrop-blur-md"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        {/* Status indicator & Text */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shrink-0 shadow-inner">
            <Shield size={18} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-widest bg-amber-500 text-black px-2 py-0.5 rounded-full font-sans">
                ADMIN TESTING ACTIVE
              </span>
              <span className="text-xs font-black text-white">
                {pageName} is marked as <span className="text-amber-400 font-extrabold">{badgeText}</span>
              </span>
            </div>
            <p className="text-[11px] text-zinc-300 hidden sm:block mt-0.5">
              Regular users see the Coming Soon landing page. You have full access to test, create, and manage records.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
          <button
            onClick={onPreviewAsUser}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-200 text-xs font-bold transition-all hover:text-white"
            title="Preview how this page looks to non-admin users"
          >
            <Eye size={14} className="text-sky-400" />
            <span>Preview User View</span>
          </button>

          <button
            onClick={onOpenConfigModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-200 text-xs font-bold transition-all hover:text-white"
            title="Configure coming soon text, teaser and features"
          >
            <Sliders size={14} className="text-secondary" />
            <span>Customize</span>
          </button>

          <Button
            onClick={onLaunchLive}
            disabled={isProcessing}
            className="bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs px-3 py-1.5 shadow-md shadow-emerald-500/20"
            title="Make this page live for all users"
          >
            <Unlock size={14} className="mr-1" />
            <span>Launch to Public</span>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

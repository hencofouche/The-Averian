import React, { useState, useEffect } from 'react';
import { 
  X, Shield, Clock, Sparkles, CheckCircle2, Plus, Trash2, 
  Sliders, Rocket, AlertCircle, Save
} from 'lucide-react';
import { Button, Input, Textarea } from './ui';
import { AppPageId, ComingSoonPageConfig } from '../types';

interface AdminComingSoonModalProps {
  pageId: AppPageId;
  pageName: string;
  initialConfig?: ComingSoonPageConfig;
  isOpen: boolean;
  onClose: () => void;
  onSave: (pageId: AppPageId, config: ComingSoonPageConfig) => Promise<void> | void;
}

export function AdminComingSoonModal({
  pageId,
  pageName,
  initialConfig,
  isOpen,
  onClose,
  onSave
}: AdminComingSoonModalProps) {
  const [enabled, setEnabled] = useState(initialConfig?.enabled ?? false);
  const [title, setTitle] = useState(initialConfig?.title || '');
  const [subtitle, setSubtitle] = useState(initialConfig?.subtitle || '');
  const [description, setDescription] = useState(initialConfig?.description || '');
  const [estimatedRelease, setEstimatedRelease] = useState(initialConfig?.estimatedRelease || 'Coming Soon');
  const [badgeText, setBadgeText] = useState(initialConfig?.badgeText || 'COMING SOON');
  const [featuresList, setFeaturesList] = useState<string[]>(initialConfig?.featuresList || []);
  const [newFeatureInput, setNewFeatureInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEnabled(initialConfig?.enabled ?? false);
      setTitle(initialConfig?.title || '');
      setSubtitle(initialConfig?.subtitle || '');
      setDescription(initialConfig?.description || '');
      setEstimatedRelease(initialConfig?.estimatedRelease || 'Coming Soon');
      setBadgeText(initialConfig?.badgeText || 'COMING SOON');
      setFeaturesList(initialConfig?.featuresList || []);
      setNewFeatureInput('');
    }
  }, [isOpen, initialConfig]);

  if (!isOpen) return null;

  const handleAddFeature = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newFeatureInput.trim()) return;
    setFeaturesList([...featuresList, newFeatureInput.trim()]);
    setNewFeatureInput('');
  };

  const handleRemoveFeature = (index: number) => {
    setFeaturesList(featuresList.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const config: ComingSoonPageConfig = {
        enabled,
        title: title.trim() || undefined,
        subtitle: subtitle.trim() || undefined,
        description: description.trim() || undefined,
        estimatedRelease: estimatedRelease.trim() || 'Coming Soon',
        badgeText: badgeText.trim() || 'COMING SOON',
        featuresList: featuresList.length > 0 ? featuresList : undefined,
        allowAdminTesting: true,
        updatedAt: new Date().toISOString()
      };
      await onSave(pageId, config);
      onClose();
    } catch (err) {
      console.error('Failed to save coming soon config:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-zinc-950 border border-white/10 rounded-3xl w-full max-w-xl p-6 shadow-2xl relative my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Clock size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                Configure Coming Soon: <span className="text-amber-400">{pageName}</span>
              </h2>
              <p className="text-xs text-zinc-400">Manage public visibility and preview settings for this module.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Main Toggle */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-white">Coming Soon Status</p>
              <p className="text-xs text-zinc-400">
                {enabled ? 'Active — regular users see Coming Soon screen; Admin has testing access.' : 'Disabled — page is fully public to all users.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEnabled(!enabled)}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                enabled ? 'bg-amber-500' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-black shadow-lg ring-0 transition duration-200 ease-in-out ${
                  enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Admin Testing Guarantee Note */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5">
            <Shield size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-300">
              <span className="font-bold">Admin Testing Active:</span> Because you are an administrator, you will always be able to enter and test this page even when Coming Soon is enabled.
            </div>
          </div>

          {/* Custom Details */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Badge Text (e.g. COMING SOON, IN DEVELOPMENT)
              </label>
              <Input
                value={badgeText}
                onChange={(e) => setBadgeText(e.target.value)}
                placeholder="COMING SOON"
                className="bg-zinc-900/80 border-white/10"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Custom Page Title
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={pageName}
                  className="bg-zinc-900/80 border-white/10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Estimated Launch Note
                </label>
                <Input
                  value={estimatedRelease}
                  onChange={(e) => setEstimatedRelease(e.target.value)}
                  placeholder="e.g. Next Week, Q3 2026"
                  className="bg-zinc-900/80 border-white/10"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Short Subtitle
              </label>
              <Input
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="e.g. Next-Generation Breeding Analytics"
                className="bg-zinc-900/80 border-white/10"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Description / Teaser
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what features are being developed and what users can look forward to..."
                rows={3}
                className="bg-zinc-900/80 border-white/10"
              />
            </div>

            {/* Upcoming Features Bullet Points */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Key Upcoming Highlights
              </label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newFeatureInput}
                  onChange={(e) => setNewFeatureInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddFeature(); } }}
                  placeholder="Add a feature point (e.g. Direct ring scanner support)"
                  className="bg-zinc-900/80 border-white/10"
                />
                <Button 
                  type="button" 
                  onClick={handleAddFeature}
                  variant="secondary" 
                  className="shrink-0 px-3"
                >
                  <Plus size={16} />
                </Button>
              </div>

              {featuresList.length > 0 && (
                <div className="space-y-1.5 max-h-36 overflow-y-auto p-2 bg-zinc-900/40 rounded-xl border border-white/5">
                  {featuresList.map((feat, idx) => (
                    <div key={idx} className="flex items-center justify-between p-1.5 bg-zinc-900 rounded-lg text-xs text-zinc-300">
                      <span className="truncate mr-2">• {feat}</span>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveFeature(idx)}
                        className="text-zinc-500 hover:text-red-400 p-1"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs px-5 shadow-lg shadow-amber-500/20"
            >
              <Save size={14} className="mr-1.5" />
              {isSaving ? 'Saving Changes...' : 'Save Settings'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

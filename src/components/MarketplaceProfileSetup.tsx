import React, { useState, useMemo } from 'react';
import { Award, ShieldCheck, MapPin, Phone, MessageCircle, Mail, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button, Input, Select, Textarea } from './ui';
import { toast } from 'sonner';
import { doc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { SellerProfile } from '../types';
import { SUPPORTED_COUNTRY_MARKETPLACES, getCountryMarketplace } from '../lib/country-marketplace';
import { sanitizePhoneNumber, isValidPhoneNumber } from '../lib/phone-utils';

interface MarketplaceProfileSetupProps {
  user: any;
  existingProfile: SellerProfile | null;
  onComplete: () => void;
}

export function MarketplaceProfileSetup({
  user,
  existingProfile,
  onComplete
}: MarketplaceProfileSetupProps) {
  const initialCountry = getCountryMarketplace(existingProfile?.countryCode || existingProfile?.country || 'South Africa');

  const [formData, setFormData] = useState({
    sellerName: existingProfile?.sellerName || user?.displayName || '',
    aviaryName: existingProfile?.aviaryName || '',
    town: existingProfile?.town || '',
    provinceState: existingProfile?.provinceState || '',
    country: existingProfile?.country || initialCountry.name,
    countryCode: existingProfile?.countryCode || initialCountry.code,
    currencyCode: existingProfile?.currencyCode || initialCountry.currencyCode,
    whatsapp: existingProfile?.whatsapp || '',
    phone: existingProfile?.phone || '',
    email: existingProfile?.email || user?.email || '',
    bio: existingProfile?.bio || ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const currentCountryConfig = useMemo(() => {
    return getCountryMarketplace(formData.countryCode || formData.country);
  }, [formData.countryCode, formData.country]);

  const handleCountryChange = (cCode: string) => {
    const matched = getCountryMarketplace(cCode);
    setFormData(prev => ({
      ...prev,
      country: matched.name,
      countryCode: matched.code,
      currencyCode: matched.currencyCode,
      provinceState: matched.regions && matched.regions.length > 0 ? matched.regions[0] : ''
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sellerName.trim() || !formData.town.trim() || !formData.whatsapp.trim()) {
      toast.error('Seller Name, Location/Town, and WhatsApp number are required!');
      return;
    }

    const sanitizedWhatsApp = sanitizePhoneNumber(formData.whatsapp);
    const sanitizedPhone = formData.phone ? sanitizePhoneNumber(formData.phone) : '';

    if (!isValidPhoneNumber(sanitizedWhatsApp)) {
      toast.error('Please enter a valid WhatsApp phone number with at least 9 digits.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        ...formData,
        country: currentCountryConfig.name,
        countryCode: currentCountryConfig.code,
        currencyCode: currentCountryConfig.currencyCode,
        whatsapp: sanitizedWhatsApp,
        phone: sanitizedPhone,
        profileSetupComplete: true,
        status: 'approved'
      };

      if (existingProfile?.id) {
        await updateDoc(doc(db, 'sellerProfiles', existingProfile.id), {
          ...payload,
          updatedAt: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, 'sellerProfiles'), {
          ...payload,
          uid: user?.uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      toast.success('Your breeder profile is ready! Welcome to the marketplace.');
      onComplete();
    } catch (err: any) {
      toast.error('Failed to save profile: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8 w-full">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-zinc-900 via-zinc-950 to-black border border-zinc-800 p-6 sm:p-10 shadow-2xl space-y-8">
        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header Block */}
        <div className="flex items-center gap-4 border-b border-zinc-800/80 pb-6 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-teal-600/20 to-gold-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
            <CheckCircle2 size={30} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white tracking-wide">
                Identity Approved!
              </h2>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                Verified Breeder
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-medium mt-1">
              Your identity has been successfully verified. Now, set up your breeder seller profile details.
            </p>
          </div>
        </div>

        {/* Instruction Message */}
        <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl space-y-1.5 relative z-10">
          <p className="text-xs text-zinc-300 leading-relaxed">
            Please fill out your remaining aviary and contact information below. This is required so buyers can view your credentials, specialties, location, and connect with you directly via WhatsApp.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          {/* Country Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Country / Marketplace Region *</label>
            <Select
              value={formData.countryCode}
              onChange={e => handleCountryChange(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-sm font-semibold text-white w-full h-11"
            >
              {SUPPORTED_COUNTRY_MARKETPLACES.map(c => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name} — Currency: {c.currencyCode} ({c.currencySymbol})
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Breeder Name *</label>
              <Input
                required
                value={formData.sellerName}
                onChange={e => setFormData({ ...formData, sellerName: e.target.value })}
                placeholder="e.g. John Doe"
                className="bg-zinc-900 border-zinc-800 text-sm h-11"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Aviary / Stud Name</label>
              <Input
                value={formData.aviaryName}
                onChange={e => setFormData({ ...formData, aviaryName: e.target.value })}
                placeholder="e.g. Sunbird Aviaries"
                className="bg-zinc-900 border-zinc-800 text-sm h-11"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Location / Town *</label>
              <Input
                required
                value={formData.town}
                onChange={e => setFormData({ ...formData, town: e.target.value })}
                placeholder="e.g. Pretoria, Austin, London"
                className="bg-zinc-900 border-zinc-800 text-sm h-11"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Province / State / Region *</label>
              {currentCountryConfig.regions && currentCountryConfig.regions.length > 0 ? (
                <Select
                  value={formData.provinceState}
                  onChange={e => setFormData({ ...formData, provinceState: e.target.value })}
                  className="bg-zinc-900 border-zinc-800 text-sm h-11"
                >
                  <option value="">Select State/Region</option>
                  {currentCountryConfig.regions.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </Select>
              ) : (
                <Input
                  required
                  value={formData.provinceState}
                  onChange={e => setFormData({ ...formData, provinceState: e.target.value })}
                  placeholder="e.g. Gauteng, Texas"
                  className="bg-zinc-900 border-zinc-800 text-sm h-11"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">WhatsApp Number *</label>
              <Input
                required
                value={formData.whatsapp}
                onChange={e => setFormData({ ...formData, whatsapp: e.target.value })}
                placeholder={currentCountryConfig.phonePlaceholder || (currentCountryConfig.phonePrefix ? `e.g. ${currentCountryConfig.phonePrefix}...` : 'e.g. +27...')}
                className="bg-zinc-900 border-zinc-800 text-sm h-11"
              />
              <p className="text-[10px] text-zinc-500">
                Include country code (e.g. {currentCountryConfig.phonePrefix || '+27'}...)
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Contact Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="breeder@example.com"
                className="bg-zinc-900 border-zinc-800 text-sm h-11"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Aviary Bio & Specialties</label>
            <Textarea
              value={formData.bio}
              onChange={e => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell buyers about your birds, breeding experience, bloodlines..."
              className="bg-zinc-900 border-zinc-800 text-sm min-h-[100px] rounded-2xl"
            />
          </div>

          <div className="pt-4 border-t border-zinc-800">
            <Button
              type="submit"
              disabled={isSaving}
              className="w-full text-sm font-black bg-gold-500 text-black hover:bg-gold-400 py-3 rounded-2xl shadow-xl shadow-gold-500/10 transition-all"
            >
              {isSaving ? 'Saving Profile...' : 'Complete Profile Setup & Enter Marketplace'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

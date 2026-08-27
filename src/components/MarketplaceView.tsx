import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  ShoppingBag, Search, Plus, Filter, CheckCircle2, AlertCircle, Clock, 
  MapPin, Phone, MessageCircle, Mail, Shield, ShieldCheck, ShieldAlert, 
  Tag, DollarSign, Calendar, ChevronDown, ChevronUp, Image as ImageIcon,
  Check, X, Star, Heart, Bird as BirdIcon, Eye, Trash2, Edit2, Send,
  Share2, ArrowUpDown, Truck, Award, HelpCircle, UserCheck, AlertTriangle, RefreshCw, Sparkles, ExternalLink, Zap, Globe
} from 'lucide-react';
import { DiditVerificationModal } from './DiditVerificationModal';
import { 
  MarketplaceListing, SellerProfile, MarketplaceReview, 
  Bird, Pair, Cage, UserSettings 
} from '../types';
import { Button, Input, Card, Badge, Select, Textarea } from './ui';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { collection, doc, addDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { format } from 'date-fns';
import { compressAndUploadImage } from '../lib/image-utils';
import { defaultSpecies, defaultMutations } from '../lib/default-data';
import { sanitizePhoneNumber, getWhatsAppCleanNumber, buildWhatsAppLink, isValidPhoneNumber } from '../lib/phone-utils';
import {
  SUPPORTED_COUNTRY_MARKETPLACES,
  DEFAULT_COUNTRY,
  getCountryMarketplace,
  getCurrencySymbol,
  formatPrice,
  convertPrice,
  CountryMarketplaceInfo
} from '../lib/country-marketplace';

interface MarketplaceViewProps {
  user: any;
  userSettings: UserSettings | null;
  listings: MarketplaceListing[];
  sellerProfiles: SellerProfile[];
  reviews: MarketplaceReview[];
  birds: Bird[];
  pairs: Pair[];
  cages: Cage[];
  isAdmin: boolean;
  onNavigateToAdmin?: () => void;
  onNavigateToBird?: (birdId: string) => void;
}

export function MarketplaceView({
  user,
  userSettings,
  listings,
  sellerProfiles,
  reviews,
  birds,
  pairs,
  cages,
  isAdmin,
  onNavigateToAdmin
}: MarketplaceViewProps) {
  // Tab state: 'for_sale' | 'wanted' | 'my_listings'
  const [activeTab, setActiveTab] = useState<'for_sale' | 'wanted' | 'my_listings'>('for_sale');
  
  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSpecies, setSelectedSpecies] = useState<string>('All');
  const [selectedBanding, setSelectedBanding] = useState<string>('All');
  const [selectedSexing, setSelectedSexing] = useState<string>('All');
  const [selectedDelivery, setSelectedDelivery] = useState<string>('All');
  const [onlyVetChecked, setOnlyVetChecked] = useState(false);
  const [includeSoldAndArchived, setIncludeSoldAndArchived] = useState(false);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'price_low' | 'price_high'>('newest');
  const [selectedTown, setSelectedTown] = useState<string>('All');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createType, setCreateType] = useState<'for_sale' | 'wanted'>('for_sale');
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isSellerProfileModalOpen, setIsSellerProfileModalOpen] = useState(false);
  const [isDiditModalOpen, setIsDiditModalOpen] = useState(false);
  const [isSoldModalOpen, setIsSoldModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<MarketplaceListing | null>(null);

  // Current user's seller profile
  const myProfile = useMemo(() => {
    if (!user) return null;
    return sellerProfiles.find(p => p.uid === user?.uid) || null;
  }, [sellerProfiles, user]);

  const isVerifiedSeller = myProfile?.status === 'approved';
  const isVerifiedUser = isAdmin || isVerifiedSeller;

  // Country Marketplace View Selection
  const defaultCountryCode = useMemo(() => {
    if (myProfile?.country) {
      return getCountryMarketplace(myProfile.country).code;
    }
    if (userSettings?.currency) {
      const match = SUPPORTED_COUNTRY_MARKETPLACES.find(
        c => c.currencyCode === userSettings.currency || c.currencySymbol === userSettings.currency
      );
      if (match) return match.code;
    }
    return 'ZA';
  }, [myProfile, userSettings]);

  const [selectedCountryCode, setSelectedCountryCode] = useState<string>(() => defaultCountryCode);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/ZAR')
      .then(res => res.json())
      .then(data => {
        if (data && data.rates) {
          setExchangeRates(data.rates);
        }
      })
      .catch(() => {});
  }, []);

  const currentViewCountry = useMemo(() => {
    if (selectedCountryCode === 'ALL') return null;
    return SUPPORTED_COUNTRY_MARKETPLACES.find(c => c.code === selectedCountryCode) || DEFAULT_COUNTRY;
  }, [selectedCountryCode]);

  // Dynamic currency symbol & code for active marketplace view
  const activeCurrencySymbol = currentViewCountry ? currentViewCountry.currencySymbol : (userSettings?.currency || 'R');
  const activeCurrencyCode = currentViewCountry ? currentViewCountry.currencyCode : 'ZAR';

  // Unique towns and species for filter dropdowns (scoped to selected country if specific)
  const availableTowns = useMemo(() => {
    const towns = new Set<string>();
    listings.forEach(l => {
      if (selectedCountryCode !== 'ALL') {
        const listingCountry = getCountryMarketplace(l.country || l.countryCode || 'South Africa');
        if (listingCountry.code !== selectedCountryCode) return;
      }
      if (l.locationTown) towns.add(l.locationTown);
    });
    return Array.from(towns).sort();
  }, [listings, selectedCountryCode]);

  const availableSpecies = useMemo(() => {
    const species = new Set<string>();
    listings.forEach(l => {
      if (selectedCountryCode !== 'ALL') {
        const listingCountry = getCountryMarketplace(l.country || l.countryCode || 'South Africa');
        if (listingCountry.code !== selectedCountryCode) return;
      }
      if (l.species) species.add(l.species);
    });
    return Array.from(species).sort();
  }, [listings, selectedCountryCode]);

  // Filter listings
  const filteredListings = useMemo(() => {
    return listings.filter(l => {
      // Check linked flock bird status
      const linkedBird = l.birdId ? birds.find(b => b.id === l.birdId) : null;
      const isBirdUnavailable = linkedBird && (
        linkedBird.statuses?.some(s => s.toLowerCase() === 'sold' || s.toLowerCase() === 'deceased')
      );

      // Country Marketplace Filter (Filter to selected country unless Global/ALL is selected)
      if (selectedCountryCode !== 'ALL') {
        const listingCountry = getCountryMarketplace(l.country || l.countryCode || 'South Africa');
        if (listingCountry.code !== selectedCountryCode) {
          return false;
        }
      }

      // Tab matching
      if (activeTab === 'for_sale' && (l.type !== 'for_sale' || l.status === 'archived')) return false;
      if (activeTab === 'wanted' && (l.type !== 'wanted' || l.status === 'archived')) return false;
      if (activeTab === 'my_listings' && l.sellerId !== user?.uid) return false;

      // Auto-filter sold or deceased birds or archived listings from public browse
      if (activeTab !== 'my_listings' && !isAdmin) {
        if (!includeSoldAndArchived && (l.status === 'sold' || l.status === 'archived' || isBirdUnavailable)) {
          return false;
        }
        if (l.status !== 'active' && l.status !== 'sold') {
          return false;
        }
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = l.title.toLowerCase().includes(q);
        const matchesSpecies = l.species?.toLowerCase().includes(q);
        const matchesSubSpecies = l.subSpecies?.toLowerCase().includes(q);
        const matchesMutations = l.mutations?.some(m => m.toLowerCase().includes(q));
        const matchesTown = l.locationTown.toLowerCase().includes(q);
        const matchesAviary = l.sellerAviary?.toLowerCase().includes(q);
        const matchesRing = l.ringNumber?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesSpecies && !matchesSubSpecies && !matchesMutations && !matchesTown && !matchesAviary && !matchesRing) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory !== 'All' && l.category !== selectedCategory) return false;

      // Species filter
      if (selectedSpecies !== 'All' && l.species !== selectedSpecies) return false;

      // Banding status filter
      if (selectedBanding !== 'All' && l.bandingStatus !== selectedBanding) return false;

      // Sexing method filter
      if (selectedSexing !== 'All' && l.sexingMethod !== selectedSexing) return false;

      // Delivery option filter
      if (selectedDelivery !== 'All' && l.deliveryOption !== selectedDelivery) return false;

      // Vet checked filter
      if (onlyVetChecked && !l.vetChecked) return false;

      // Town filter
      if (selectedTown !== 'All' && l.locationTown !== selectedTown) return false;

      // Price filter
      const min = parseFloat(minPrice);
      const max = parseFloat(maxPrice);
      if (!isNaN(min) && l.price < min) return false;
      if (!isNaN(max) && l.price > max) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price_low') return a.price - b.price;
      if (sortBy === 'price_high') return b.price - a.price;
      // Default: newest
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [
    listings, selectedCountryCode, activeTab, user, isAdmin, birds, searchQuery, selectedCategory, 
    selectedSpecies, selectedBanding, selectedSexing, selectedDelivery, 
    onlyVetChecked, includeSoldAndArchived, selectedTown, minPrice, maxPrice, sortBy
  ]);

  // Handlers
  const handleOpenCreate = (type: 'for_sale' | 'wanted') => {
    if (!myProfile) {
      toast.error('Please create your Verified Seller Profile first before listing!');
      setIsSellerProfileModalOpen(true);
      return;
    }
    if (myProfile.status !== 'approved' && !isAdmin) {
      toast.error('Your seller profile is pending verification by Admin. You can post once approved!');
      setIsSellerProfileModalOpen(true);
      return;
    }
    setCreateType(type);
    setEditingListing(null);
    setIsCreateModalOpen(true);
  };

  const handleDeleteListing = async (listingId: string) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;
    try {
      await deleteDoc(doc(db, 'marketplaceListings', listingId));
      toast.success('Listing removed successfully');
    } catch (err: any) {
      toast.error('Failed to delete listing: ' + err.message);
    }
  };

  if (!isVerifiedUser) {
    return (
      <div className="space-y-6 max-w-[1200px] mx-auto p-4 sm:p-6 lg:p-8 w-full relative">
        {/* Verification Gate Header / Hero Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-zinc-900 via-zinc-950 to-black border border-zinc-800 p-6 sm:p-10 shadow-2xl space-y-8">
          {/* Decorative background glow */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Lock Badge */}
          <div className="flex items-center justify-between flex-wrap gap-4 border-b border-zinc-800/80 pb-6 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-blue-600/20 to-gold-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
                <ShieldCheck size={26} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white tracking-wide">
                    Aviary Marketplace & Classifieds
                  </h2>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                    <Zap size={11} className="fill-cyan-300" /> Identity Protected
                  </span>
                </div>
                <p className="text-xs text-zinc-400 font-medium mt-0.5">
                  Vetted Breeder Community Standards & Identity Verification Required
                </p>
              </div>
            </div>

            {myProfile && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
                <span className="text-zinc-500 font-medium">Status:</span>
                <span className={cn(
                  "font-bold uppercase tracking-wider px-2 py-0.5 rounded text-[10px]",
                  myProfile.status === 'pending'
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : myProfile.status === 'rejected'
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                    : "bg-zinc-800 text-zinc-400"
                )}>
                  {myProfile.status}
                </span>
              </div>
            )}
          </div>

          {/* Main Content Box */}
          <div className="max-w-2xl mx-auto text-center space-y-6 relative z-10 py-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-zinc-900/90 border-2 border-cyan-500/40 text-cyan-400 shadow-2xl shadow-cyan-500/20">
              <ShieldAlert size={40} className="text-cyan-400 animate-pulse" />
            </div>

            <div className="space-y-3">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Verify Your Identity to Access Marketplace
              </h1>
              <p className="text-sm text-zinc-300 leading-relaxed max-w-xl mx-auto font-normal">
                To protect our breeder community from scams, spam, and unverified listings, all members must complete <strong className="text-cyan-400">Identity Verification</strong> before viewing listings, contacting breeders, or posting birds.
              </p>
            </div>

            {/* Status-dependent Notice Card */}
            {!myProfile ? (
              <div className="p-5 bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-900/80 border border-zinc-800 rounded-2xl text-left space-y-3 shadow-xl">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400 shrink-0 mt-0.5">
                    <Sparkles size={20} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white">Instant Automated KYC via Didit.me AI</h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Verify your identity in under 2 minutes using government ID & biometric scan. Get an instant <strong className="text-zinc-200">Vetted Breeder Badge</strong> and immediate access to the Marketplace.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <Button
                    onClick={() => setIsDiditModalOpen(true)}
                    className="w-full sm:w-auto flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black uppercase tracking-wider text-xs py-3 px-6 shadow-xl shadow-cyan-500/20 rounded-xl"
                  >
                    <Zap size={16} className="fill-black mr-1.5" />
                    Verify Identity with Didit AI
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setIsSellerProfileModalOpen(true)}
                    className="w-full sm:w-auto text-xs font-bold py-3 px-5 border-zinc-800 text-zinc-300 hover:text-white rounded-xl"
                  >
                    <Award size={16} className="mr-1.5 text-gold-400" />
                    Register Breeder Profile
                  </Button>
                </div>
              </div>
            ) : myProfile.status === 'pending' ? (
              <div className="p-5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-left space-y-3 shadow-xl">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-400 shrink-0 mt-0.5">
                    <Clock size={20} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-amber-200">Profile Submitted — Manual Review Pending</h3>
                    <p className="text-xs text-amber-300/80 leading-relaxed">
                      Your seller profile is currently queued for manual Admin review. Want instant access right now? Skip the manual queue with automated Didit AI verification!
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <Button
                    onClick={() => setIsDiditModalOpen(true)}
                    className="w-full sm:w-auto flex-1 bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-wider text-xs py-3 px-6 shadow-xl shadow-cyan-500/20 rounded-xl"
                  >
                    <Sparkles size={16} className="mr-1.5" />
                    Verify with Didit AI (Instant Access)
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setIsSellerProfileModalOpen(true)}
                    className="w-full sm:w-auto text-xs font-bold py-3 px-5 border-zinc-800 text-zinc-300 rounded-xl"
                  >
                    Edit Profile Details
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-left space-y-3 shadow-xl">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-400 shrink-0 mt-0.5">
                    <AlertTriangle size={20} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-rose-200">Profile Verification Issue</h3>
                    <p className="text-xs text-rose-300/80 leading-relaxed">
                      Reason: {myProfile.rejectionReason || 'Your previous verification request was rejected. Please re-verify via Didit AI or update your details.'}
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <Button
                    onClick={() => setIsDiditModalOpen(true)}
                    className="w-full sm:w-auto flex-1 bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-wider text-xs py-3 px-6 shadow-xl shadow-cyan-500/20 rounded-xl"
                  >
                    <Zap size={16} className="fill-black mr-1.5" />
                    Re-Verify Identity with Didit AI
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setIsSellerProfileModalOpen(true)}
                    className="w-full sm:w-auto text-xs font-bold py-3 px-5 border-zinc-800 text-zinc-300 rounded-xl"
                  >
                    Update Breeder Profile
                  </Button>
                </div>
              </div>
            )}

            {/* Feature Checklist */}
            <div className="pt-6 border-t border-zinc-800/80 text-left">
              <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400 mb-4 text-center">
                What you unlock once identity is verified:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl flex items-center gap-3 text-zinc-300">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-white">Full Marketplace Access</p>
                    <p className="text-[11px] text-zinc-400">Browse all birds, pairs, cages & wanted ads</p>
                  </div>
                </div>

                <div className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl flex items-center gap-3 text-zinc-300">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/20">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-white">Vetted Breeder Badge</p>
                    <p className="text-[11px] text-zinc-400">Build 100% trust with buyers across the country</p>
                  </div>
                </div>

                <div className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl flex items-center gap-3 text-zinc-300">
                  <div className="w-8 h-8 rounded-xl bg-gold-500/10 text-gold-400 flex items-center justify-center shrink-0 border border-gold-500/20">
                    <ShoppingBag size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-white">Post Unlimited Listings</p>
                    <p className="text-[11px] text-zinc-400">List birds for sale or post wanted bird requests</p>
                  </div>
                </div>

                <div className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl flex items-center gap-3 text-zinc-300">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
                    <MessageCircle size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-white">Direct Breeder Communication</p>
                    <p className="text-[11px] text-zinc-400">Contact vetted breeders directly via WhatsApp & Phone</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Render Modals so users can complete verification directly */}
        <DiditVerificationModal
          user={user}
          sellerProfile={myProfile}
          isOpen={isDiditModalOpen}
          onClose={() => setIsDiditModalOpen(false)}
          onSuccess={() => {
            setIsDiditModalOpen(false);
            toast.success('Identity verified! Full marketplace access granted.');
          }}
        />

        {isSellerProfileModalOpen && (
          <SellerProfileModal
            user={user}
            isAdmin={isAdmin}
            existingProfile={myProfile}
            onClose={() => setIsSellerProfileModalOpen(false)}
            onOpenDidit={() => {
              setIsSellerProfileModalOpen(false);
              setIsDiditModalOpen(true);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] 2xl:max-w-[1920px] mx-auto p-4 sm:p-6 lg:p-8 w-full overflow-x-hidden relative">
      {/* Main Tabs and Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 hide-scrollbar">
          <button
            onClick={() => setActiveTab('for_sale')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap shrink-0",
              activeTab === 'for_sale'
                ? "bg-gold-500 text-black shadow-lg shadow-gold-500/20"
                : "bg-zinc-900/60 text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700"
            )}
          >
            <ShoppingBag size={16} />
            <span>Birds & Pairs For Sale</span>
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", activeTab === 'for_sale' ? "bg-black/20 text-black" : "bg-zinc-800 text-zinc-300")}>
              {listings.filter(l => l.type === 'for_sale' && (l.status === 'active' || l.status === 'sold')).length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('wanted')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap shrink-0",
              activeTab === 'wanted'
                ? "bg-gold-500 text-black shadow-lg shadow-gold-500/20"
                : "bg-zinc-900/60 text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700"
            )}
          >
            <Heart size={16} />
            <span>Wanted Listings</span>
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", activeTab === 'wanted' ? "bg-black/20 text-black" : "bg-zinc-800 text-zinc-300")}>
              {listings.filter(l => l.type === 'wanted' && l.status === 'active').length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('my_listings')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap shrink-0",
              activeTab === 'my_listings'
                ? "bg-gold-500 text-black shadow-lg shadow-gold-500/20"
                : "bg-zinc-900/60 text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700"
            )}
          >
            <Tag size={16} />
            <span>My Postings</span>
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", activeTab === 'my_listings' ? "bg-black/20 text-black" : "bg-zinc-800 text-zinc-300")}>
              {listings.filter(l => l.sellerId === user?.uid).length}
            </span>
          </button>
        </div>

        {/* Post Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {isAdmin && onNavigateToAdmin && (
            <Button
              onClick={onNavigateToAdmin}
              variant="secondary"
              className="text-xs sm:text-sm font-semibold py-2 px-3 sm:px-4 border-amber-500/40 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 whitespace-nowrap"
            >
              <Shield size={16} className="mr-1 sm:mr-1.5" />
              Admin
            </Button>
          )}
        </div>
      </div>

      {/* Country Marketplace Selector Banner */}
      <div className="p-3.5 sm:p-4 bg-zinc-950/80 border border-zinc-800/90 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-400 shrink-0">
            <Globe size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black uppercase tracking-wider text-white">
                Marketplace Region:
              </span>
              {currentViewCountry ? (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-gold-500/20 text-gold-300 border border-gold-500/30 flex items-center gap-1.5">
                  <span className="text-base">{currentViewCountry.flag}</span>
                  <span>{currentViewCountry.name}</span>
                  <span className="text-[10px] opacity-75">({currentViewCountry.currencyCode})</span>
                </span>
              ) : (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1.5">
                  <span>🌐</span>
                  <span>Global (All Countries)</span>
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 font-medium mt-0.5">
              {currentViewCountry 
                ? `Showing listings in ${currentViewCountry.flag} ${currentViewCountry.name} • Currency: ${currentViewCountry.currencyCode} (${currentViewCountry.currencySymbol})`
                : `Showing listings from all countries • Primary Currency: ${activeCurrencyCode} (${activeCurrencySymbol})`}
            </p>
          </div>
        </div>

        {/* Country Switcher Dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          <label className="text-[11px] font-bold text-zinc-400 hidden sm:inline whitespace-nowrap">
            Switch Country:
          </label>
          <Select
            value={selectedCountryCode}
            onChange={e => setSelectedCountryCode(e.target.value)}
            className="bg-zinc-900 border-zinc-700 text-sm font-semibold text-white rounded-xl py-2 w-full md:w-auto min-w-[210px]"
          >
            <option value="ALL">🌐 All Countries (Global View)</option>
            {SUPPORTED_COUNTRY_MARKETPLACES.map(c => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name} ({c.currencyCode} {c.currencySymbol})
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* My Postings Profile Status Card */}
      {activeTab === 'my_listings' && (
        <div className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-400">
              <Award size={18} />
            </div>
            <div>
              <p className="font-semibold text-white">Your Breeder Seller Profile</p>
              {myProfile ? (
                <p className="text-xs text-zinc-400">
                  Status: <span className={cn(
                    "font-bold uppercase",
                    myProfile.status === 'approved' ? "text-emerald-400" :
                    myProfile.status === 'pending' ? "text-amber-400" : "text-rose-400"
                  )}>{myProfile.status}</span> {myProfile.town && `(${myProfile.town})`}
                </p>
              ) : (
                <p className="text-xs text-zinc-400">You haven't registered a seller profile yet. Verification is required to list birds.</p>
              )}
            </div>
          </div>
          <button 
            onClick={() => setIsSellerProfileModalOpen(true)}
            className="text-xs font-semibold bg-gold-500 hover:bg-gold-400 text-black px-3.5 py-1.5 rounded-xl transition-all"
          >
            {myProfile ? 'Edit Profile Info' : 'Register Profile & Verify'}
          </button>
        </div>
      )}

      {/* Search and Filter Controls */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          {/* Main Search */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <Input
              placeholder="Search by species, mutation, town, aviary..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-11 pr-10 py-3 text-sm bg-zinc-950 border-zinc-800 focus:border-gold-500 rounded-2xl w-full"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2">
            <Select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-36 sm:w-40 bg-zinc-950 border-zinc-800 text-sm font-medium rounded-xl"
            >
              <option value="All">All Categories</option>
              <option value="Bird">Single Bird</option>
              <option value="Pair">Breeding Pair</option>
              <option value="Accessories">Accessories & Cages</option>
              <option value="Other">Other</option>
            </Select>

            <Select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="w-36 sm:w-40 bg-zinc-950 border-zinc-800 text-sm font-medium rounded-xl"
            >
              <option value="newest">Newest First</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
            </Select>

            <button
              onClick={() => setShowFilterDrawer(!showFilterDrawer)}
              className={cn(
                "p-3 rounded-xl border transition-all flex items-center gap-2 text-sm font-medium",
                showFilterDrawer || onlyVetChecked || selectedBanding !== 'All' || selectedSexing !== 'All' || selectedTown !== 'All'
                  ? "bg-gold-500/10 border-gold-500 text-gold-400"
                  : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
              )}
              title="Advanced Filters"
            >
              <Filter size={16} />
              <span className="hidden md:inline">Filters</span>
              {(onlyVetChecked || selectedBanding !== 'All' || selectedSexing !== 'All' || selectedTown !== 'All' || minPrice || maxPrice) && (
                <span className="w-2 h-2 rounded-full bg-gold-400" />
              )}
            </button>
          </div>
        </div>

        {/* Expandable Advanced Filters */}
        {showFilterDrawer && (
          <div className="p-4 bg-zinc-950/80 border border-zinc-800 rounded-2xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 backdrop-blur-md">
            {/* Species Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400">Species</label>
              <Select
                value={selectedSpecies}
                onChange={e => setSelectedSpecies(e.target.value)}
                className="w-full bg-zinc-900 border-zinc-800 text-sm font-medium"
              >
                <option value="All">All Species</option>
                {availableSpecies.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </div>

            {/* Banding Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400">Banding Status</label>
              <Select
                value={selectedBanding}
                onChange={e => setSelectedBanding(e.target.value)}
                className="w-full bg-zinc-900 border-zinc-800 text-sm font-medium"
              >
                <option value="All">All Banding</option>
                <option value="Closed Ring / Ringed">Closed Ring / Ringed</option>
                <option value="Open Banded">Open Banded</option>
                <option value="Split Ring">Split Ring</option>
                <option value="Non-Banded">Non-Banded</option>
              </Select>
            </div>

            {/* Sexing Method Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400">Sexing Method</label>
              <Select
                value={selectedSexing}
                onChange={e => setSelectedSexing(e.target.value)}
                className="w-full bg-zinc-900 border-zinc-800 text-sm font-medium"
              >
                <option value="All">All Methods</option>
                <option value="DNA Sexed">DNA Sexed</option>
                <option value="Surgically Sexed">Surgically Sexed</option>
                <option value="Visual / Auto-Sexed">Visual / Auto-Sexed</option>
                <option value="Unsexed">Unsexed</option>
              </Select>
            </div>

            {/* Town / Location Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400">Location / Town</label>
              <Select
                value={selectedTown}
                onChange={e => setSelectedTown(e.target.value)}
                className="w-full bg-zinc-900 border-zinc-800 text-sm font-medium"
              >
                <option value="All">All Towns</option>
                {availableTowns.map(town => (
                  <option key={town} value={town}>{town}</option>
                ))}
              </Select>
            </div>

            {/* Price Range */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400">Price Range ({activeCurrencySymbol})</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={e => setMinPrice(e.target.value)}
                  className="w-full text-sm bg-zinc-900 border-zinc-800 py-1.5"
                />
                <span className="text-zinc-600">-</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={e => setMaxPrice(e.target.value)}
                  className="w-full text-sm bg-zinc-900 border-zinc-800 py-1.5"
                />
              </div>
            </div>

            {/* Vet Checked and Clear */}
            <div className="space-y-2 flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer py-1 select-none">
                <input
                  type="checkbox"
                  checked={onlyVetChecked}
                  onChange={e => setOnlyVetChecked(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-gold-500 focus:ring-gold-500/20"
                />
                <span className="text-sm font-medium text-zinc-200">Vet Checked Only</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer py-1 select-none">
                <input
                  type="checkbox"
                  checked={includeSoldAndArchived}
                  onChange={e => setIncludeSoldAndArchived(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-gold-500 focus:ring-gold-500/20"
                />
                <span className="text-sm font-medium text-zinc-400">Show Sold / Inactive</span>
              </label>
              <button
                onClick={() => {
                  setSelectedCategory('All');
                  setSelectedSpecies('All');
                  setSelectedBanding('All');
                  setSelectedSexing('All');
                  setSelectedDelivery('All');
                  setSelectedTown('All');
                  setOnlyVetChecked(false);
                  setIncludeSoldAndArchived(false);
                  setMinPrice('');
                  setMaxPrice('');
                  setSearchQuery('');
                }}
                className="text-xs font-semibold text-zinc-500 hover:text-gold-400 text-left transition-colors"
              >
                Reset All Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Listings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 xl:gap-6">
        {filteredListings.length > 0 ? (
          filteredListings.map(listing => (
            <ListingCard
              key={listing.id}
              listing={listing}
              activeCountryCode={selectedCountryCode}
              activeCurrencySymbol={activeCurrencySymbol}
              activeCurrencyCode={activeCurrencyCode}
              exchangeRates={exchangeRates}
              isOwner={listing.sellerId === user?.uid}
              isAdmin={isAdmin}
              onViewDetails={() => {
                setSelectedListing(listing);
                setIsContactModalOpen(true);
              }}
              onEdit={() => {
                setEditingListing(listing);
                setCreateType(listing.type);
                setIsCreateModalOpen(true);
              }}
              onDelete={() => handleDeleteListing(listing.id)}
              onMarkSold={() => {
                setSelectedListing(listing);
                setIsSoldModalOpen(true);
              }}
            />
          ))
        ) : (
          <div className="col-span-full py-16 text-center bg-zinc-950/40 border border-dashed border-zinc-800 rounded-3xl space-y-4">
            <ShoppingBag size={44} className="mx-auto text-zinc-600" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white">No Listings Found</h3>
              <p className="text-sm text-zinc-400 max-w-sm mx-auto leading-relaxed">
                {searchQuery || selectedCategory !== 'All' 
                  ? "Try clearing your filters or changing your search terms."
                  : activeTab === 'for_sale'
                  ? currentViewCountry 
                    ? `No birds currently listed in ${currentViewCountry.flag} ${currentViewCountry.name}. Be the first vetted breeder to list!`
                    : "No birds currently listed for sale. Be the first vetted breeder to list!"
                  : activeTab === 'wanted'
                  ? currentViewCountry
                    ? `No wanted requests in ${currentViewCountry.flag} ${currentViewCountry.name}. Post what you are searching for!`
                    : "No wanted requests at the moment. Post what you are searching for!"
                  : "You have not published any listings yet."}
              </p>
            </div>
            {activeTab !== 'my_listings' && (
              <Button
                onClick={() => handleOpenCreate(activeTab === 'wanted' ? 'wanted' : 'for_sale')}
                className="text-sm font-semibold bg-gold-500 text-black hover:bg-gold-400 mt-2"
              >
                <Plus size={16} className="mr-1.5" />
                {activeTab === 'wanted' ? 'Post Wanted Request' : 'List Bird / Pair For Sale'}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Persistent Bottom Action to Create Post */}
      {activeTab !== 'my_listings' && filteredListings.length > 0 && (
        <div className="flex justify-center pt-8 pb-4">
          <Button
            onClick={() => handleOpenCreate(activeTab === 'wanted' ? 'wanted' : 'for_sale')}
            className="text-sm font-semibold bg-gold-500 text-black hover:bg-gold-400 py-3 px-8 rounded-xl shadow-lg shadow-gold-500/20 transition-transform active:scale-95"
          >
            <Plus size={16} className="mr-1.5" />
            {activeTab === 'wanted' ? 'Post Wanted Request' : 'List Bird / Pair For Sale'}
          </Button>
        </div>
      )}

      {/* Seller Profile Verification Modal */}
      {isSellerProfileModalOpen && (
        <SellerProfileModal
          user={user}
          existingProfile={myProfile}
          isAdmin={isAdmin}
          onOpenDidit={() => {
            setIsSellerProfileModalOpen(false);
            setIsDiditModalOpen(true);
          }}
          onClose={() => setIsSellerProfileModalOpen(false)}
        />
      )}

      {/* Didit Automated Identity Verification Modal */}
      {isDiditModalOpen && (
        <DiditVerificationModal
          user={user}
          sellerProfile={myProfile}
          isOpen={isDiditModalOpen}
          onClose={() => setIsDiditModalOpen(false)}
          onSuccess={() => {
            setIsDiditModalOpen(false);
          }}
        />
      )}

      {/* Create / Edit Listing Modal */}
      {isCreateModalOpen && (
        <ListingFormModal
          user={user}
          sellerProfile={myProfile}
          type={createType}
          initialData={editingListing}
          birds={birds}
          pairs={pairs}
          currencySymbol={activeCurrencySymbol}
          userSettings={userSettings}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingListing(null);
          }}
        />
      )}

      {/* Contact Seller & Listing Details Modal */}
      {isContactModalOpen && selectedListing && (
        <ListingDetailModal
          listing={selectedListing}
          activeCountryCode={selectedCountryCode}
          activeCurrencySymbol={activeCurrencySymbol}
          activeCurrencyCode={activeCurrencyCode}
          exchangeRates={exchangeRates}
          currentUserId={user?.uid}
          reviews={reviews.filter(r => r.sellerId === selectedListing.sellerId && r.status === 'approved')}
          onClose={() => {
            setIsContactModalOpen(false);
            setSelectedListing(null);
          }}
          onLeaveReview={() => {
            setIsContactModalOpen(false);
            setIsReviewModalOpen(true);
          }}
        />
      )}

      {/* Mark Sold Modal */}
      {isSoldModalOpen && selectedListing && (
        <MarkSoldModal
          listing={selectedListing}
          onClose={() => {
            setIsSoldModalOpen(false);
            setSelectedListing(null);
          }}
        />
      )}

      {/* Review Modal */}
      {isReviewModalOpen && selectedListing && (
        <ReviewModal
          listing={selectedListing}
          currentUser={user}
          onClose={() => {
            setIsReviewModalOpen(false);
            setSelectedListing(null);
          }}
        />
      )}
    </div>
  );
}

// --- Listing Card Component ---
function ListingCard({
  listing,
  activeCountryCode,
  activeCurrencySymbol,
  activeCurrencyCode,
  exchangeRates,
  isOwner,
  isAdmin,
  onViewDetails,
  onEdit,
  onDelete,
  onMarkSold
}: {
  listing: MarketplaceListing;
  activeCountryCode?: string;
  activeCurrencySymbol: string;
  activeCurrencyCode: string;
  exchangeRates?: Record<string, number> | null;
  isOwner: boolean;
  isAdmin: boolean;
  onViewDetails: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMarkSold: () => void;
}) {
  const isForSale = listing.type === 'for_sale';
  const isSold = listing.status === 'sold';
  const coverImage = listing.imageUrls?.[0] || null;

  const listingCountry = getCountryMarketplace(listing.countryCode || listing.country || 'South Africa');
  const nativeCurrencySymbol = listing.currency || listingCountry.currencySymbol || 'R';
  const nativeCurrencyCode = listing.currencyCode || listingCountry.currencyCode || 'ZAR';

  // Calculate approximate price conversion if listing currency != active view currency
  const showConvertedPrice = activeCurrencyCode && nativeCurrencyCode !== activeCurrencyCode && exchangeRates && exchangeRates[activeCurrencyCode] && exchangeRates[nativeCurrencyCode];
  const convertedPrice = showConvertedPrice 
    ? convertPrice(listing.price || 0, nativeCurrencyCode, activeCurrencyCode, exchangeRates)
    : null;

  return (
    <Card 
      onClick={onViewDetails}
      className={cn(
        "group relative overflow-hidden transition-all duration-300 border-zinc-800 hover:border-gold-500/50 bg-zinc-950/80 cursor-pointer flex flex-col justify-between hover:shadow-xl hover:shadow-gold-500/5",
        isSold && "opacity-80"
      )}
    >
      {/* Top Media / Thumbnail */}
      <div className="relative aspect-[16/10] bg-zinc-900 overflow-hidden">
        {coverImage ? (
          <img
            src={coverImage}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700 bg-gradient-to-b from-zinc-900 to-black">
            <BirdIcon size={40} className="mb-2 text-zinc-600" />
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              {listing.category}
            </span>
          </div>
        )}

        {/* Sold Overlay */}
        {isSold && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-xs">
            <span className="text-xl font-bold uppercase tracking-widest px-4 py-2 bg-rose-600 text-white rounded-xl shadow-xl transform -rotate-6">
              SOLD
            </span>
          </div>
        )}

        {/* Badges on Image */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 items-center">
          <span className={cn(
            "text-xs font-semibold px-2 py-0.5 rounded-md shadow-md backdrop-blur-md",
            isForSale ? "bg-emerald-500/90 text-black font-bold" : "bg-amber-500/90 text-black font-bold"
          )}>
            {isForSale ? 'For Sale' : 'Wanted'}
          </span>
          <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-black/70 text-white border border-white/10 backdrop-blur-md">
            {listing.category}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-md bg-zinc-900/90 text-zinc-200 border border-zinc-700/80 backdrop-blur-md flex items-center gap-1 font-semibold">
            <span>{listingCountry.flag}</span>
            <span>{listingCountry.code}</span>
          </span>
        </div>

        {/* Price Tag */}
        <div className="absolute bottom-3 right-3 bg-black/85 border border-white/10 rounded-xl px-3 py-1.5 backdrop-blur-md text-right shadow-lg">
          <p className="text-[10px] font-medium text-zinc-400">
            {listing.type === 'wanted' ? 'Budget' : 'Price'} ({nativeCurrencyCode})
          </p>
          <p className="text-base font-bold text-gold-400 leading-none mt-0.5">
            {nativeCurrencySymbol}{listing.price?.toLocaleString()}
            {listing.priceMax ? ` - ${nativeCurrencySymbol}${listing.priceMax.toLocaleString()}` : ''}
          </p>
          {convertedPrice !== null && (
            <p className="text-[10px] font-semibold text-zinc-300 mt-0.5">
              ≈ {activeCurrencySymbol}{convertedPrice.toLocaleString()} {activeCurrencyCode}
            </p>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          {/* Title & Species */}
          <div>
            <h3 className="text-base font-semibold text-white group-hover:text-gold-400 transition-colors line-clamp-1">
              {listing.title}
            </h3>
            {listing.species && (
              <p className="text-xs font-medium text-zinc-400 truncate">
                {listing.species} {listing.subSpecies ? `• ${listing.subSpecies}` : ''}
              </p>
            )}
          </div>

          {/* Key Attributes Pills */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {listing.sex && (
              <span className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-md border",
                listing.sex === 'Male' ? "bg-blue-500/10 border-blue-500/30 text-blue-400" :
                listing.sex === 'Female' ? "bg-rose-500/10 border-rose-500/30 text-rose-400" :
                listing.sex === 'Pair' ? "bg-purple-500/10 border-purple-500/30 text-purple-400" :
                "bg-zinc-800 border-zinc-700 text-zinc-300"
              )}>
                {listing.sex}
              </span>
            )}

            {listing.sexingMethod && listing.sexingMethod !== 'Unsexed' && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/30 text-purple-300">
                {listing.sexingMethod}
              </span>
            )}

            {listing.bandingStatus && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300">
                {listing.bandingStatus}
              </span>
            )}

            {listing.allowOffers && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-gold-500/10 border border-gold-500/30 text-gold-400 flex items-center gap-1">
                <Tag size={11} /> Offers Welcome
              </span>
            )}

            {listing.ageYear && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300">
                {listing.ageYear}
              </span>
            )}

            {listing.vetChecked && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                <Check size={12} /> Vet Checked
              </span>
            )}
          </div>

          {/* Mutations list */}
          {listing.mutations && listing.mutations.length > 0 && (
            <div className="text-xs text-zinc-400 line-clamp-1 mt-2">
              <strong className="text-zinc-300 font-medium">Mutations:</strong> {listing.mutations.join(', ')}
            </div>
          )}
        </div>

        {/* Footer: Seller & Location Info */}
        <div className="pt-3 border-t border-zinc-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-zinc-300 truncate mr-2">
              <span className="text-base shrink-0">{listingCountry.flag}</span>
              <span className="font-medium truncate">{listing.locationTown || listing.sellerTown || listingCountry.name}</span>
            </div>
            
            <div className="flex items-center gap-1 text-emerald-400 shrink-0">
              <ShieldCheck size={14} />
              <span className="font-semibold text-xs">Vetted Breeder</span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-zinc-500 font-medium">
              {listing.sellerAviary || listing.sellerName}
            </span>

            {/* Action Buttons for Owner / Admin */}
            {(isOwner || isAdmin) && (
              <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                {isOwner && !isSold && (
                  <button
                    onClick={onMarkSold}
                    className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-md text-xs font-semibold transition-colors"
                  >
                    Mark Sold
                  </button>
                )}
                <button
                  onClick={onEdit}
                  className="p-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-md transition-colors"
                  title="Edit Listing"
                >
                  <Edit2 size={12} />
                </button>
                <button
                  onClick={onDelete}
                  className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-md transition-colors"
                  title="Delete Listing"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

// --- Seller Profile Modal ---
function SellerProfileModal({
  user,
  existingProfile,
  isAdmin,
  onOpenDidit,
  onClose
}: {
  user: any;
  existingProfile: SellerProfile | null;
  isAdmin: boolean;
  onOpenDidit?: () => void;
  onClose: () => void;
}) {
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

  const saveProfileData = async (targetStatus?: 'pending' | 'approved') => {
    if (!formData.sellerName.trim() || !formData.town.trim() || !formData.whatsapp.trim()) {
      toast.error('Seller Name, Location/Town, and WhatsApp number are required!');
      return false;
    }

    const sanitizedWhatsApp = sanitizePhoneNumber(formData.whatsapp);
    const sanitizedPhone = formData.phone ? sanitizePhoneNumber(formData.phone) : '';

    if (!isValidPhoneNumber(sanitizedWhatsApp)) {
      toast.error('Please enter a valid WhatsApp phone number with at least 9 digits.');
      return false;
    }

    const payload: any = {
      ...formData,
      country: currentCountryConfig.name,
      countryCode: currentCountryConfig.code,
      currencyCode: currentCountryConfig.currencyCode,
      whatsapp: sanitizedWhatsApp,
      phone: sanitizedPhone
    };

    if (targetStatus) {
      payload.status = targetStatus;
    }

    if (existingProfile?.id) {
      await updateDoc(doc(db, 'sellerProfiles', existingProfile.id), {
        ...payload,
        updatedAt: new Date().toISOString()
      });
    } else {
      await addDoc(collection(db, 'sellerProfiles'), {
        ...payload,
        uid: user?.uid,
        status: targetStatus || 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const ok = await saveProfileData();
      if (ok) {
        toast.success(existingProfile ? 'Seller profile updated successfully' : 'Profile submitted for Admin verification!');
        onClose();
      }
    } catch (err: any) {
      toast.error('Failed to save profile: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartDiditVerification = async () => {
    setIsSaving(true);
    try {
      const ok = await saveProfileData();
      if (ok && onOpenDidit) {
        onOpenDidit();
      }
    } catch (err: any) {
      toast.error('Failed to save profile before verification: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const previewWhatsAppUrl = formData.whatsapp ? buildWhatsAppLink(formData.whatsapp, 'Hello from The Averian marketplace!') : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-400">
              <Award size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                {existingProfile ? 'Breeder Seller Profile' : 'Register Seller Profile'}
              </h3>
              <p className="text-xs text-zinc-400 font-medium">
                Automated Didit AI Verification or Admin Review
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>

        {/* Status Alert if existing */}
        {existingProfile && (
          <div className={cn(
            "p-4 rounded-2xl border space-y-2 text-sm",
            existingProfile.status === 'approved' 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : existingProfile.status === 'pending'
              ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {existingProfile.status === 'approved' ? (
                  <ShieldCheck size={20} className="shrink-0 text-emerald-400" />
                ) : existingProfile.status === 'pending' ? (
                  <Clock size={20} className="shrink-0 text-amber-400" />
                ) : (
                  <AlertTriangle size={20} className="shrink-0 text-rose-400" />
                )}
                <div>
                  <p className="font-bold text-sm">
                    Status: {existingProfile.status.charAt(0).toUpperCase() + existingProfile.status.slice(1)}
                  </p>
                  <p className="text-xs opacity-80">
                    {existingProfile.status === 'approved'
                      ? existingProfile.verificationMethod === 'didit'
                        ? '⚡ Verified via Didit AI KYC (Automated Biometrics & ID Check)'
                        : '🛡️ Verified via Averian Admin Review'
                      : existingProfile.status === 'pending'
                      ? 'Awaiting review. Choose instant Didit AI verification below for immediate approval.'
                      : `Reason: ${existingProfile.rejectionReason || 'Please review and update your information.'}`}
                  </p>
                </div>
              </div>
              {existingProfile.status === 'approved' && existingProfile.verificationMethod === 'didit' && (
                <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-md">
                  Didit KYC
                </span>
              )}
            </div>

            {/* Quick Didit Verification Trigger if Pending */}
            {existingProfile.status === 'pending' && onOpenDidit && (
              <div className="pt-2 border-t border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-2">
                <p className="text-xs text-amber-200/90 font-medium">
                  ⚡ Want instant approval? Skip the queue with instant verification:
                </p>
                <Button
                  type="button"
                  onClick={handleStartDiditVerification}
                  className="text-xs py-1.5 px-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-md shrink-0"
                >
                  <Sparkles size={13} className="mr-1" />
                  Verify Identity Instantly
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Country Marketplace Assignment Box */}
        <div className="p-3 bg-gold-500/10 border border-gold-500/30 rounded-2xl flex items-center gap-3">
          <span className="text-2xl shrink-0">{currentCountryConfig.flag}</span>
          <div className="text-xs">
            <p className="font-bold text-white">
              {currentCountryConfig.flag} {currentCountryConfig.name} Marketplace ({currentCountryConfig.currencyCode} {currentCountryConfig.currencySymbol})
            </p>
            <p className="text-zinc-400 mt-0.5">
              Your breeder listings and sales will be hosted in the <strong>{currentCountryConfig.name}</strong> marketplace with prices set in <strong>{currentCountryConfig.currencyCode}</strong>.
            </p>
          </div>
        </div>

        {/* Automated Didit.me KYC Promo Box for new or unverified sellers */}
        {(!existingProfile || existingProfile.status !== 'approved') && onOpenDidit && (
          <div className="p-3.5 bg-gradient-to-r from-blue-950/40 via-cyan-950/30 to-zinc-900 border border-cyan-500/30 rounded-2xl flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded">
                  Instant KYC
                </span>
                <p className="text-xs font-bold text-white">Instant Automated Identity Verification</p>
              </div>
              <p className="text-[11px] text-zinc-400">
                Automated 1-minute ID & biometric check. Instant vetted breeder badge.
              </p>
            </div>
            <Button
              type="button"
              onClick={handleStartDiditVerification}
              disabled={isSaving}
              className="text-xs font-black py-2 px-3 bg-cyan-500 text-black hover:bg-cyan-400 rounded-xl shrink-0 shadow-lg shadow-cyan-500/20"
            >
              <Zap size={14} className="mr-1 fill-black" />
              Verify Now
            </Button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
          {/* Country Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Country / Marketplace Region *</label>
            <Select
              value={formData.countryCode}
              onChange={e => handleCountryChange(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-sm font-semibold text-white w-full"
            >
              {SUPPORTED_COUNTRY_MARKETPLACES.map(c => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name} — Currency: {c.currencyCode} ({c.currencySymbol})
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Breeder Name *</label>
              <Input
                required
                value={formData.sellerName}
                onChange={e => setFormData({ ...formData, sellerName: e.target.value })}
                placeholder="e.g. John Doe"
                className="bg-zinc-900 border-zinc-800 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Aviary / Stud Name</label>
              <Input
                value={formData.aviaryName}
                onChange={e => setFormData({ ...formData, aviaryName: e.target.value })}
                placeholder="e.g. Sunbird Aviaries"
                className="bg-zinc-900 border-zinc-800 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Location / Town *</label>
              <Input
                required
                value={formData.town}
                onChange={e => setFormData({ ...formData, town: e.target.value })}
                placeholder="e.g. Pretoria, Austin, London"
                className="bg-zinc-900 border-zinc-800 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Province / State / Region</label>
              {currentCountryConfig.regions && currentCountryConfig.regions.length > 0 ? (
                <Select
                  value={formData.provinceState}
                  onChange={e => setFormData({ ...formData, provinceState: e.target.value })}
                  className="bg-zinc-900 border-zinc-800 text-sm"
                >
                  <option value="">Select State/Region</option>
                  {currentCountryConfig.regions.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </Select>
              ) : (
                <Input
                  value={formData.provinceState}
                  onChange={e => setFormData({ ...formData, provinceState: e.target.value })}
                  placeholder="e.g. Gauteng, Texas"
                  className="bg-zinc-900 border-zinc-800 text-sm"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-400">WhatsApp Number *</label>
                {previewWhatsAppUrl && (
                  <a
                    href={previewWhatsAppUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                    title="Verify that WhatsApp opens your chat"
                  >
                    <MessageCircle size={10} /> Test Chat
                  </a>
                )}
              </div>
              <Input
                required
                value={formData.whatsapp}
                onChange={e => setFormData({ ...formData, whatsapp: e.target.value })}
                onBlur={() => {
                  if (formData.whatsapp) {
                    setFormData(prev => ({ ...prev, whatsapp: sanitizePhoneNumber(prev.whatsapp) }));
                  }
                }}
                placeholder={currentCountryConfig.phonePlaceholder || (currentCountryConfig.phonePrefix ? `e.g. ${currentCountryConfig.phonePrefix}...` : 'e.g. +27...')}
                className="bg-zinc-900 border-zinc-800 text-sm"
              />
              <p className="text-[10px] text-zinc-500">
                Include country code (e.g. {currentCountryConfig.phonePrefix || '+27'}...)
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Contact Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="breeder@example.com"
                className="bg-zinc-900 border-zinc-800 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Aviary Bio & Specialties</label>
            <Textarea
              value={formData.bio}
              onChange={e => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell buyers about your birds, breeding experience, bloodlines..."
              className="bg-zinc-900 border-zinc-800 text-sm min-h-[90px]"
            />
          </div>

          <div className="p-4 bg-zinc-900/60 rounded-xl border border-zinc-800 text-xs text-zinc-400 space-y-2">
            <p className="font-semibold text-white">Verification & Community Safety</p>
            <p className="leading-relaxed">
              To protect buyers and ensure authentic aviary representation, all sellers must complete identity verification via <strong className="text-cyan-400">automated biometric ID verification</strong> or pass manual <strong className="text-gold-400">Admin review</strong>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-zinc-800">
            <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto text-sm font-semibold">
              Cancel
            </Button>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button 
                type="submit" 
                disabled={isSaving} 
                className="flex-1 sm:flex-initial text-xs font-bold bg-gold-500 text-black hover:bg-gold-400 py-2.5 px-4"
              >
                {isSaving ? 'Submitting...' : existingProfile ? 'Save & Request Admin Review' : 'Submit for Admin Review'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Listing Creation & Edit Form Modal ---
function ListingFormModal({
  user,
  sellerProfile,
  type,
  initialData,
  birds,
  pairs,
  currencySymbol,
  userSettings,
  onClose
}: {
  user: any;
  sellerProfile: SellerProfile | null;
  type: 'for_sale' | 'wanted';
  initialData?: MarketplaceListing | null;
  birds: Bird[];
  pairs: Pair[];
  currencySymbol: string;
  userSettings: UserSettings | null;
  onClose: () => void;
}) {
  const sellerCountry = useMemo(() => {
    return getCountryMarketplace(sellerProfile?.countryCode || sellerProfile?.country || 'South Africa');
  }, [sellerProfile]);

  const [formData, setFormData] = useState<Partial<MarketplaceListing>>(initialData ? { ...initialData } : {
    type,
    category: 'Bird',
    title: '',
    description: '',
    species: '',
    subSpecies: '',
    mutations: [],
    splitMutations: [],
    sex: 'Male',
    sexingMethod: 'DNA Sexed',
    bandingStatus: 'Closed Ring / Ringed',
    ageYear: '2024 Hatch',
    vetChecked: false,
    price: 0,
    priceMax: 0,
    currency: sellerCountry.currencySymbol,
    currencyCode: sellerCountry.currencyCode,
    country: sellerCountry.name,
    countryCode: sellerCountry.code,
    locationTown: sellerProfile?.town || '',
    provinceState: sellerProfile?.provinceState || '',
    deliveryOption: 'Collection or Courier',
    imageUrls: [],
    allowOffers: true
  });

  const [selectedBirdId, setSelectedBirdId] = useState('');
  const [selectedPairId, setSelectedPairId] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Species, Sub-Species & Mutations management
  const [isCustomSpecies, setIsCustomSpecies] = useState(false);
  const [isCustomSubSpecies, setIsCustomSubSpecies] = useState(false);
  const [mutationSearch, setMutationSearch] = useState('');
  const [customMutationInput, setCustomMutationInput] = useState('');

  const allSpeciesList = useMemo(() => {
    const custom = (userSettings?.species || []).map(s => ({
      id: s.id,
      name: s.name,
      subspecies: (userSettings?.subspecies || []).filter(sub => sub.speciesId === s.id).map(sub => ({ id: sub.id, name: sub.name }))
    }));
    const defaultList = defaultSpecies.map(ds => ({
      id: ds.id,
      name: ds.name,
      subspecies: ds.subspecies || []
    }));
    const map = new Map<string, { id: string; name: string; subspecies: { id: string; name: string }[] }>();
    defaultList.forEach(s => map.set(s.name.toLowerCase(), s));
    custom.forEach(s => map.set(s.name.toLowerCase(), s));
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [userSettings]);

  const currentSpeciesObj = useMemo(() => {
    if (!formData.species) return null;
    return allSpeciesList.find(s => s.name.toLowerCase() === formData.species?.toLowerCase()) || null;
  }, [allSpeciesList, formData.species]);

  const availableSubspecies = useMemo(() => {
    return currentSpeciesObj?.subspecies || [];
  }, [currentSpeciesObj]);

  const allMutationsList = useMemo(() => {
    const custom = (userSettings?.mutations || []).map(m => m.name);
    const defaults = defaultMutations.map(m => m.name);
    const set = new Set([...defaults, ...custom]);
    return Array.from(set).sort();
  }, [userSettings]);

  const filteredMutations = useMemo(() => {
    if (!mutationSearch.trim()) return allMutationsList;
    const q = mutationSearch.toLowerCase();
    return allMutationsList.filter(m => m.toLowerCase().includes(q));
  }, [allMutationsList, mutationSearch]);

  const toggleMutation = (mName: string) => {
    setFormData(prev => {
      const current = prev.mutations || [];
      if (current.includes(mName)) {
        return { ...prev, mutations: current.filter(m => m !== mName) };
      } else {
        return { ...prev, mutations: [...current, mName] };
      }
    });
  };

  const addCustomMutation = () => {
    if (!customMutationInput.trim()) return;
    const trimmed = customMutationInput.trim();
    if (!formData.mutations?.includes(trimmed)) {
      setFormData(prev => ({
        ...prev,
        mutations: [...(prev.mutations || []), trimmed]
      }));
    }
    setCustomMutationInput('');
  };

  // Quick Select Bird Handler
  const handleSelectBird = (birdId: string) => {
    setSelectedBirdId(birdId);
    const b = birds.find(x => x.id === birdId);
    if (b) {
      setFormData(prev => ({
        ...prev,
        birdId: b.id,
        title: `${b.species} - ${b.name}`,
        species: b.species,
        subSpecies: b.subSpecies || '',
        mutations: b.mutations || [],
        splitMutations: b.splitMutations || [],
        sex: b.sex === 'Male' ? 'Male' : b.sex === 'Female' ? 'Female' : 'Unsexed',
        sexingMethod: b.sexingMethod || 'DNA Sexed',
        bandingStatus: b.bandingStatus || 'Closed Ring / Ringed',
        ageYear: b.ageYear || (b.birthDate ? format(new Date(b.birthDate), 'yyyy Hatch') : '1 Year'),
        vetChecked: b.vetChecked || false,
        price: b.estimatedValue || b.purchasePrice || 0,
        imageUrls: b.imageUrls || (b.imageUrl ? [b.imageUrl] : []),
        allowOffers: true
      }));
    }
  };

  // Quick Select Pair Handler
  const handleSelectPair = (pairId: string) => {
    setSelectedPairId(pairId);
    const p = pairs.find(x => x.id === pairId);
    if (p) {
      const male = birds.find(b => b.id === p.maleId);
      const female = birds.find(b => b.id === p.femaleId);
      setFormData(prev => ({
        ...prev,
        pairId: p.id,
        category: 'Pair',
        title: `Breeding Pair: ${male?.name || 'Sire'} × ${female?.name || 'Dam'}`,
        species: male?.species || female?.species || '',
        sex: 'Pair',
        sexingMethod: 'DNA Sexed',
        bandingStatus: 'Closed Ring / Ringed',
        ageYear: 'Breeding Age',
        price: (male?.estimatedValue || 0) + (female?.estimatedValue || 0),
        imageUrls: p.imageUrls || (male?.imageUrl ? [male.imageUrl] : []),
        allowOffers: true
      }));
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);

  const processFiles = async (filesList: FileList | File[]) => {
    const rawFiles = Array.from(filesList);
    if (rawFiles.length === 0) return;

    // Be lenient with MIME types: some mobile devices / cameras report empty string or application/octet-stream
    const files = rawFiles.filter(f => {
      if (!f) return false;
      if (f.type && f.type.startsWith('image/')) return true;
      const name = (f.name || '').toLowerCase();
      return (
        name.endsWith('.jpg') ||
        name.endsWith('.jpeg') ||
        name.endsWith('.png') ||
        name.endsWith('.webp') ||
        name.endsWith('.heic') ||
        name.endsWith('.heif') ||
        name.endsWith('.jfif') ||
        name.endsWith('.gif') ||
        name.endsWith('.bmp') ||
        f.size > 0
      );
    });

    if (files.length === 0) {
      toast.error('Please select valid image files.');
      return;
    }

    setIsUploading(true);
    setUploadStatusText(`Preparing ${files.length} photo(s)...`);

    try {
      const urls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadStatusText(`Uploading photo ${i + 1} of ${files.length}...`);
        const url = await compressAndUploadImage(file, `marketplace/${user?.uid || 'general'}`);
        if (url) {
          urls.push(url);
        }
      }

      if (urls.length > 0) {
        setFormData(prev => ({
          ...prev,
          imageUrls: [...(prev.imageUrls || []), ...urls]
        }));
        toast.success(`${urls.length} photo(s) added successfully!`);
      }
    } catch (err: any) {
      console.error("Marketplace upload error:", err);
      toast.error('Image upload failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsUploading(false);
      setUploadStatusText('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const handleAddUrlImage = () => {
    if (!urlInput.trim()) return;
    const url = urlInput.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:image/')) {
      toast.error('Please enter a valid image URL (e.g. starting with https://)');
      return;
    }
    setFormData(prev => ({
      ...prev,
      imageUrls: [...(prev.imageUrls || []), url]
    }));
    setUrlInput('');
    setShowUrlInput(false);
    toast.success('Photo added from link!');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim() || !formData.locationTown?.trim()) {
      toast.error('Title and Location/Town are required!');
      return;
    }
    if (!formData.price && type === 'for_sale') {
      toast.error('Please specify a price!');
      return;
    }

    setIsSaving(true);
    try {
      const listingData: Partial<MarketplaceListing> = {
        ...formData,
        sellerId: user?.uid,
        sellerName: sellerProfile?.sellerName || user?.displayName || 'Breeder',
        sellerAviary: sellerProfile?.aviaryName || '',
        sellerTown: formData.locationTown || sellerProfile?.town || '',
        sellerPhone: sellerProfile?.phone || '',
        sellerWhatsApp: sellerProfile?.whatsapp || '',
        sellerEmail: sellerProfile?.email || user?.email || '',
        country: sellerCountry.name,
        countryCode: sellerCountry.code,
        currency: sellerCountry.currencySymbol,
        currencyCode: sellerCountry.currencyCode,
        allowOffers: formData.allowOffers !== false,
        status: 'active',
        updatedAt: new Date().toISOString()
      };

      if (initialData?.id) {
        await updateDoc(doc(db, 'marketplaceListings', initialData.id), listingData);
        toast.success('Listing updated successfully!');
      } else {
        listingData.createdAt = new Date().toISOString();
        await addDoc(collection(db, 'marketplaceListings'), listingData);
        toast.success('Listing published to Classifieds!');
      }
      onClose();
    } catch (err: any) {
      toast.error('Failed to save listing: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-400">
              <ShoppingBag size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                {initialData ? 'Edit Listing' : type === 'for_sale' ? 'Post Bird / Pair For Sale' : 'Post Wanted Ad'}
              </h3>
              <p className="text-xs text-zinc-400 font-medium flex items-center gap-1.5 mt-0.5">
                <span>{sellerCountry.flag}</span>
                <span>Vetted Breeder: {sellerProfile?.sellerName} ({sellerProfile?.town || sellerCountry.name})</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>

        {/* Verified Country Scope Notice */}
        <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{sellerCountry.flag}</span>
            <div>
              <p className="font-bold text-white">
                {sellerCountry.name} Marketplace ({sellerCountry.currencyCode} {sellerCountry.currencySymbol})
              </p>
              <p className="text-zinc-400 text-[11px]">
                Your listing will be published in the {sellerCountry.name} country view with prices in {sellerCountry.currencyCode}.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-gold-500/20 text-gold-300 border border-gold-500/30 rounded-md shrink-0">
            {sellerCountry.code}
          </span>
        </div>

        {/* Quick Inventory Import Bar */}
        {!initialData && (
          <div className="p-3.5 bg-zinc-900/70 rounded-xl border border-zinc-800 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-semibold text-gold-400 flex items-center gap-1.5">
              <BirdIcon size={16} /> Quick Select from My Aviary:
            </span>
            <div className="flex items-center gap-3">
              <Select
                value={selectedBirdId}
                onChange={e => handleSelectBird(e.target.value)}
                className="text-sm bg-zinc-950 border-zinc-700 py-1.5 min-w-[150px] max-w-[200px]"
              >
                <option value="">Select Bird...</option>
                {birds.filter(b => !b.statuses?.some(s => s.toLowerCase() === 'sold' || s.toLowerCase() === 'deceased')).map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({b.species})</option>
                ))}
              </Select>

              <Select
                value={selectedPairId}
                onChange={e => handleSelectPair(e.target.value)}
                className="text-sm bg-zinc-950 border-zinc-700 py-1.5 min-w-[150px] max-w-[200px]"
              >
                <option value="">Select Pair...</option>
                {pairs.map(p => (
                  <option key={p.id} value={p.id}>Pair #{p.id.slice(0, 5)}</option>
                ))}
              </Select>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 max-h-[62vh] overflow-y-auto pr-2">
          {/* Title & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-8 space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Listing Title *</label>
              <Input
                required
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder={type === 'wanted' ? "e.g. Wanted: Pair of Red-Fronted Conures" : "e.g. 2024 Closed Ring Green Cheek Conure (DNA Male)"}
                className="bg-zinc-900 border-zinc-800 text-sm"
              />
            </div>

            <div className="sm:col-span-4 space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Category</label>
              <Select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                className="bg-zinc-900 border-zinc-800 text-sm"
              >
                <option value="Bird">Single Bird</option>
                <option value="Pair">Breeding Pair</option>
                <option value="Accessories">Accessories & Cages</option>
                <option value="Other">Other</option>
              </Select>
            </div>
          </div>

          {/* Species & Sub-Species Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 bg-zinc-900/40 rounded-2xl border border-zinc-800/80">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-300">Species</label>
                <button
                  type="button"
                  onClick={() => setIsCustomSpecies(!isCustomSpecies)}
                  className="text-[11px] text-gold-400 hover:underline"
                >
                  {isCustomSpecies ? 'Choose from list' : '+ Custom Species'}
                </button>
              </div>

              {isCustomSpecies ? (
                <Input
                  value={formData.species || ''}
                  onChange={e => setFormData({ ...formData, species: e.target.value, subSpecies: '' })}
                  placeholder="Type custom species name..."
                  className="bg-zinc-900 border-zinc-800 text-sm"
                />
              ) : (
                <Select
                  value={formData.species || ''}
                  onChange={e => {
                    setFormData({ ...formData, species: e.target.value, subSpecies: '' });
                  }}
                  className="bg-zinc-900 border-zinc-800 text-sm"
                >
                  <option value="">Select Species...</option>
                  {allSpeciesList.map(s => (
                    <option key={s.id || s.name} value={s.name}>{s.name}</option>
                  ))}
                </Select>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-300">Sub-Species</label>
                <button
                  type="button"
                  onClick={() => setIsCustomSubSpecies(!isCustomSubSpecies)}
                  className="text-[11px] text-gold-400 hover:underline"
                >
                  {isCustomSubSpecies ? 'Choose from list' : '+ Custom Sub-species'}
                </button>
              </div>

              {isCustomSubSpecies || availableSubspecies.length === 0 ? (
                <Input
                  value={formData.subSpecies || ''}
                  onChange={e => setFormData({ ...formData, subSpecies: e.target.value })}
                  placeholder={availableSubspecies.length === 0 ? "Type sub-species (optional)" : "Type custom sub-species..."}
                  className="bg-zinc-900 border-zinc-800 text-sm"
                />
              ) : (
                <Select
                  value={formData.subSpecies || ''}
                  onChange={e => setFormData({ ...formData, subSpecies: e.target.value })}
                  className="bg-zinc-900 border-zinc-800 text-sm"
                >
                  <option value="">Select Sub-Species (Optional)...</option>
                  {availableSubspecies.map(sub => (
                    <option key={sub.id || sub.name} value={sub.name}>{sub.name}</option>
                  ))}
                </Select>
              )}
            </div>
          </div>

          {/* Mutations Selection */}
          <div className="space-y-2 p-3.5 bg-zinc-900/40 rounded-2xl border border-zinc-800/80">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-300">
                Mutations & Color Variations ({formData.mutations?.length || 0} selected)
              </label>
              {formData.mutations && formData.mutations.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, mutations: [] })}
                  className="text-[11px] text-rose-400 hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Selected Mutations Chips */}
            {formData.mutations && formData.mutations.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {formData.mutations.map(m => (
                  <span
                    key={m}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gold-500/20 text-gold-300 border border-gold-500/40"
                  >
                    {m}
                    <button
                      type="button"
                      onClick={() => toggleMutation(m)}
                      className="hover:text-white"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Search & Select Mutations */}
            <div className="flex gap-2 pt-1">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <Input
                  value={mutationSearch}
                  onChange={e => setMutationSearch(e.target.value)}
                  placeholder="Search mutations (e.g. Opaline, Cinnamon, Turquoise)..."
                  className="pl-8 bg-zinc-900 border-zinc-800 text-xs py-1.5"
                />
              </div>
              <div className="flex gap-1.5">
                <Input
                  value={customMutationInput}
                  onChange={e => setCustomMutationInput(e.target.value)}
                  placeholder="Custom mutation..."
                  className="bg-zinc-900 border-zinc-800 text-xs py-1.5 max-w-[140px]"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomMutation();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={addCustomMutation}
                  className="px-2.5 py-1 text-xs"
                >
                  Add
                </Button>
              </div>
            </div>

            {/* Scrollable Mutation Checkbox Chips */}
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-zinc-950/80 rounded-xl border border-zinc-800">
              {filteredMutations.map(m => {
                const isSelected = formData.mutations?.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleMutation(m)}
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5",
                      isSelected
                        ? "bg-gold-500 text-black font-semibold border-gold-500 shadow-sm"
                        : "bg-zinc-900/90 text-zinc-300 border-zinc-800 hover:border-zinc-700"
                    )}
                  >
                    {isSelected && <Check size={12} />}
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sex, Sexing, Age */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Sex</label>
              <Select
                value={formData.sex}
                onChange={e => setFormData({ ...formData, sex: e.target.value as any })}
                className="bg-zinc-900 border-zinc-800 text-sm"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Pair">Pair (1M + 1F)</option>
                <option value="Unsexed">Unsexed</option>
                <option value="Any">Any Sex (Wanted)</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Sexing Method</label>
              <Select
                value={formData.sexingMethod}
                onChange={e => setFormData({ ...formData, sexingMethod: e.target.value as any })}
                className="bg-zinc-900 border-zinc-800 text-sm"
              >
                <option value="DNA Sexed">DNA Sexed</option>
                <option value="Surgically Sexed">Surgically Sexed</option>
                <option value="Visual / Auto-Sexed">Visual / Auto-Sexed</option>
                <option value="Unsexed">Unsexed</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Age / Year</label>
              <Input
                value={formData.ageYear}
                onChange={e => setFormData({ ...formData, ageYear: e.target.value })}
                placeholder="e.g. 2024 Hatch, 18 Months"
                className="bg-zinc-900 border-zinc-800 text-sm"
              />
            </div>
          </div>

          {/* Banding & Delivery */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Banding Status</label>
              <Select
                value={formData.bandingStatus}
                onChange={e => setFormData({ ...formData, bandingStatus: e.target.value as any })}
                className="bg-zinc-900 border-zinc-800 text-sm"
              >
                <option value="Closed Ring / Ringed">Closed Ring / Ringed</option>
                <option value="Open Banded">Open Banded</option>
                <option value="Split Ring">Split Ring</option>
                <option value="Non-Banded">Non-Banded</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Delivery Option</label>
              <Select
                value={formData.deliveryOption}
                onChange={e => setFormData({ ...formData, deliveryOption: e.target.value as any })}
                className="bg-zinc-900 border-zinc-800 text-sm"
              >
                <option value="Collection Only">Collection Only</option>
                <option value="Courier Can Be Arranged">Courier Can Be Arranged</option>
                <option value="Delivery Available">Delivery Available</option>
                <option value="Collection or Courier">Collection or Courier</option>
              </Select>
            </div>
          </div>

          {/* Pricing & Location */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">
                {type === 'wanted' ? `Target Price (${sellerCountry.currencyCode} ${sellerCountry.currencySymbol})` : `Price (${sellerCountry.currencyCode} ${sellerCountry.currencySymbol}) *`}
              </label>
              <Input
                type="number"
                required
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                className="bg-zinc-900 border-zinc-800 text-sm font-semibold text-gold-400"
              />
            </div>

            {type === 'wanted' && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Max Budget ({sellerCountry.currencyCode} {sellerCountry.currencySymbol})</label>
                <Input
                  type="number"
                  value={formData.priceMax}
                  onChange={e => setFormData({ ...formData, priceMax: parseFloat(e.target.value) || 0 })}
                  className="bg-zinc-900 border-zinc-800 text-sm font-semibold text-gold-400"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Location / Town *</label>
              <Input
                required
                value={formData.locationTown}
                onChange={e => setFormData({ ...formData, locationTown: e.target.value })}
                placeholder="Town / City"
                className="bg-zinc-900 border-zinc-800 text-sm"
              />
            </div>

            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.vetChecked}
                  onChange={e => setFormData({ ...formData, vetChecked: e.target.checked })}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/20"
                />
                <span className="text-sm font-medium text-zinc-200">Vet Checked</span>
              </label>
            </div>
          </div>

          {/* Allow Offers Toggle */}
          <div className="p-4 bg-gold-500/10 border border-gold-500/30 rounded-2xl flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-semibold text-gold-300 flex items-center gap-2 cursor-pointer">
                <Tag size={16} /> Allow Buyers to Make an Offer
              </label>
              <p className="text-xs text-zinc-400">
                Allows interested buyers to propose custom price offers when inquiring about this listing.
              </p>
            </div>
            <input
              type="checkbox"
              checked={formData.allowOffers !== false}
              onChange={e => setFormData({ ...formData, allowOffers: e.target.checked })}
              className="w-5 h-5 rounded border-zinc-700 bg-zinc-900 text-gold-500 focus:ring-gold-500/20 cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Description & Lineage Details</label>
            <Textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Provide information regarding diet, health, temperament, parents, bloodlines..."
              className="bg-zinc-900 border-zinc-800 text-sm min-h-[90px]"
            />
          </div>

          {/* Photo upload */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <span>Photos ({formData.imageUrls?.length || 0})</span>
                <span className="text-[10px] text-zinc-500 font-normal">Max 8 recommended</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="text-[11px] text-gold-400 hover:text-gold-300 underline font-medium"
                >
                  {showUrlInput ? 'Hide URL link' : '+ Paste Image URL'}
                </button>
                {formData.imageUrls && formData.imageUrls.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, imageUrls: [] }))}
                    className="text-[11px] text-rose-400 hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>

            {/* Optional URL input */}
            {showUrlInput && (
              <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Image Web Address / Public URL
                </label>
                <div className="flex gap-2">
                  <Input
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    placeholder="https://example.com/bird-photo.jpg"
                    className="text-xs bg-zinc-950 border-zinc-800 flex-1"
                  />
                  <Button
                    type="button"
                    onClick={handleAddUrlImage}
                    className="text-xs bg-gold-500 text-black hover:bg-gold-400 font-bold px-3"
                  >
                    Add
                  </Button>
                </div>
              </div>
            )}

            <input 
              id="marketplace-listing-photo-upload"
              ref={fileInputRef}
              type="file" 
              multiple 
              accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.jfif,.gif" 
              onChange={handleImageUpload} 
              className="hidden" 
              disabled={isUploading} 
            />

            {/* Native Label Drag & Drop Zone */}
            <label
              htmlFor="marketplace-listing-photo-upload"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "border-2 border-dashed rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-zinc-900/40 hover:bg-zinc-900/70 block select-none",
                isDragging ? "border-gold-500 bg-gold-500/10 scale-[1.01]" : "border-zinc-800 hover:border-zinc-700",
                isUploading && "opacity-75 pointer-events-none"
              )}
            >
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-gold-400 mb-2 mx-auto">
                {isUploading ? (
                  <RefreshCw size={20} className="animate-spin text-gold-400" />
                ) : (
                  <ImageIcon size={20} />
                )}
              </div>
              <p className="text-sm font-semibold text-white">
                {isUploading 
                  ? (uploadStatusText || 'Compressing & uploading photos...') 
                  : 'Click to select photos or drag & drop here'}
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                Supports JPG, PNG, WEBP, HEIC • Upload multiple photos from camera or gallery
              </p>
              <div className="inline-flex items-center gap-2 mt-3 text-xs py-1.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl font-bold transition-all shadow-sm">
                <Plus size={14} className="text-gold-400" />
                <span>Choose Photos from Device</span>
              </div>
            </label>

            {formData.imageUrls && formData.imageUrls.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                  Attached Photos (First image is the classified cover):
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {formData.imageUrls.map((url, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 group shadow-md flex-shrink-0">
                      <img src={url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      {i === 0 && (
                        <span className="absolute top-1 left-1 bg-gold-500 text-black text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow">
                          COVER
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setFormData(prev => ({ ...prev, imageUrls: prev.imageUrls?.filter((_, idx) => idx !== i) }));
                        }}
                        className="absolute inset-0 bg-black/75 flex items-center justify-center text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete Photo"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
            <Button type="button" variant="secondary" onClick={onClose} className="text-sm font-semibold">
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || isUploading} className="text-sm font-semibold bg-gold-500 text-black hover:bg-gold-400">
              {isSaving ? 'Publishing...' : initialData ? 'Save Changes' : 'Publish Listing'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Listing Detail & Contact Modal ---
function ListingDetailModal({
  listing,
  activeCountryCode,
  activeCurrencySymbol,
  activeCurrencyCode,
  exchangeRates,
  currentUserId,
  reviews,
  onClose,
  onLeaveReview
}: {
  listing: MarketplaceListing;
  activeCountryCode: string;
  activeCurrencySymbol: string;
  activeCurrencyCode: string;
  exchangeRates: Record<string, number> | null;
  currentUserId?: string;
  reviews: MarketplaceReview[];
  onClose: () => void;
  onLeaveReview: () => void;
}) {
  const isForSale = listing.type === 'for_sale';
  const [showOfferDrawer, setShowOfferDrawer] = useState(false);
  const [offerPrice, setOfferPrice] = useState<string>('');
  const [offerNote, setOfferNote] = useState<string>('');

  const listingCountry = useMemo(() => {
    return getCountryMarketplace(listing.countryCode || listing.country || 'South Africa');
  }, [listing.countryCode, listing.country]);

  const listingCurrencyCode = listing.currencyCode || listingCountry.currencyCode;
  const listingCurrencySymbol = listing.currency || listingCountry.currencySymbol;
  const isDifferentCurrency = listingCurrencyCode !== activeCurrencyCode;

  const convertedPriceApprox = useMemo(() => {
    if (!isDifferentCurrency || !exchangeRates) return null;
    const fromRate = exchangeRates[listingCurrencyCode];
    const toRate = exchangeRates[activeCurrencyCode];
    if (!fromRate || !toRate) return null;

    const inZar = listing.price / fromRate;
    const converted = Math.round(inZar * toRate);
    return `≈ ${activeCurrencySymbol}${converted.toLocaleString()} ${activeCurrencyCode}`;
  }, [isDifferentCurrency, exchangeRates, listingCurrencyCode, activeCurrencyCode, activeCurrencySymbol, listing.price]);

  // Structured inquiry message text generator
  const generateInquiryMessage = (offer?: { price: string; note: string }) => {
    let msg = `🕊️ *AVERIAN CLASSIFIEDS ${isForSale ? 'FOR SALE' : 'WANTED'} INQUIRY*\n`;
    msg += `==============================\n`;
    msg += `*Listing:* ${listing.title}\n`;
    msg += `*Category:* ${listing.category}\n`;
    msg += `*Country/Marketplace:* ${listingCountry.flag} ${listingCountry.name}\n`;
    if (listing.species) msg += `*Species:* ${listing.species}\n`;
    if (listing.subSpecies) msg += `*Sub-Species:* ${listing.subSpecies}\n`;
    if (listing.mutations && listing.mutations.length > 0) msg += `*Mutations:* ${listing.mutations.join(', ')}\n`;
    if (listing.sex) msg += `*Sex:* ${listing.sex}\n`;
    if (listing.sexingMethod && listing.sexingMethod !== 'Unsexed') msg += `*Sexing:* ${listing.sexingMethod}\n`;
    if (listing.bandingStatus) msg += `*Banding:* ${listing.bandingStatus}\n`;
    if (listing.ageYear) msg += `*Age / Year:* ${listing.ageYear}\n`;
    msg += `*${isForSale ? 'Asking Price' : 'Target Budget'}:* ${listingCurrencySymbol}${listing.price} ${listingCurrencyCode}${listing.priceMax ? ` - ${listingCurrencySymbol}${listing.priceMax} ${listingCurrencyCode}` : ''}\n`;
    msg += `*Delivery:* ${listing.deliveryOption}\n`;
    msg += `*Location:* ${listing.locationTown || listing.sellerTown}, ${listingCountry.name}\n`;
    if (listing.sellerAviary) msg += `*Aviary:* ${listing.sellerAviary}\n`;
    if (listing.imageUrls && listing.imageUrls.length > 0) {
      msg += `*Image:* ${listing.imageUrls[0]}\n`;
    }
    msg += `==============================\n`;

    if (offer && offer.price) {
      msg += `🏷️ *MY OFFER: ${listingCurrencySymbol}${offer.price} ${listingCurrencyCode}*\n`;
      if (offer.note) {
        msg += `💬 *Note:* ${offer.note}\n`;
      }
      msg += `\nHi ${listing.sellerAviary || listing.sellerName}, I would like to make this offer on your listing!`;
    } else {
      msg += `\nHi ${listing.sellerAviary || listing.sellerName}, I am inquiring about your listing on Averian!`;
    }
    return msg;
  };

  const directWhatsappUrl = listing.sellerWhatsApp 
    ? buildWhatsAppLink(listing.sellerWhatsApp, generateInquiryMessage())
    : null;

  const handleSendOfferWhatsApp = () => {
    if (!offerPrice.trim()) {
      toast.error('Please specify your offer amount!');
      return;
    }
    if (!listing.sellerWhatsApp) {
      toast.error('Seller did not provide a WhatsApp number.');
      return;
    }
    const msg = generateInquiryMessage({ price: offerPrice, note: offerNote });
    const url = buildWhatsAppLink(listing.sellerWhatsApp, msg);
    if (!url) {
      toast.error('Invalid WhatsApp number for this seller.');
      return;
    }
    window.open(url, '_blank');
    setShowOfferDrawer(false);
  };

  const handleShareListing = async () => {
    const text = generateInquiryMessage();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Averian: ${listing.title}`,
          text: text,
          url: window.location.href
        });
        toast.success('Listing shared!');
      } catch {
        // Fallback
        await navigator.clipboard.writeText(text);
        toast.success('Listing info copied to clipboard!');
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('Listing info copied to clipboard!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn(
                "text-xs font-semibold px-2 py-0.5 rounded-md",
                isForSale ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
              )}>
                {isForSale ? 'For Sale' : 'Wanted'}
              </span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300">
                {listing.category}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-200 flex items-center gap-1">
                <span>{listingCountry.flag}</span>
                <span>{listingCountry.name}</span>
              </span>
              {listing.allowOffers && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-gold-500/10 border border-gold-500/30 text-gold-400 flex items-center gap-1">
                  <Tag size={12} /> Offers Welcome
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-white mt-2">{listing.title}</h2>
            {listing.species && (
              <p className="text-sm font-medium text-gold-400 mt-0.5">{listing.species} {listing.subSpecies ? `• ${listing.subSpecies}` : ''}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShareListing}
              className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
              title="Share Listing"
            >
              <Share2 size={18} />
            </button>
            <button onClick={onClose} className="text-zinc-500 hover:text-white p-1">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Gallery Preview */}
        {listing.imageUrls && listing.imageUrls.length > 0 && (
          <div className="space-y-2 pt-2">
            <div className="aspect-[16/10] bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800">
              <img src={listing.imageUrls[0]} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            {listing.imageUrls.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {listing.imageUrls.map((url, idx) => (
                  <img key={idx} src={url} alt="" className="w-20 h-20 rounded-xl object-cover border border-zinc-800 flex-shrink-0" referrerPolicy="no-referrer" />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Price & Attribute Matrix */}
        <div className="p-5 bg-zinc-900/60 border border-zinc-800 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div>
              <p className="text-xs font-medium text-zinc-400">
                {listing.type === 'wanted' ? 'Target Budget' : 'Listing Price'}
              </p>
              <div className="flex items-baseline gap-2 flex-wrap mt-1">
                <p className="text-3xl font-bold text-gold-400">
                  {listingCurrencySymbol}{listing.price.toLocaleString()}
                  {listing.priceMax ? ` - ${listingCurrencySymbol}${listing.priceMax.toLocaleString()}` : ''}
                </p>
                <span className="text-xs font-bold text-zinc-400 px-1.5 py-0.5 bg-zinc-800 rounded">
                  {listingCurrencyCode}
                </span>
                {convertedPriceApprox && (
                  <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {convertedPriceApprox}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-zinc-400">Delivery</p>
              <p className="text-sm font-semibold text-white mt-1">{listing.deliveryOption}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            {listing.sex && (
              <div>
                <p className="text-xs text-zinc-500 font-medium">Sex</p>
                <p className="font-semibold text-white mt-0.5">{listing.sex}</p>
              </div>
            )}
            {listing.sexingMethod && (
              <div>
                <p className="text-xs text-zinc-500 font-medium">Sexing</p>
                <p className="font-semibold text-white mt-0.5">{listing.sexingMethod}</p>
              </div>
            )}
            {listing.bandingStatus && (
              <div>
                <p className="text-xs text-zinc-500 font-medium">Banding</p>
                <p className="font-semibold text-white mt-0.5">{listing.bandingStatus}</p>
              </div>
            )}
            {listing.ageYear && (
              <div>
                <p className="text-xs text-zinc-500 font-medium">Age / Year</p>
                <p className="font-semibold text-white mt-0.5">{listing.ageYear}</p>
              </div>
            )}
            {listing.vetChecked && (
              <div>
                <p className="text-xs text-zinc-500 font-medium">Vet Status</p>
                <p className="font-semibold text-emerald-400 flex items-center gap-1 mt-0.5">
                  <Check size={14} /> Certified Checked
                </p>
              </div>
            )}
          </div>

          {/* Mutations list */}
          {listing.mutations && listing.mutations.length > 0 && (
            <div className="pt-2 border-t border-zinc-800/60">
              <p className="text-xs text-zinc-400 font-medium mb-1.5">Mutations & Color Variations:</p>
              <div className="flex flex-wrap gap-1.5">
                {listing.mutations.map(m => (
                  <span key={m} className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-gold-500/10 text-gold-300 border border-gold-500/30">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        {listing.description && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Description</h4>
            <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800">
              {listing.description}
            </p>
          </div>
        )}

        {/* Make an Offer Section */}
        {listing.allowOffers && (
          <div className="p-4 bg-gold-500/10 border border-gold-500/30 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag size={18} className="text-gold-400" />
                <h4 className="text-sm font-bold text-white">Make an Offer</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowOfferDrawer(!showOfferDrawer)}
                className="text-xs font-semibold text-gold-400 hover:underline"
              >
                {showOfferDrawer ? 'Hide Offer Form' : 'Open Offer Form'}
              </button>
            </div>

            {showOfferDrawer ? (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-300">Your Offer Amount ({listingCurrencyCode} {listingCurrencySymbol}) *</label>
                    <Input
                      type="number"
                      value={offerPrice}
                      onChange={e => setOfferPrice(e.target.value)}
                      placeholder="e.g. 500"
                      className="bg-zinc-900 border-zinc-800 text-sm font-bold text-gold-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-300">Message / Delivery terms (Optional)</label>
                    <Input
                      value={offerNote}
                      onChange={e => setOfferNote(e.target.value)}
                      placeholder="e.g. Can collect this weekend"
                      className="bg-zinc-900 border-zinc-800 text-sm"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={handleSendOfferWhatsApp}
                  className="w-full py-2.5 bg-gold-500 text-black hover:bg-gold-400 font-bold text-sm rounded-xl shadow-lg"
                >
                  <MessageCircle size={16} /> Send Offer to Breeder via WhatsApp
                </Button>
              </div>
            ) : (
              <p className="text-xs text-zinc-400">
                The seller is open to price negotiations in <strong>{listingCurrencyCode}</strong>. Propose your offer to start a direct WhatsApp inquiry!
              </p>
            )}
          </div>
        )}

        {/* Verified Breeder Information Card */}
        <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-400">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">
                  {listing.sellerAviary || listing.sellerName}
                </h4>
                <p className="text-xs text-zinc-400 font-medium flex items-center gap-1.5 mt-0.5">
                  <span>{listingCountry.flag}</span>
                  <span>{listing.locationTown || listing.sellerTown || listingCountry.name}</span>
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md">
              Vetted Breeder
            </span>
          </div>

          {/* Contact Direct Actions */}
          <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-zinc-800">
            {directWhatsappUrl && (
              <a
                href={directWhatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-black font-semibold text-sm rounded-xl transition-all shadow-lg shadow-emerald-600/20"
              >
                <MessageCircle size={18} />
                Chat on WhatsApp
              </a>
            )}

            {listing.sellerPhone && (
              <a
                href={`tel:${listing.sellerPhone}`}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-sm rounded-xl border border-zinc-700 transition-all"
              >
                <Phone size={16} />
                Call Breeder
              </a>
            )}

            {listing.sellerEmail && (
              <a
                href={`mailto:${listing.sellerEmail}?subject=Averian Inquiry: ${encodeURIComponent(listing.title)}`}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-sm rounded-xl border border-zinc-700 transition-all"
              >
                <Mail size={16} />
                Email
              </a>
            )}
          </div>
        </div>

        {/* Reviews Section & Disclaimer */}
        <div className="space-y-3 pt-4 border-t border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-zinc-400">
              Breeder Reviews ({reviews.length})
            </span>
            {currentUserId && currentUserId !== listing.sellerId && (
              <button
                onClick={onLeaveReview}
                className="text-xs font-semibold text-gold-400 hover:underline"
              >
                + Leave a Review
              </button>
            )}
          </div>

          {reviews.length > 0 ? (
            <div className="space-y-2">
              {reviews.map(r => (
                <div key={r.id} className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800 text-sm space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{r.buyerName}</span>
                    <div className="flex items-center text-gold-400">
                      {Array.from({ length: r.rating }).map((_, i) => (
                        <Star key={i} size={12} className="fill-gold-400" />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-zinc-300">{r.comment}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 italic">No reviews yet for this breeder.</p>
          )}

          {/* Official Direct Deal Disclaimer */}
          <div className="p-4 bg-zinc-900/40 rounded-xl border border-zinc-800 text-xs text-zinc-400 space-y-1 mt-4">
            <p className="font-semibold text-zinc-300">Safety & Trust Notice:</p>
            <p className="leading-relaxed">
              Averian does not hold funds or handle logistics. Never send advance deposits to unverified payment methods. Always verify bird health and collection details directly with the breeder.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Mark Sold Modal ---
function MarkSoldModal({
  listing,
  onClose
}: {
  listing: MarketplaceListing;
  onClose: () => void;
}) {
  const [buyerName, setBuyerName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleMarkSold = async () => {
    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'marketplaceListings', listing.id), {
        status: 'sold',
        soldToBuyerName: buyerName.trim() || 'Direct Buyer',
        updatedAt: new Date().toISOString()
      });
      toast.success('Listing marked as SOLD!');
      onClose();
    } catch (err: any) {
      toast.error('Failed to update status: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <h3 className="text-lg font-semibold text-white">Mark Listing as Sold</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-zinc-300 leading-relaxed">
          Marking <strong>"{listing.title}"</strong> as sold will update the listing badge and prevent further purchase inquiries.
        </p>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400">Buyer Name (Optional)</label>
          <Input
            value={buyerName}
            onChange={e => setBuyerName(e.target.value)}
            placeholder="e.g. Peter Smith"
            className="bg-zinc-900 border-zinc-800"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={onClose} className="text-sm font-semibold">
            Cancel
          </Button>
          <Button 
            onClick={handleMarkSold} 
            disabled={isProcessing}
            className="text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white"
          >
            {isProcessing ? 'Updating...' : 'Confirm Sold'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// --- Review & Rating Modal ---
function ReviewModal({
  listing,
  currentUser,
  onClose
}: {
  listing: MarketplaceListing;
  currentUser: any;
  onClose: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      toast.error('Please write a short review comment!');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'marketplaceReviews'), {
        listingId: listing.id,
        listingTitle: listing.title,
        sellerId: listing.sellerId,
        sellerName: listing.sellerName,
        buyerId: currentUser.uid,
        buyerName: currentUser.displayName || 'Breeder',
        rating,
        comment,
        status: 'pending_approval', // Moderated by Admin
        createdAt: new Date().toISOString()
      });
      toast.success('Review submitted! It will appear once approved by Admin.');
      onClose();
    } catch (err: any) {
      toast.error('Failed to submit review: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Rate Breeder</h3>
            <p className="text-sm text-zinc-400 font-medium">{listing.sellerAviary || listing.sellerName}</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2 text-center py-2">
            <label className="text-xs font-medium text-zinc-400">Rating (1 to 5 Stars)</label>
            <div className="flex items-center justify-center gap-2 pt-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-1 transition-colors"
                >
                  <Star
                    size={32}
                    className={cn(
                      star <= rating ? "fill-gold-400 text-gold-400" : "text-zinc-700"
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Your Feedback</label>
            <Textarea
              required
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Describe your transaction experience, bird health, communication..."
              className="bg-zinc-900 border-zinc-800 text-sm min-h-[100px]"
            />
          </div>

          <p className="text-xs text-zinc-500 italic">
            Reviews are moderated by Admin to maintain genuine, respectful community standards.
          </p>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
            <Button type="button" variant="secondary" onClick={onClose} className="text-sm font-semibold">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="text-sm font-semibold bg-gold-500 text-black hover:bg-gold-400">
              {isSubmitting ? 'Submitting...' : 'Submit Review'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

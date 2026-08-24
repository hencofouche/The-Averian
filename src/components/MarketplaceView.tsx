import React, { useState, useMemo } from 'react';
import { 
  ShoppingBag, Search, Plus, Filter, CheckCircle2, AlertCircle, Clock, 
  MapPin, Phone, MessageCircle, Mail, Shield, ShieldCheck, ShieldAlert, 
  Tag, DollarSign, Calendar, ChevronDown, ChevronUp, Image as ImageIcon,
  Check, X, Star, Heart, Bird as BirdIcon, Eye, Trash2, Edit2, Send,
  Share2, ArrowUpDown, Truck, Award, HelpCircle, UserCheck, AlertTriangle
} from 'lucide-react';
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
  const [isSoldModalOpen, setIsSoldModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<MarketplaceListing | null>(null);

  // Current user's seller profile
  const myProfile = useMemo(() => {
    if (!user) return null;
    return sellerProfiles.find(p => p.uid === user.uid) || null;
  }, [sellerProfiles, user]);

  const isVerifiedSeller = myProfile?.status === 'approved';

  // Currency symbol
  const currencySymbol = userSettings?.currency || '$';

  // Unique towns and species for filter dropdowns
  const availableTowns = useMemo(() => {
    const towns = new Set<string>();
    listings.forEach(l => {
      if (l.locationTown) towns.add(l.locationTown);
    });
    return Array.from(towns).sort();
  }, [listings]);

  const availableSpecies = useMemo(() => {
    const species = new Set<string>();
    listings.forEach(l => {
      if (l.species) species.add(l.species);
    });
    return Array.from(species).sort();
  }, [listings]);

  // Filter listings
  const filteredListings = useMemo(() => {
    return listings.filter(l => {
      // Tab matching
      if (activeTab === 'for_sale' && (l.type !== 'for_sale' || l.status === 'archived')) return false;
      if (activeTab === 'wanted' && (l.type !== 'wanted' || l.status === 'archived')) return false;
      if (activeTab === 'my_listings' && l.sellerId !== user?.uid) return false;

      // Only show active listings for public browse tabs, unless it's my listings or admin
      if (activeTab !== 'my_listings' && !isAdmin && l.status !== 'active' && l.status !== 'sold') {
        return false;
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
    listings, activeTab, user, isAdmin, searchQuery, selectedCategory, 
    selectedSpecies, selectedBanding, selectedSexing, selectedDelivery, 
    onlyVetChecked, selectedTown, minPrice, maxPrice, sortBy
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
              <label className="text-xs font-semibold text-zinc-400">Price Range ({currencySymbol})</label>
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
              <button
                onClick={() => {
                  setSelectedCategory('All');
                  setSelectedSpecies('All');
                  setSelectedBanding('All');
                  setSelectedSexing('All');
                  setSelectedDelivery('All');
                  setSelectedTown('All');
                  setOnlyVetChecked(false);
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
              currencySymbol={currencySymbol}
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
                  ? "No birds currently listed for sale. Be the first verified breeder to list!"
                  : activeTab === 'wanted'
                  ? "No wanted requests at the moment. Post what you are searching for!"
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
          onClose={() => setIsSellerProfileModalOpen(false)}
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
          currencySymbol={currencySymbol}
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
          currencySymbol={currencySymbol}
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
  currencySymbol,
  isOwner,
  isAdmin,
  onViewDetails,
  onEdit,
  onDelete,
  onMarkSold
}: {
  listing: MarketplaceListing;
  currencySymbol: string;
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
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          <span className={cn(
            "text-xs font-semibold px-2 py-1 rounded-md shadow-md backdrop-blur-md",
            isForSale ? "bg-emerald-500/90 text-black" : "bg-amber-500/90 text-black"
          )}>
            {isForSale ? 'For Sale' : 'Wanted'}
          </span>
          <span className="text-xs font-medium px-2 py-1 rounded-md bg-black/70 text-white border border-white/10 backdrop-blur-md">
            {listing.category}
          </span>
        </div>

        {/* Price Tag */}
        <div className="absolute bottom-3 right-3 bg-black/80 border border-white/10 rounded-xl px-3 py-1.5 backdrop-blur-md text-right">
          <p className="text-xs font-medium text-zinc-400">
            {listing.type === 'wanted' ? 'Budget' : 'Price'}
          </p>
          <p className="text-base font-bold text-gold-400 leading-none mt-0.5">
            {currencySymbol}{listing.price}
            {listing.priceMax ? ` - ${currencySymbol}${listing.priceMax}` : ''}
          </p>
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
          <div className="flex flex-wrap gap-2 pt-1">
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
            <div className="flex items-center gap-1.5 text-zinc-300">
              <MapPin size={14} className="text-gold-400 shrink-0" />
              <span className="font-medium truncate max-w-[130px]">{listing.locationTown || listing.sellerTown}</span>
            </div>
            
            <div className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck size={14} />
              <span className="font-semibold text-xs">Verified Breeder</span>
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
  onClose
}: {
  user: any;
  existingProfile: SellerProfile | null;
  isAdmin: boolean;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    sellerName: existingProfile?.sellerName || user?.displayName || '',
    aviaryName: existingProfile?.aviaryName || '',
    town: existingProfile?.town || '',
    provinceState: existingProfile?.provinceState || '',
    country: existingProfile?.country || 'South Africa',
    whatsapp: existingProfile?.whatsapp || '',
    phone: existingProfile?.phone || '',
    email: existingProfile?.email || user?.email || '',
    bio: existingProfile?.bio || ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sellerName.trim() || !formData.town.trim() || !formData.whatsapp.trim()) {
      toast.error('Seller Name, Location/Town, and WhatsApp number are required!');
      return;
    }

    setIsSaving(true);
    try {
      if (existingProfile?.id) {
        await updateDoc(doc(db, 'sellerProfiles', existingProfile.id), {
          ...formData,
          updatedAt: new Date().toISOString()
        });
        toast.success('Seller profile updated successfully');
      } else {
        await addDoc(collection(db, 'sellerProfiles'), {
          ...formData,
          uid: user.uid,
          status: 'pending', // Pending Admin's approval
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        toast.success('Profile submitted for Admin verification!');
      }
      onClose();
    } catch (err: any) {
      toast.error('Failed to save profile: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden shadow-2xl space-y-6">
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
                Mandatory Verification by Admin
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
            "p-4 rounded-xl border flex items-center gap-3 text-sm",
            existingProfile.status === 'approved' 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : existingProfile.status === 'pending'
              ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          )}>
            {existingProfile.status === 'approved' ? (
              <ShieldCheck size={20} className="shrink-0 text-emerald-400" />
            ) : existingProfile.status === 'pending' ? (
              <Clock size={20} className="shrink-0 text-amber-400" />
            ) : (
              <AlertTriangle size={20} className="shrink-0 text-rose-400" />
            )}
            <div className="space-y-1">
              <p className="font-semibold text-sm">
                Status: {existingProfile.status.charAt(0).toUpperCase() + existingProfile.status.slice(1)}
              </p>
              <p className="text-xs opacity-80 leading-relaxed">
                {existingProfile.status === 'approved'
                  ? 'Your profile is officially verified by Admin. You have full listing privileges.'
                  : existingProfile.status === 'pending'
                  ? 'Your profile is awaiting review and approval by Admin.'
                  : `Reason: ${existingProfile.rejectionReason || 'Please review information and update.'}`}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
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
                placeholder="e.g. Pretoria, Cape Town"
                className="bg-zinc-900 border-zinc-800 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Province / Region</label>
              <Input
                value={formData.provinceState}
                onChange={e => setFormData({ ...formData, provinceState: e.target.value })}
                placeholder="e.g. Gauteng"
                className="bg-zinc-900 border-zinc-800 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">WhatsApp Number *</label>
              <Input
                required
                value={formData.whatsapp}
                onChange={e => setFormData({ ...formData, whatsapp: e.target.value })}
                placeholder="e.g. +27 73 123 4567"
                className="bg-zinc-900 border-zinc-800 text-sm"
              />
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
            <p className="font-semibold text-white">Disclaimer & Terms</p>
            <p className="leading-relaxed">
              By submitting, you confirm you are an authentic breeder adhering to animal welfare standards. Averian does not process funds or charge commissions. Profiles that violate marketplace rules will be banned.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={onClose} className="text-sm font-semibold">
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} className="text-sm font-semibold bg-gold-500 text-black hover:bg-gold-400">
              {isSaving ? 'Submitting...' : existingProfile ? 'Update Profile' : 'Submit for Verification'}
            </Button>
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
    currency: currencySymbol,
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsUploading(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const url = await compressAndUploadImage(file, `marketplace/${user?.uid || 'general'}`);
        urls.push(url);
      }
      setFormData(prev => ({
        ...prev,
        imageUrls: [...(prev.imageUrls || []), ...urls]
      }));
      toast.success(`${urls.length} photo(s) uploaded successfully`);
    } catch (err: any) {
      toast.error('Image upload failed: ' + err.message);
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
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
        sellerId: user.uid,
        sellerName: sellerProfile?.sellerName || user.displayName || 'Breeder',
        sellerAviary: sellerProfile?.aviaryName || '',
        sellerTown: formData.locationTown || sellerProfile?.town || '',
        sellerPhone: sellerProfile?.phone || '',
        sellerWhatsApp: sellerProfile?.whatsapp || '',
        sellerEmail: sellerProfile?.email || user.email || '',
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
              <p className="text-xs text-zinc-400 font-medium">
                Verified Seller: {sellerProfile?.sellerName} ({sellerProfile?.town})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white p-1">
            <X size={20} />
          </button>
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
                {birds.map(b => (
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
                {type === 'wanted' ? `Target Price (${currencySymbol})` : `Price (${currencySymbol}) *`}
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
                <label className="text-xs font-medium text-zinc-400">Max Budget ({currencySymbol})</label>
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
            <label className="text-xs font-medium text-zinc-400">Photos</label>
            <div className="flex items-center gap-3">
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                onChange={handleImageUpload} 
                className="hidden" 
                id="marketplace-photo-upload" 
                disabled={isUploading} 
              />
              <label 
                htmlFor="marketplace-photo-upload"
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 bg-zinc-900 border border-zinc-800 hover:border-gold-500 rounded-xl cursor-pointer text-sm font-semibold text-white transition-all shadow-md",
                  isUploading && "opacity-50 cursor-not-allowed"
                )}
              >
                <ImageIcon size={16} className="text-gold-400" />
                {isUploading ? 'Uploading & Compressing...' : 'Upload Photos'}
              </label>
              <span className="text-xs text-zinc-500">Supports JPG, PNG, WEBP</span>
            </div>

            {formData.imageUrls && formData.imageUrls.length > 0 && (
              <div className="flex flex-wrap gap-2.5 pt-2">
                {formData.imageUrls.map((url, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 group shadow-md">
                    <img src={url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, imageUrls: prev.imageUrls?.filter((_, idx) => idx !== i) }))}
                      className="absolute inset-0 bg-black/70 flex items-center justify-center text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
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
  currencySymbol,
  currentUserId,
  reviews,
  onClose,
  onLeaveReview
}: {
  listing: MarketplaceListing;
  currencySymbol: string;
  currentUserId?: string;
  reviews: MarketplaceReview[];
  onClose: () => void;
  onLeaveReview: () => void;
}) {
  const isForSale = listing.type === 'for_sale';
  const [showOfferDrawer, setShowOfferDrawer] = useState(false);
  const [offerPrice, setOfferPrice] = useState<string>('');
  const [offerNote, setOfferNote] = useState<string>('');

  // Structured inquiry message text generator
  const generateInquiryMessage = (offer?: { price: string; note: string }) => {
    let msg = `🕊️ *AVERIAN CLASSIFIEDS ${isForSale ? 'FOR SALE' : 'WANTED'} INQUIRY*\n`;
    msg += `==============================\n`;
    msg += `*Listing:* ${listing.title}\n`;
    msg += `*Category:* ${listing.category}\n`;
    if (listing.species) msg += `*Species:* ${listing.species}\n`;
    if (listing.subSpecies) msg += `*Sub-Species:* ${listing.subSpecies}\n`;
    if (listing.mutations && listing.mutations.length > 0) msg += `*Mutations:* ${listing.mutations.join(', ')}\n`;
    if (listing.sex) msg += `*Sex:* ${listing.sex}\n`;
    if (listing.sexingMethod && listing.sexingMethod !== 'Unsexed') msg += `*Sexing:* ${listing.sexingMethod}\n`;
    if (listing.bandingStatus) msg += `*Banding:* ${listing.bandingStatus}\n`;
    if (listing.ageYear) msg += `*Age / Year:* ${listing.ageYear}\n`;
    msg += `*${isForSale ? 'Asking Price' : 'Target Budget'}:* ${currencySymbol}${listing.price}${listing.priceMax ? ` - ${currencySymbol}${listing.priceMax}` : ''}\n`;
    msg += `*Delivery:* ${listing.deliveryOption}\n`;
    msg += `*Location:* ${listing.locationTown || listing.sellerTown}\n`;
    if (listing.sellerAviary) msg += `*Aviary:* ${listing.sellerAviary}\n`;
    if (listing.imageUrls && listing.imageUrls.length > 0) {
      msg += `*Image:* ${listing.imageUrls[0]}\n`;
    }
    msg += `==============================\n`;

    if (offer && offer.price) {
      msg += `🏷️ *MY OFFER: ${currencySymbol}${offer.price}*\n`;
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
    ? `https://wa.me/${listing.sellerWhatsApp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(generateInquiryMessage())}`
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
    const url = `https://wa.me/${listing.sellerWhatsApp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`;
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
              <p className="text-3xl font-bold text-gold-400 mt-1">
                {currencySymbol}{listing.price}
                {listing.priceMax ? ` - ${currencySymbol}${listing.priceMax}` : ''}
              </p>
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
                    <label className="text-xs font-medium text-zinc-300">Your Offer Amount ({currencySymbol}) *</label>
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
                The seller is open to price negotiations. Propose your offer to start a direct WhatsApp inquiry!
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
                <p className="text-xs text-zinc-400 font-medium flex items-center gap-1 mt-0.5">
                  <MapPin size={12} className="text-gold-400" />
                  {listing.locationTown || listing.sellerTown}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md">
              Verified by Admin
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

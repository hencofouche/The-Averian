import React, { useState, useMemo } from 'react';
import { 
  Shield, CheckCircle2, XCircle, Clock, AlertTriangle, UserCheck, 
  ShoppingBag, Star, Activity, DollarSign, Database, Server, 
  MapPin, Phone, MessageCircle, Mail, Award, Trash2, Edit3, 
  Check, X, RefreshCw, BarChart3, Users, Zap, Search, Eye, Sliders, ChevronRight
} from 'lucide-react';
import { 
  SellerProfile, MarketplaceListing, MarketplaceReview, 
  Bird, Cage, Pair, BreedingRecord, Transaction, Task, Contact, UserSettings,
  AppPageId, AppComingSoonSettings, ComingSoonPageConfig
} from '../types';
import { Button, Card, Badge, Input, Select, Textarea } from './ui';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { format } from 'date-fns';
import { AdminDiagnosticsView } from './AdminDiagnosticsView';
import { AdminComingSoonManager } from './AdminComingSoonManager';
import { AdminUserManagementPanel } from './AdminUserManagementPanel';

interface AdminDashboardViewProps {
  user: any;
  userSettings: UserSettings | null;
  sellerProfiles: SellerProfile[];
  marketplaceListings: MarketplaceListing[];
  marketplaceReviews: MarketplaceReview[];
  birds: Bird[];
  cages: Cage[];
  pairs: Pair[];
  breedingRecords: BreedingRecord[];
  transactions: Transaction[];
  tasks: Task[];
  contacts: Contact[];
  isOnline: boolean;
  onToggleForceOffline?: (forced: boolean) => void;
  isForcedOffline?: boolean;
  comingSoonSettings?: AppComingSoonSettings;
  onUpdateComingSoonPageConfig?: (pageId: AppPageId, config: ComingSoonPageConfig) => Promise<void>;
  onNavigateToTab?: (tabId: any) => void;
}

export function AdminDashboardView({
  user,
  userSettings,
  sellerProfiles,
  marketplaceListings,
  marketplaceReviews,
  birds,
  cages,
  pairs,
  breedingRecords,
  transactions,
  tasks,
  contacts,
  isOnline,
  onToggleForceOffline,
  isForcedOffline,
  comingSoonSettings = { pages: {} },
  onUpdateComingSoonPageConfig,
  onNavigateToTab
}: AdminDashboardViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'sellers' | 'listings' | 'reviews' | 'comingSoon' | 'diagnostics'>('overview');
  
  // Rejection reason modal
  const [rejectModalData, setRejectModalData] = useState<{
    type: 'seller' | 'listing' | 'review';
    id: string;
    name: string;
  } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Pending counts
  const pendingSellers = useMemo(() => sellerProfiles.filter(p => p.status === 'pending'), [sellerProfiles]);
  const pendingListings = useMemo(() => marketplaceListings.filter(l => l.status === 'pending_approval'), [marketplaceListings]);
  const pendingReviews = useMemo(() => marketplaceReviews.filter(r => r.status === 'pending_approval'), [marketplaceReviews]);
  const totalPending = pendingSellers.length + pendingListings.length + pendingReviews.length;

  // Active users count (derived from unique seller profiles & contacts)
  const estimatedActiveUsersCount = useMemo(() => {
    const uids = new Set<string>();
    if (user?.uid) uids.add(user.uid);
    sellerProfiles.forEach(s => { if (s.uid) uids.add(s.uid); });
    marketplaceListings.forEach(l => { if (l.sellerId) uids.add(l.sellerId); });
    return Math.max(uids.size, 1);
  }, [user, sellerProfiles, marketplaceListings]);

  // Handle Approve Seller
  const handleApproveSeller = async (profileId: string) => {
    try {
      await updateDoc(doc(db, 'sellerProfiles', profileId), {
        status: 'approved',
        verifiedBy: 'Admin',
        verifiedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      toast.success('Seller Profile Approved by Admin!');
    } catch (err: any) {
      toast.error('Failed to approve seller: ' + err.message);
    }
  };

  // Handle Approve Listing
  const handleApproveListing = async (listingId: string) => {
    try {
      await updateDoc(doc(db, 'marketplaceListings', listingId), {
        status: 'active',
        updatedAt: new Date().toISOString()
      });
      toast.success('Marketplace Listing Approved!');
    } catch (err: any) {
      toast.error('Failed to approve listing: ' + err.message);
    }
  };

  // Handle Approve Review
  const handleApproveReview = async (reviewId: string) => {
    try {
      await updateDoc(doc(db, 'marketplaceReviews', reviewId), {
        status: 'approved'
      });
      toast.success('Review Approved & Published!');
    } catch (err: any) {
      toast.error('Failed to approve review: ' + err.message);
    }
  };

  // Handle Denial with Reason
  const handleConfirmRejection = async () => {
    if (!rejectModalData) return;
    if (!rejectionReason.trim()) {
      toast.error('Please specify a reason for denial.');
      return;
    }

    setIsProcessing(true);
    try {
      if (rejectModalData.type === 'seller') {
        await updateDoc(doc(db, 'sellerProfiles', rejectModalData.id), {
          status: 'rejected',
          rejectionReason: rejectionReason.trim(),
          verifiedBy: 'Admin',
          updatedAt: new Date().toISOString()
        });
        toast.success('Seller profile denied with reason.');
      } else if (rejectModalData.type === 'listing') {
        await updateDoc(doc(db, 'marketplaceListings', rejectModalData.id), {
          status: 'rejected',
          rejectionReason: rejectionReason.trim(),
          updatedAt: new Date().toISOString()
        });
        toast.success('Listing rejected with reason.');
      } else if (rejectModalData.type === 'review') {
        await updateDoc(doc(db, 'marketplaceReviews', rejectModalData.id), {
          status: 'rejected',
          rejectionReason: rejectionReason.trim()
        });
        toast.success('Review rejected.');
      }
      setRejectModalData(null);
      setRejectionReason('');
    } catch (err: any) {
      toast.error('Operation failed: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Ban / Revoke Seller
  const handleBanSeller = async (profileId: string) => {
    if (!confirm('Are you sure you want to ban this seller from the marketplace?')) return;
    try {
      await updateDoc(doc(db, 'sellerProfiles', profileId), {
        status: 'banned',
        rejectionReason: 'Terms of service violation (Banned by Admin)',
        updatedAt: new Date().toISOString()
      });
      toast.success('Seller banned from marketplace.');
    } catch (err: any) {
      toast.error('Failed to ban seller: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gold-500/20 to-amber-600/20 border border-gold-500/30 flex items-center justify-center text-gold-400 shadow-xl shadow-gold-500/10">
            <Shield size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider">
                Averian Admin Portal
              </h1>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-gold-500 text-black rounded-full tracking-widest">
                Moderator Admin
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-medium mt-0.5">
              Verified seller approvals, classifieds moderation, peer-to-peer security, and system diagnostics.
            </p>
          </div>
        </div>

        {/* Global Pending Indicator Badge */}
        {totalPending > 0 && (
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-black uppercase tracking-wider animate-pulse">
            <Clock size={16} />
            <span>{totalPending} Action Items Pending Approval</span>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-zinc-800">
        <button
          onClick={() => setActiveTab('overview')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap",
            activeTab === 'overview'
              ? "bg-gold-500 text-black shadow-lg shadow-gold-500/20"
              : "bg-zinc-900/60 text-zinc-400 hover:text-white border border-zinc-800"
          )}
        >
          <BarChart3 size={15} />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap",
            activeTab === 'users'
              ? "bg-gold-500 text-black shadow-lg shadow-gold-500/20"
              : "bg-zinc-900/60 text-zinc-400 hover:text-white border border-zinc-800"
          )}
        >
          <Users size={15} />
          <span>User Accounts & Subscriptions</span>
        </button>

        <button
          onClick={() => setActiveTab('sellers')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap",
            activeTab === 'sellers'
              ? "bg-gold-500 text-black shadow-lg shadow-gold-500/20"
              : "bg-zinc-900/60 text-zinc-400 hover:text-white border border-zinc-800"
          )}
        >
          <UserCheck size={15} />
          <span>Seller Approvals</span>
          {pendingSellers.length > 0 && (
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500 text-black font-black">
              {pendingSellers.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('listings')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all",
            activeTab === 'listings'
              ? "bg-gold-500 text-black shadow-lg shadow-gold-500/20"
              : "bg-zinc-900/60 text-zinc-400 hover:text-white border border-zinc-800"
          )}
        >
          <ShoppingBag size={15} />
          <span>Classified Listings</span>
          {pendingListings.length > 0 && (
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500 text-black font-black">
              {pendingListings.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('reviews')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all",
            activeTab === 'reviews'
              ? "bg-gold-500 text-black shadow-lg shadow-gold-500/20"
              : "bg-zinc-900/60 text-zinc-400 hover:text-white border border-zinc-800"
          )}
        >
          <Star size={15} />
          <span>Reviews & Ratings</span>
          {pendingReviews.length > 0 && (
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500 text-black font-black">
              {pendingReviews.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('comingSoon')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all",
            activeTab === 'comingSoon'
              ? "bg-gold-500 text-black shadow-lg shadow-gold-500/20"
              : "bg-zinc-900/60 text-zinc-400 hover:text-white border border-zinc-800"
          )}
        >
          <Clock size={15} />
          <span>Coming Soon & Features</span>
          {Object.values(comingSoonSettings?.pages || {}).filter(p => p?.enabled).length > 0 && (
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500 text-black font-black">
              {Object.values(comingSoonSettings?.pages || {}).filter(p => p?.enabled).length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('diagnostics')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all",
            activeTab === 'diagnostics'
              ? "bg-gold-500 text-black shadow-lg shadow-gold-500/20"
              : "bg-zinc-900/60 text-zinc-400 hover:text-white border border-zinc-800"
          )}
        >
          <Activity size={15} />
          <span>System & Scale Diagnostics</span>
        </button>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Card 
              onClick={() => setActiveTab('users')}
              className="p-4 bg-zinc-950 border-zinc-800 space-y-2 cursor-pointer hover:border-gold-500/50 transition-all group"
            >
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-[10px] font-black uppercase tracking-wider group-hover:text-gold-400 transition-colors">User Management</span>
                <Users size={16} className="text-gold-400" />
              </div>
              <p className="text-2xl font-black text-white">All App Accounts</p>
              <p className="text-[10px] text-gold-400 font-bold flex items-center gap-1">
                Manage Yearly Subs & Data Migration <ChevronRight size={12} />
              </p>
            </Card>

            <Card className="p-4 bg-zinc-950 border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-[10px] font-black uppercase tracking-wider">Active Listings</span>
                <ShoppingBag size={16} className="text-emerald-400" />
              </div>
              <p className="text-2xl font-black text-white">
                {marketplaceListings.filter(l => l.status === 'active').length}
              </p>
              <p className="text-[10px] text-zinc-400 font-bold">
                {marketplaceListings.filter(l => l.status === 'sold').length} Completed Sales
              </p>
            </Card>

            <Card className="p-4 bg-zinc-950 border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-[10px] font-black uppercase tracking-wider">Pending Approvals</span>
                <Clock size={16} className="text-amber-400" />
              </div>
              <p className="text-2xl font-black text-amber-400">{totalPending}</p>
              <p className="text-[10px] text-zinc-400 font-bold">
                {pendingSellers.length} Sellers • {pendingListings.length} Ads
              </p>
            </Card>

            <Card className="p-4 bg-zinc-950 border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-[10px] font-black uppercase tracking-wider">Estimated Active Users</span>
                <Activity size={16} className="text-blue-400" />
              </div>
              <p className="text-2xl font-black text-white">{estimatedActiveUsersCount}</p>
              <p className="text-[10px] text-emerald-400 font-bold">
                Direct P2P Trading Active
              </p>
            </Card>
          </div>

          {/* Actionable Pending Queue */}
          <div className="space-y-4">
            <h2 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
              <Clock size={16} className="text-gold-400" />
              Awaiting Admin's Verification & Approval ({totalPending})
            </h2>

            {totalPending > 0 ? (
              <div className="space-y-3">
                {/* Pending Sellers */}
                {pendingSellers.map(profile => (
                  <div 
                    key={profile.id}
                    className="p-4 bg-zinc-950/90 border border-amber-500/30 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-md">
                          Seller Verification
                        </span>
                        {profile.verificationMethod === 'didit' ? (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-md flex items-center gap-1">
                            <Zap size={10} className="fill-cyan-300" /> Didit AI: {profile.diditStatus || 'Verified'}
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold uppercase px-2 py-0.5 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-md">
                            Manual Request
                          </span>
                        )}
                        <h4 className="text-sm font-black text-white">{profile.sellerName}</h4>
                        {profile.aviaryName && (
                          <span className="text-xs text-zinc-400">({profile.aviaryName})</span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-300">
                        <span className="flex items-center gap-1 font-bold text-gold-400">
                          <MapPin size={12} /> {profile.town}, {profile.provinceState || profile.country || ''}
                        </span>
                        {profile.whatsapp && (
                          <span className="flex items-center gap-1">
                            <MessageCircle size={12} className="text-emerald-400" /> {profile.whatsapp}
                          </span>
                        )}
                        {profile.email && (
                          <span className="flex items-center gap-1 text-zinc-400">
                            <Mail size={12} /> {profile.email}
                          </span>
                        )}
                        {profile.diditSessionId && (
                          <span className="text-[10px] text-cyan-400/80 font-mono">
                            Session: {profile.diditSessionId.slice(0, 12)}...
                          </span>
                        )}
                      </div>
                      {profile.bio && (
                        <p className="text-[11px] text-zinc-400 italic pt-1 max-w-2xl">"{profile.bio}"</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      <Button
                        onClick={() => handleApproveSeller(profile.id)}
                        className="text-xs font-black uppercase tracking-wider bg-emerald-500 text-black hover:bg-emerald-400 py-2 px-3.5"
                      >
                        <Check size={14} className="mr-1" />
                        Approve as Admin
                      </Button>
                      <Button
                        onClick={() => setRejectModalData({ type: 'seller', id: profile.id, name: profile.sellerName })}
                        variant="secondary"
                        className="text-xs font-black uppercase tracking-wider bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30 py-2 px-3.5"
                      >
                        <X size={14} className="mr-1" />
                        Deny with Reason
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Pending Listings */}
                {pendingListings.map(listing => (
                  <div
                    key={listing.id}
                    className="p-4 bg-zinc-950/90 border border-amber-500/30 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-md">
                          {listing.type === 'for_sale' ? 'For Sale Ad' : 'Wanted Ad'}
                        </span>
                        <h4 className="text-sm font-black text-white">{listing.title}</h4>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-300">
                        <span className="font-bold text-gold-400">{listing.currency}{listing.price}</span>
                        <span>{listing.species}</span>
                        <span>Location: {listing.locationTown}</span>
                        <span className="text-zinc-400">Breeder: {listing.sellerName}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      <Button
                        onClick={() => handleApproveListing(listing.id)}
                        className="text-xs font-black uppercase tracking-wider bg-emerald-500 text-black hover:bg-emerald-400 py-2 px-3.5"
                      >
                        <Check size={14} className="mr-1" />
                        Approve Listing
                      </Button>
                      <Button
                        onClick={() => setRejectModalData({ type: 'listing', id: listing.id, name: listing.title })}
                        variant="secondary"
                        className="text-xs font-black uppercase tracking-wider bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30 py-2 px-3.5"
                      >
                        <X size={14} className="mr-1" />
                        Reject Listing
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Pending Reviews */}
                {pendingReviews.map(review => (
                  <div
                    key={review.id}
                    className="p-4 bg-zinc-950/90 border border-amber-500/30 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-md">
                          Review Moderation
                        </span>
                        <span className="text-xs font-bold text-white">For {review.sellerName}</span>
                        <div className="flex text-gold-400">
                          {Array.from({ length: review.rating }).map((_, i) => (
                            <Star key={i} size={10} className="fill-gold-400" />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-zinc-300">"{review.comment}"</p>
                      <span className="text-[10px] text-zinc-500">By {review.buyerName}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      <Button
                        onClick={() => handleApproveReview(review.id)}
                        className="text-xs font-black uppercase tracking-wider bg-emerald-500 text-black hover:bg-emerald-400 py-2 px-3.5"
                      >
                        <Check size={14} className="mr-1" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => setRejectModalData({ type: 'review', id: review.id, name: `Review by ${review.buyerName}` })}
                        variant="secondary"
                        className="text-xs font-black uppercase tracking-wider bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30 py-2 px-3.5"
                      >
                        <X size={14} className="mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-zinc-950/40 border border-zinc-800 rounded-3xl space-y-2">
                <CheckCircle2 size={36} className="mx-auto text-emerald-400" />
                <h4 className="text-sm font-black uppercase tracking-wider text-white">All Clear!</h4>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  No pending seller profiles or classified listings awaiting approval.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* USERS & SUBSCRIPTION MANAGEMENT TAB */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <AdminUserManagementPanel
            currentUser={user}
            onRefreshParentData={() => {
              // Trigger any global refresh if necessary
            }}
          />
        </div>
      )}

      {/* SELLERS TAB */}
      {activeTab === 'sellers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase text-white tracking-wider">
              Breeder Sellers Directory ({sellerProfiles.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sellerProfiles.map(profile => (
              <Card key={profile.id} className="p-4 bg-zinc-950 border-zinc-800 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-white">{profile.sellerName}</h3>
                      <span className={cn(
                        "text-[8px] font-black uppercase px-2 py-0.5 rounded-full",
                        profile.status === 'approved' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                        profile.status === 'pending' ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                        "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      )}>
                        {profile.status}
                      </span>
                      {profile.verificationMethod === 'didit' && (
                        <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          Didit AI
                        </span>
                      )}
                    </div>
                    {profile.aviaryName && (
                      <p className="text-xs text-zinc-400">{profile.aviaryName}</p>
                    )}
                  </div>
                </div>

                <div className="text-xs text-zinc-300 space-y-1 bg-zinc-900/50 p-2.5 rounded-xl">
                  <p className="flex items-center gap-1.5 font-bold text-gold-400">
                    <MapPin size={12} /> {profile.town}, {profile.provinceState || ''}
                  </p>
                  {profile.whatsapp && <p>WhatsApp: {profile.whatsapp}</p>}
                  {profile.email && <p>Email: {profile.email}</p>}
                  {profile.rejectionReason && (
                    <p className="text-rose-400 font-bold">Reason: {profile.rejectionReason}</p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-zinc-800">
                  {profile.status !== 'approved' && (
                    <Button
                      onClick={() => handleApproveSeller(profile.id)}
                      className="text-[10px] font-black uppercase tracking-wider py-1.5 px-3 bg-emerald-500 text-black hover:bg-emerald-400"
                    >
                      <Check size={12} className="mr-1" /> Approve
                    </Button>
                  )}
                  {profile.status !== 'banned' && (
                    <Button
                      onClick={() => handleBanSeller(profile.id)}
                      variant="secondary"
                      className="text-[10px] font-black uppercase tracking-wider py-1.5 px-3 text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30"
                    >
                      <AlertTriangle size={12} className="mr-1" /> Ban Seller
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* CLASSIFIED LISTINGS TAB */}
      {activeTab === 'listings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase text-white tracking-wider">
              All Classified Listings ({marketplaceListings.length})
            </h2>
          </div>

          <div className="space-y-3">
            {marketplaceListings.map(listing => (
              <div
                key={listing.id}
                className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-zinc-900 border border-zinc-700 text-zinc-300 rounded-md">
                      {listing.type === 'for_sale' ? 'For Sale' : 'Wanted'}
                    </span>
                    <span className={cn(
                      "text-[8px] font-black uppercase px-2 py-0.5 rounded-full",
                      listing.status === 'active' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                      listing.status === 'sold' ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" :
                      "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    )}>
                      {listing.status}
                    </span>
                    <h3 className="text-sm font-black text-white">{listing.title}</h3>
                  </div>
                  <p className="text-xs text-zinc-400">
                    {listing.currency}{listing.price} • {listing.locationTown} • Breeder: {listing.sellerName}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {listing.status === 'pending_approval' && (
                    <Button
                      onClick={() => handleApproveListing(listing.id)}
                      className="text-xs font-black uppercase tracking-wider bg-emerald-500 text-black hover:bg-emerald-400 py-1.5 px-3"
                    >
                      Approve
                    </Button>
                  )}
                  <button
                    onClick={async () => {
                      if (!confirm('Permanently delete this listing?')) return;
                      await deleteDoc(doc(db, 'marketplaceListings', listing.id));
                      toast.success('Listing deleted');
                    }}
                    className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REVIEWS TAB */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          <h2 className="text-sm font-black uppercase text-white tracking-wider">
            All Reviews & Ratings ({marketplaceReviews.length})
          </h2>

          <div className="space-y-3">
            {marketplaceReviews.map(r => (
              <div key={r.id} className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">For: {r.sellerName}</span>
                    <div className="flex text-gold-400">
                      {Array.from({ length: r.rating }).map((_, i) => (
                        <Star key={i} size={12} className="fill-gold-400" />
                      ))}
                    </div>
                    <span className={cn(
                      "text-[8px] font-black uppercase px-2 py-0.5 rounded-full",
                      r.status === 'approved' ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                    )}>
                      {r.status}
                    </span>
                  </div>

                  <button
                    onClick={async () => {
                      await deleteDoc(doc(db, 'marketplaceReviews', r.id));
                      toast.success('Review deleted');
                    }}
                    className="text-zinc-600 hover:text-rose-400 p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="text-xs text-zinc-300">"{r.comment}"</p>
                <p className="text-[10px] text-zinc-500">By {r.buyerName} on {r.createdAt ? format(new Date(r.createdAt), 'yyyy-MM-dd') : ''}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* COMING SOON & FEATURE FLAGS TAB */}
      {activeTab === 'comingSoon' && (
        <div className="space-y-4">
          <AdminComingSoonManager
            comingSoonSettings={comingSoonSettings}
            onUpdatePageConfig={onUpdateComingSoonPageConfig || (async () => {})}
            onNavigateToTab={onNavigateToTab || (() => {})}
          />
        </div>
      )}

      {/* SYSTEM DIAGNOSTICS TAB */}
      {activeTab === 'diagnostics' && (
        <div className="space-y-4">
          <AdminDiagnosticsView
            user={user}
            userSettings={userSettings}
            birds={birds}
            cages={cages}
            pairs={pairs}
            breedingRecords={breedingRecords}
            transactions={transactions}
            tasks={tasks}
            contacts={contacts}
            isOnline={isOnline}
            onToggleForceOffline={onToggleForceOffline}
            isForcedOffline={isForcedOffline}
          />
        </div>
      )}

      {/* Denial Reason Modal */}
      {rejectModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-black uppercase text-white tracking-wider">
                Deny {rejectModalData.type === 'seller' ? 'Seller Profile' : 'Listing'}
              </h3>
              <button onClick={() => setRejectModalData(null)} className="text-zinc-500 hover:text-white p-1">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-zinc-300">
              Please enter the specific reason for rejecting <strong>"{rejectModalData.name}"</strong>. This will be visible to the user.
            </p>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Reason for Denial *</label>
              <Textarea
                required
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="e.g. Please provide a verified physical town and valid contact number..."
                className="bg-zinc-900 border-zinc-800 text-xs min-h-[90px]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-800">
              <Button variant="secondary" onClick={() => setRejectModalData(null)} className="text-xs">
                Cancel
              </Button>
              <Button
                onClick={handleConfirmRejection}
                disabled={isProcessing}
                className="text-xs font-black uppercase tracking-wider bg-rose-600 hover:bg-rose-500 text-white"
              >
                {isProcessing ? 'Saving...' : 'Confirm Rejection'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

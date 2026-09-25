import React from 'react';
import { Loader2, CreditCard, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { UserSettings } from '../types';

export function SubscriptionGate({ settings, onRenew, children }: { settings: UserSettings | null, onRenew: () => void, children: React.ReactNode }) {
  if (!settings) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="text-gold-500 animate-spin" size={40} />
          <p className="text-black-100 font-black uppercase tracking-widest text-[10px]">Loading Account...</p>
        </div>
      </div>
    );
  }

  const expiryDate = settings.account_expiry_date ? new Date(settings.account_expiry_date) : null;
  const now = new Date();
  const userEmail = (settings.email || '').toLowerCase().trim();
  const adminEmails = [
    'clashfouche@gmail.com',
    'teamotakuempire@gmail.com',
    'theaveriansupport@gmail.com',
    'hencofouche8@gmail.com'
  ];
  const isAdmin = adminEmails.includes(userEmail) || settings.role === 'admin';
  
  const isLifetime = settings.subscriptionPlan === 'lifetime' || 
                    settings.isBetaTester === true || 
                    settings.canTestComingSoon === true ||
                    isAdmin ||
                    (expiryDate && expiryDate.getFullYear() > 2090);

  const isValidDate = expiryDate && !isNaN(expiryDate.getTime());
  const isExpired = isLifetime ? false : (isValidDate ? (now > expiryDate) : false);
  
  const diffTime = isValidDate ? expiryDate.getTime() - now.getTime() : 0;
  const daysLeft = isLifetime ? 99999 : Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  const [showVerifyModal, setShowVerifyModal] = React.useState(false);
  const [manualCheckoutId, setManualCheckoutId] = React.useState('');
  const [isVerifying, setIsVerifying] = React.useState(false);

  const handlePay = async () => {
    try {
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: window.location.origin,
          userId: settings.uid || '',
          userEmail: settings.email || '',
          userName: settings.displayName || settings.aviaryName || '',
          plan: 'yearly'
        })
      });
      const data = await response.json();
      if (data.id || data.checkoutId) {
        const checkoutId = data.id || data.checkoutId;
        localStorage.setItem('pending_yoco_checkout', JSON.stringify({
          checkoutId,
          userId: settings.uid,
          userEmail: settings.email,
          createdAt: Date.now()
        }));
      }
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        toast.error("Payment failed: " + (data.error || "Unknown error"));
      }
    } catch (error: any) {
      toast.error("Payment failed: " + error.message);
    }
  };

  const handleManualVerify = async () => {
    if (!manualCheckoutId.trim() && !settings.email) {
      toast.error("Please enter a Checkout ID or ensure your email is linked.");
      return;
    }
    setIsVerifying(true);
    try {
      const response = await fetch('/api/verify-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkoutId: manualCheckoutId.trim() || undefined,
          email: settings.email,
          userId: settings.uid
        })
      });
      const data = await response.json();
      if (data.verified || data.success) {
        toast.success("🎉 Payment verified! Updating subscription...");
        setShowVerifyModal(false);
        if (onRenew) onRenew();
        else window.location.reload();
      } else {
        toast.error(data.error || "Could not verify payment with Yoco. Please check your Checkout ID.");
      }
    } catch (err: any) {
      toast.error("Verification error: " + err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col">
      {isExpired ? (
        <div className="bg-rose-600 text-white px-4 py-2.5 text-center text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-2 flex-shrink-0 sticky top-0 z-30 shadow-md flex-wrap">
          <AlertTriangle size={15} className="shrink-0" />
          <span>Subscription Expired (Read-Only Mode) — You can view entries, but adding/editing is disabled.</span>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={handlePay} className="px-3 py-1 bg-white text-rose-700 font-bold rounded-full hover:bg-zinc-100 transition-colors uppercase text-[9px] tracking-widest flex items-center gap-1">
              <CreditCard size={12} />
              Renew Yearly
            </button>
            <button onClick={() => setShowVerifyModal(true)} className="px-2.5 py-1 bg-black/40 text-white hover:bg-black/60 rounded-full font-bold uppercase text-[9px] tracking-wider border border-white/20">
              Already Paid?
            </button>
          </div>
        </div>
      ) : (daysLeft <= 30) && (
        <div className="bg-gold-500 text-black-950 px-4 py-1.5 text-center text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 flex-shrink-0 sticky top-0 z-30 flex-wrap">
          <AlertTriangle size={14} />
          {daysLeft === 0 ? "Last day" : `${daysLeft} days left`} in your {daysLeft <= 30 ? 'trial' : 'subscription'}
          <button onClick={handlePay} className="ml-2 underline font-black hover:text-black transition-colors">Renew</button>
          <button onClick={() => setShowVerifyModal(true)} className="ml-2 bg-black/20 text-black px-2 py-0.5 rounded text-[9px] font-bold uppercase hover:bg-black/30">Verify Payment</button>
        </div>
      )}

      {/* Manual Payment Verification Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-black uppercase text-gold-400 tracking-wider flex items-center gap-2">
                <CreditCard size={18} />
                Verify / Restore Yoco Payment
              </h3>
              <button onClick={() => setShowVerifyModal(false)} className="text-zinc-400 hover:text-white text-xs font-bold">✕</button>
            </div>

            <p className="text-xs text-zinc-300">
              If you recently paid on Yoco for the 1-Year Pro plan and your account hasn't updated automatically, enter your Yoco Checkout ID or verify with your account email.
            </p>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Yoco Checkout ID (Optional if using account email)</label>
              <input
                type="text"
                value={manualCheckoutId}
                onChange={(e) => setManualCheckoutId(e.target.value)}
                placeholder="e.g. ch_1234567890..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-gold-500"
              />
              <p className="text-[10px] text-zinc-500">Checking for email: <span className="text-gold-400 font-mono">{settings.email || 'No email linked'}</span></p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowVerifyModal(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleManualVerify}
                disabled={isVerifying}
                className="px-4 py-2 bg-gold-500 hover:bg-gold-400 text-black rounded-xl text-xs font-black uppercase"
              >
                {isVerifying ? 'Verifying...' : 'Check Payment & Activate'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex-grow">
        {children}
      </div>
    </div>
  );
}

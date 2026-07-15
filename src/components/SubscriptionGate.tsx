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
  
  const isValidDate = expiryDate && !isNaN(expiryDate.getTime());
  const isExpired = !isValidDate || now > expiryDate;
  
  const diffTime = isValidDate ? expiryDate.getTime() - now.getTime() : 0;
  const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  const handlePay = async () => {
    try {
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: window.location.origin })
      });
      const data = await response.json();
      if (data.redirectUrl) {
         window.location.href = data.redirectUrl;
      } else {
        toast.error("Payment failed: " + (data.error || "Unknown error"));
      }
    } catch (error: any) {
      toast.error("Payment failed: " + error.message);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col">
      {isExpired ? (
        <div className="bg-rose-600 text-white px-4 py-2.5 text-center text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-2 flex-shrink-0 sticky top-0 z-[60] shadow-md">
          <AlertTriangle size={15} className="shrink-0" />
          <span>Subscription Expired (Read-Only Mode) — You can view your entries, but adding/editing is disabled.</span>
          <button onClick={handlePay} className="ml-4 px-3 py-1 bg-white text-rose-700 font-bold rounded-full hover:bg-zinc-100 transition-colors uppercase text-[9px] tracking-widest flex items-center gap-1 shrink-0">
            <CreditCard size={12} />
            Renew Now
          </button>
        </div>
      ) : (daysLeft <= 30) && (
        <div className="bg-gold-500 text-black-950 px-4 py-1.5 text-center text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 flex-shrink-0 sticky top-0 z-[60]">
          <AlertTriangle size={14} />
          {daysLeft === 0 ? "Last day" : `${daysLeft} days left`} in your {daysLeft <= 30 ? 'trial' : 'subscription'}
          <button onClick={handlePay} className="ml-2 underline font-black hover:text-black transition-colors">Renew</button>
        </div>
      )}
      <div className="flex-grow">
        {children}
      </div>
    </div>
  );
}

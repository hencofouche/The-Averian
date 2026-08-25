import React from 'react';
import { ShieldAlert, AlertTriangle, LogOut, Mail, Lock, ExternalLink } from 'lucide-react';
import { Button, Card } from './ui';
import { format } from 'date-fns';

interface BannedUserScreenProps {
  user: any;
  userSettings?: any;
  onLogout: () => void;
}

export function BannedUserScreen({
  user,
  userSettings,
  onLogout
}: BannedUserScreenProps) {
  const banReason = userSettings?.banReason || 'Account suspended by administrator for violation of terms of service or community guidelines.';
  const bannedAt = userSettings?.bannedAt ? new Date(userSettings.bannedAt) : null;
  const adminContactEmail = 'clashfouche@gmail.com';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black p-4 select-none">
      <div className="w-full max-w-lg space-y-6 text-center animate-in zoom-in-95 duration-300">
        {/* Shield Icon */}
        <div className="relative inline-flex items-center justify-center">
          <div className="w-24 h-24 rounded-3xl bg-rose-500/10 border-2 border-rose-500/40 text-rose-400 flex items-center justify-center shadow-2xl shadow-rose-500/20">
            <ShieldAlert size={48} className="text-rose-500 animate-pulse" />
          </div>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg border-2 border-black">
            <Lock size={16} />
          </div>
        </div>

        {/* Header Text */}
        <div className="space-y-2">
          <span className="px-3 py-1 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-full text-xs font-black uppercase tracking-widest">
            Access Restricted
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Account Suspended
          </h1>
          <p className="text-zinc-400 text-sm">
            The account associated with <strong className="text-white font-mono">{user?.email}</strong> has been suspended.
          </p>
        </div>

        {/* Ban Details Card */}
        <Card className="p-5 bg-zinc-950/90 border-rose-500/20 rounded-2xl text-left space-y-3 shadow-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-rose-300">
                Reason for Suspension
              </h4>
              <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                {banReason}
              </p>
            </div>
          </div>

          {bannedAt && !isNaN(bannedAt.getTime()) && (
            <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
              <span>Date of Action:</span>
              <span className="font-mono text-zinc-400">{format(bannedAt, 'dd MMMM yyyy, HH:mm')}</span>
            </div>
          )}

          <div className="pt-2 border-t border-zinc-800/80 text-[11px] text-zinc-400">
            <p>While suspended, you cannot access your aviary records, pedigree charts, marketplace listings, or breeding data.</p>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <a
            href={`mailto:${adminContactEmail}?subject=Account%20Suspension%20Appeal%20-%20${encodeURIComponent(user?.email || '')}&body=Hello%20Administrator,%0D%0A%0D%0AI%20would%20like%20to%20request%20a%20review%20of%20the%20suspension%20for%20my%20account%20(${encodeURIComponent(user?.email || '')}).%0D%0A%0D%0AUID:%20${user?.uid}%0D%0A%0D%0AThank%20you.`}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-bold uppercase tracking-wider transition-all"
          >
            <Mail size={14} className="text-gold-400" />
            Contact Administrator / Appeal
          </a>

          <Button
            onClick={onLogout}
            variant="secondary"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold uppercase tracking-wider"
          >
            <LogOut size={14} />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}

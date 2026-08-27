import React, { useState, useEffect } from 'react';
import { Shield, ShieldCheck, CheckCircle2, Sparkles, ExternalLink, RefreshCw, AlertCircle, ArrowRight, X, Lock, Check } from 'lucide-react';
import { Button } from './ui';
import { toast } from 'sonner';
import { doc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { SellerProfile } from '../types';
import { cn } from '../lib/utils';

interface DiditVerificationModalProps {
  user: any;
  sellerProfile: SellerProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function DiditVerificationModal({
  user,
  sellerProfile,
  isOpen,
  onClose,
  onSuccess
}: DiditVerificationModalProps) {
  const [step, setStep] = useState<'intro' | 'loading' | 'active' | 'success' | 'failed'>('intro');
  const [sessionData, setSessionData] = useState<{
    sessionId: string;
    sessionUrl: string;
    isLive: boolean;
  } | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep('intro');
      setSessionData(null);
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartVerification = async () => {
    setStep('loading');
    setErrorMessage(null);

    try {
      const response = await fetch('/api/didit/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.uid,
          email: user?.email,
          sellerName: sellerProfile?.sellerName || user?.displayName || '',
          aviaryName: sellerProfile?.aviaryName || '',
          sellerProfileId: sellerProfile?.id || '',
          redirectUrl: window.location.origin
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Unable to initiate Didit verification session');
      }

      setSessionData({
        sessionId: data.sessionId,
        sessionUrl: data.sessionUrl,
        isLive: Boolean(data.isLive)
      });
      setStep('active');

      // If in live mode, open Didit session in a popup or new tab
      if (data.isLive && data.sessionUrl) {
        window.open(data.sessionUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err: any) {
      console.error('Failed to start Didit verification:', err);
      setErrorMessage(err.message || 'Verification service error. Please try again or use Admin review.');
      setStep('failed');
    }
  };

  const handleCheckStatus = async () => {
    if (!sessionData?.sessionId) return;
    setIsPolling(true);

    try {
      const res = await fetch(`/api/didit/session/${sessionData.sessionId}/status`);
      const data = await res.json();

      const isApproved = data.status === 'Approved' || data.decision?.status === 'Approved';

      if (isApproved) {
        // Update or create seller profile in Firestore
        if (sellerProfile?.id) {
          await updateDoc(doc(db, 'sellerProfiles', sellerProfile.id), {
            status: 'approved',
            verifiedBy: 'Didit AI (Automated KYC)',
            verificationMethod: 'didit',
            diditSessionId: sessionData.sessionId,
            diditStatus: 'Approved',
            diditVerifiedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        } else if (user) {
          await addDoc(collection(db, 'sellerProfiles'), {
            uid: user.uid,
            sellerName: user.displayName || user.email?.split('@')[0] || 'Verified Breeder',
            aviaryName: (user.displayName || 'Averian') + ' Aviary',
            country: 'South Africa',
            whatsapp: '',
            phone: '',
            email: user.email || '',
            status: 'approved',
            verifiedBy: 'Didit AI (Automated KYC)',
            verificationMethod: 'didit',
            diditSessionId: sessionData.sessionId,
            diditStatus: 'Approved',
            diditVerifiedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
        setStep('success');
        toast.success('Identity Verified Successfully! Verified Seller Badge activated.');
        if (onSuccess) onSuccess();
      } else if (data.status === 'Declined' || data.decision?.status === 'Declined') {
        setErrorMessage('Verification was declined. Please ensure your photo ID is clear and unexpired.');
        setStep('failed');
      } else {
        toast('Verification in progress. Please complete the steps on Didit and check again.');
      }
    } catch (err: any) {
      console.error('Failed to poll Didit status:', err);
      toast.error('Failed to check status: ' + err.message);
    } finally {
      setIsPolling(false);
    }
  };

  // Demo simulator for sandbox instant approve
  const handleSimulateInstantApproval = async () => {
    setIsPolling(true);
    try {
      const sessionId = sessionData?.sessionId || `didit_test_${Date.now()}`;
      if (sellerProfile?.id) {
        await updateDoc(doc(db, 'sellerProfiles', sellerProfile.id), {
          status: 'approved',
          verifiedBy: 'Didit AI (Automated KYC)',
          verificationMethod: 'didit',
          diditSessionId: sessionId,
          diditStatus: 'Approved',
          diditVerifiedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      } else if (user) {
        await addDoc(collection(db, 'sellerProfiles'), {
          uid: user.uid,
          sellerName: user.displayName || user.email?.split('@')[0] || 'Verified Breeder',
          aviaryName: (user.displayName || 'Averian') + ' Aviary',
          country: 'South Africa',
          whatsapp: '',
          phone: '',
          email: user.email || '',
          status: 'approved',
          verifiedBy: 'Didit AI (Automated KYC)',
          verificationMethod: 'didit',
          diditSessionId: sessionId,
          diditStatus: 'Approved',
          diditVerifiedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      setStep('success');
      toast.success('Identity Verified! Seller status approved.');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error('Error updating status: ' + err.message);
    } finally {
      setIsPolling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-7 relative overflow-hidden shadow-2xl space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white uppercase tracking-wider">
                  Didit AI Identity Verification
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Automated KYC
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-medium mt-0.5">
                Powered by Didit.me • Instant Verified Breeder Status
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white p-1 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Intro Step */}
        {step === 'intro' && (
          <div className="space-y-5">
            <div className="p-4 bg-gradient-to-r from-zinc-900 via-zinc-900/80 to-zinc-950 border border-zinc-800 rounded-2xl space-y-2.5">
              <span className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Sparkles size={14} /> Why verify with Didit.me?
              </span>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Automated biometric and document verification gives your buyer community 100% confidence. Get your <strong className="text-white">Verified Breeder Badge</strong> instantly without waiting for manual admin approval.
              </p>
            </div>

            <div className="space-y-2.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 block">
                Verification Steps (Takes &lt; 2 Minutes):
              </span>
              <div className="grid grid-cols-1 gap-2 text-xs">
                <div className="flex items-center gap-3 p-2.5 bg-zinc-900/40 border border-zinc-800/80 rounded-xl text-zinc-300">
                  <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs shrink-0">1</div>
                  <span><strong>Government ID Scan</strong> (National ID, Passport, or Driver&apos;s License)</span>
                </div>
                <div className="flex items-center gap-3 p-2.5 bg-zinc-900/40 border border-zinc-800/80 rounded-xl text-zinc-300">
                  <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs shrink-0">2</div>
                  <span><strong>Biometric Liveness Check</strong> (3D selfie scan to prove identity)</span>
                </div>
                <div className="flex items-center gap-3 p-2.5 bg-zinc-900/40 border border-zinc-800/80 rounded-xl text-zinc-300">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">3</div>
                  <span><strong>Instant Verified Seller Badge</strong> unlocked on Marketplace</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-zinc-900/30 border border-zinc-800/50 rounded-xl text-[11px] text-zinc-400">
              <Lock size={14} className="text-zinc-400 shrink-0" />
              <span>Your privacy is encrypted end-to-end. Identity documents are processed securely via Didit.me.</span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={onClose} className="text-xs font-semibold">
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleStartVerification}
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-wider text-xs px-5 py-2.5 shadow-lg shadow-cyan-500/20"
              >
                Start Didit Verification <ArrowRight size={14} className="ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Loading Step */}
        {step === 'loading' && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <RefreshCw size={36} className="text-cyan-400 animate-spin" />
            <div>
              <p className="text-sm font-bold text-white">Connecting to Didit.me Verification Engine...</p>
              <p className="text-xs text-zinc-400 mt-1">Generating secure encrypted biometric KYC session</p>
            </div>
          </div>
        )}

        {/* Active Step (Waiting for user completion) */}
        {step === 'active' && sessionData && (
          <div className="space-y-5">
            <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl space-y-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto">
                <Shield size={24} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Verification Session Active</h4>
                <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                  Complete the ID scan & selfie on Didit. When done, click the button below to confirm and activate your badge.
                </p>
              </div>

              {sessionData.sessionUrl && (
                <div className="pt-2">
                  <a
                    href={sessionData.sessionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold text-xs hover:bg-cyan-500/30 transition-all"
                  >
                    <span>Open Didit Verification Portal</span>
                    <ExternalLink size={14} />
                  </a>
                </div>
              )}
            </div>

            <div className="p-3 bg-zinc-900/40 border border-zinc-800 rounded-xl space-y-1 text-xs text-zinc-400">
              <p className="font-semibold text-zinc-300">Session Reference:</p>
              <p className="font-mono text-[11px] text-cyan-300/80 truncate">{sessionData.sessionId}</p>
            </div>

            <div className="space-y-2 pt-2">
              <Button
                type="button"
                onClick={handleCheckStatus}
                disabled={isPolling}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-wider text-xs py-3 shadow-lg shadow-emerald-500/20"
              >
                {isPolling ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw size={14} className="animate-spin" /> Verifying Status with Didit...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CheckCircle2 size={16} /> I Have Completed Verification
                  </span>
                )}
              </Button>

              {!sessionData.isLive && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSimulateInstantApproval}
                  disabled={isPolling}
                  className="w-full text-xs font-bold text-zinc-300 border-zinc-800"
                >
                  ⚡ Sandbox Instant Approve (Test Mode)
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <CheckCircle2 size={36} />
            </div>
            <div>
              <h4 className="text-lg font-black text-white uppercase tracking-wider">
                Identity Verified & Approved!
              </h4>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                Your breeder profile has been verified with Didit AI. The Verified Seller badge is now visible on all your marketplace listings.
              </p>
            </div>
            <Button
              type="button"
              onClick={onClose}
              className="bg-gold-500 hover:bg-gold-400 text-black font-black uppercase tracking-wider text-xs px-6 py-2.5 mt-2"
            >
              Done & Return to Marketplace
            </Button>
          </div>
        )}

        {/* Failed Step */}
        {step === 'failed' && (
          <div className="space-y-4">
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-3 text-rose-300">
              <AlertCircle size={20} className="shrink-0 mt-0.5 text-rose-400" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-white">Verification Notice</p>
                <p>{errorMessage || 'Didit was unable to verify the provided credentials.'}</p>
              </div>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Don&apos;t worry! You can either retry the Didit automated verification with a clearer document, or submit your profile for manual approval by an Admin.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={onClose} className="text-xs font-semibold">
                Close
              </Button>
              <Button
                type="button"
                onClick={handleStartVerification}
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs"
              >
                Retry Didit Scan
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

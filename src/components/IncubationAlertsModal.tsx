import React from 'react';
import { 
  Bell, BellRing, CheckCircle2, Clock, Flame, 
  Egg, AlertCircle, X, ShieldAlert, Sparkles, ChevronRight 
} from 'lucide-react';
import { IncubationReminderItem } from '../lib/notifications';
import { Button, Badge } from './ui';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

interface IncubationAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reminders: IncubationReminderItem[];
  isPermissionGranted: boolean;
  isPermissionSupported: boolean;
  onRequestPermission: () => void;
  isRequesting: boolean;
  onNavigateToBreeding?: () => void;
}

export function IncubationAlertsModal({
  isOpen,
  onClose,
  reminders,
  isPermissionGranted,
  isPermissionSupported,
  onRequestPermission,
  isRequesting,
  onNavigateToBreeding
}: IncubationAlertsModalProps) {
  if (!isOpen) return null;

  const urgentCount = reminders.filter(r => r.urgency === 'urgent' || r.urgency === 'today').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <BellRing size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                Incubation Alerts
                {urgentCount > 0 && (
                  <Badge variant="warning" className="text-[10px] px-2 py-0.5 font-bold">
                    {urgentCount} Due Now
                  </Badge>
                )}
              </h3>
              <p className="text-xs text-zinc-400 font-medium">
                Real-time egg candling, lockdown, and hatch reminders
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-900 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Browser Push Permission State Banner */}
        <div className={cn(
          "p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shrink-0",
          isPermissionGranted 
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
            : "bg-amber-500/10 border-amber-500/30 text-amber-200"
        )}>
          <div className="flex items-center gap-3">
            {isPermissionGranted ? (
              <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
            ) : (
              <Bell size={20} className="text-amber-400 shrink-0" />
            )}
            <div>
              <p className="font-bold text-white text-sm">
                {isPermissionGranted 
                  ? 'Push Alerts Enabled' 
                  : 'Enable Push Notifications'}
              </p>
              <p className="text-xs opacity-80 mt-0.5">
                {isPermissionGranted
                  ? 'You will receive automatic alerts on your device for egg candling and hatch dates.'
                  : 'Allow push alerts to get notified even when the app is minimized or closed.'}
              </p>
            </div>
          </div>

          {!isPermissionGranted && isPermissionSupported && (
            <Button
              onClick={onRequestPermission}
              disabled={isRequesting}
              className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider px-3.5 py-2 rounded-xl shrink-0 h-auto cursor-pointer"
            >
              {isRequesting ? 'Enabling...' : 'Enable Push Alerts'}
            </Button>
          )}
        </div>

        {/* Reminders List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2.5 pr-1">
          {reminders.length === 0 ? (
            <div className="p-8 text-center bg-zinc-900/40 rounded-2xl border border-zinc-800 space-y-2">
              <Egg size={32} className="mx-auto text-zinc-600" />
              <p className="font-bold text-white text-sm">No Active Egg Milestones</p>
              <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                Eggs logged in your breeding records will appear here as they approach candling, lockdown, or hatch dates.
              </p>
            </div>
          ) : (
            reminders.map(item => {
              const isUrgent = item.urgency === 'urgent' || item.urgency === 'today';
              return (
                <div 
                  key={item.id}
                  className={cn(
                    "p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3",
                    isUrgent
                      ? "bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/5"
                      : "bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border",
                      item.type === 'candling' ? "bg-amber-500/15 border-amber-500/30 text-amber-400" :
                      item.type === 'hatch' ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" :
                      item.type === 'lockdown' ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-400" :
                      "bg-purple-500/15 border-purple-500/30 text-purple-400"
                    )}>
                      {item.type === 'candling' ? <Flame size={18} /> :
                       item.type === 'hatch' ? <Egg size={18} /> :
                       item.type === 'lockdown' ? <Clock size={18} /> :
                       <Sparkles size={18} />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-white text-sm truncate">
                          {item.title}
                        </p>
                        <span className={cn(
                          "text-[9px] font-black uppercase px-2 py-0.5 rounded-md shrink-0",
                          item.urgency === 'urgent' ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" :
                          item.urgency === 'today' ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                          "bg-zinc-800 text-zinc-400"
                        )}>
                          {item.urgency === 'urgent' ? 'Overdue' :
                           item.urgency === 'today' ? 'Due Today' :
                           `${item.daysUntil}d away`}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 truncate mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-mono font-bold text-zinc-300 block">
                      {format(new Date(item.dueDate), 'MMM dd')}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-medium capitalize">
                      {item.type}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 pt-4 flex items-center justify-between shrink-0 text-xs text-zinc-500">
          <span>Species-calibrated incubation timelines</span>
          <Button
            onClick={() => {
              onClose();
              if (onNavigateToBreeding) onNavigateToBreeding();
            }}
            variant="secondary"
            className="text-xs font-semibold py-2 px-3 bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white"
          >
            Go to Breeding Records <ChevronRight size={14} className="ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}

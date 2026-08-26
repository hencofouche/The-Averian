import { BreedingRecord, Bird } from '../types';
import { computeEggTimeline, SPECIES_INCUBATION_DATA } from '../components/SmartCandlingModal';
import { format, parseISO, differenceInDays, addDays } from 'date-fns';

export interface IncubationReminderItem {
  id: string;
  type: 'candling' | 'lockdown' | 'hatch' | 'ringing';
  title: string;
  description: string;
  body: string;
  dueDate: string;
  daysUntil: number;
  urgency: 'urgent' | 'today' | 'upcoming' | 'info';
  eggIndex?: number;
  clutchId?: string;
  pairName?: string;
  speciesName?: string;
}

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error('Failed to request notification permission:', err);
    return 'denied';
  }
}

/**
 * Dispatch a rich notification via Service Worker (if available) or standard Web Notification API
 */
export async function sendNotification(title: string, options?: NotificationOptions): Promise<boolean> {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  const defaultOptions: NotificationOptions = {
    icon: 'https://i.ibb.co/MyMQMS1J/icon-192.png',
    badge: 'https://i.ibb.co/MyMQMS1J/icon-192.png',
    tag: 'averian-incubation-reminder',
    ...options
  };

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && registration.showNotification) {
        await registration.showNotification(title, defaultOptions);
        return true;
      }
    }
    // Fallback
    new Notification(title, defaultOptions);
    return true;
  } catch (err) {
    console.warn('Could not dispatch notification directly:', err);
    try {
      new Notification(title, defaultOptions);
      return true;
    } catch (_) {
      return false;
    }
  }
}

/**
 * Evaluates all active breeding clutches and eggs to calculate incubation reminders for today and upcoming milestones.
 */
export function getActiveIncubationReminders(records: BreedingRecord[], birds: Bird[]): IncubationReminderItem[] {
  const reminders: IncubationReminderItem[] = [];
  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');

  records.forEach(rec => {
    const pairTitle = `Clutch #${rec.id.slice(0, 6)}`;
    const species = 'Bird';

    (rec.eggs || []).forEach((egg, index) => {
      // Only monitor eggs in active incubation stages
      if (egg.status !== 'Laid' && egg.status !== 'Fertile') {
        // Also check if hatched and needs close-ringing
        if (egg.status === 'Hatched' && egg.actualHatchDate) {
          try {
            const hatchDate = parseISO(egg.actualHatchDate);
            const ringingDay = rec.ringingDays || 7;
            const ringTargetDate = addDays(hatchDate, ringingDay);
            const daysUntilRing = differenceInDays(ringTargetDate, now);

            if (daysUntilRing <= 1 && daysUntilRing >= -2) {
              const ringDueDateStr = format(ringTargetDate, 'yyyy-MM-dd');
              const urgency: 'urgent' | 'today' | 'upcoming' | 'info' = 
                daysUntilRing < 0 ? 'urgent' :
                daysUntilRing === 0 ? 'today' : 'upcoming';

              reminders.push({
                id: `ring_${rec.id}_egg_${index + 1}`,
                type: 'ringing',
                title: `💍 Close-Ringing: Egg #${index + 1} Chick`,
                description: `Chick is ${differenceInDays(now, hatchDate)} days old. Band with closed ring.`,
                body: `Clutch egg #${index + 1} is due for close-ringing today (Day ${ringingDay}).`,
                dueDate: ringDueDateStr,
                daysUntil: daysUntilRing,
                urgency,
                eggIndex: index + 1,
                clutchId: rec.id,
                pairName: pairTitle,
                speciesName: species
              });
            }
          } catch (_) {}
        }
        return;
      }

      if (!egg.laidDate) return;

      const timeline = computeEggTimeline(egg, rec.incubationDays, rec.ringingDays, species);
      const daysSinceLaid = timeline.daysSinceLaid;
      const daysUntilHatch = timeline.daysUntilHatch;

      // 1. CANDLING DAY REMINDER (Day candlingDay ± 1)
      if (daysSinceLaid >= timeline.candlingDay - 1 && daysSinceLaid <= timeline.candlingDay + 1) {
        const diff = timeline.candlingDay - daysSinceLaid;
        const urgency: 'urgent' | 'today' | 'upcoming' | 'info' = 
          diff < 0 ? 'urgent' : diff === 0 ? 'today' : 'upcoming';

        reminders.push({
          id: `candling_${rec.id}_egg_${index + 1}`,
          type: 'candling',
          title: `🕯️ Candling ${diff === 0 ? 'Due Today' : diff < 0 ? 'Overdue' : 'Tomorrow'}: Egg #${index + 1}`,
          description: `Day ${daysSinceLaid} of ${timeline.actualIncubation}d incubation. Check embryo veins.`,
          body: `Egg #${index + 1} has reached Day ${daysSinceLaid}. Perform candling to verify fertility.`,
          dueDate: format(timeline.candlingDate, 'yyyy-MM-dd'),
          daysUntil: diff,
          urgency,
          eggIndex: index + 1,
          clutchId: rec.id,
          pairName: pairTitle,
          speciesName: species
        });
      }

      // 2. LOCKDOWN / PIP ALERT (2 days before expected hatch)
      if (daysUntilHatch === 2) {
        reminders.push({
          id: `lockdown_${rec.id}_egg_${index + 1}`,
          type: 'lockdown',
          title: `🔒 Lockdown & Humidity: Egg #${index + 1}`,
          description: `48 hours away from hatch. Increase humidity & avoid nest disturbance.`,
          body: `Egg #${index + 1} is 48 hours away from expected hatch. Prepare lockdown humidity.`,
          dueDate: format(timeline.hatchDate, 'yyyy-MM-dd'),
          daysUntil: 2,
          urgency: 'upcoming',
          eggIndex: index + 1,
          clutchId: rec.id,
          pairName: pairTitle,
          speciesName: species
        });
      }

      // 3. EXPECTED HATCH DAY REMINDER
      if (daysUntilHatch <= 1 && daysUntilHatch >= -3) {
        const urgency: 'urgent' | 'today' | 'upcoming' | 'info' = 
          daysUntilHatch < 0 ? 'urgent' :
          daysUntilHatch === 0 ? 'today' : 'upcoming';

        reminders.push({
          id: `hatch_${rec.id}_egg_${index + 1}`,
          type: 'hatch',
          title: daysUntilHatch === 0 
            ? `🐣 Hatching Today: Egg #${index + 1}` 
            : daysUntilHatch < 0 
            ? `⚠️ Overdue Hatch (+${Math.abs(daysUntilHatch)}d): Egg #${index + 1}`
            : `🐣 Hatching Tomorrow: Egg #${index + 1}`,
          description: daysUntilHatch === 0 
            ? `Expected hatch day! Monitor for pip progress.` 
            : daysUntilHatch < 0 
            ? `${Math.abs(daysUntilHatch)}d past expected hatch date. Candle to check heartbeat.` 
            : `Due to hatch tomorrow.`,
          body: `Egg #${index + 1} expected hatch milestone is ${daysUntilHatch === 0 ? 'today' : daysUntilHatch < 0 ? 'overdue' : 'tomorrow'}.`,
          dueDate: format(timeline.hatchDate, 'yyyy-MM-dd'),
          daysUntil: daysUntilHatch,
          urgency,
          eggIndex: index + 1,
          clutchId: rec.id,
          pairName: pairTitle,
          speciesName: species
        });
      }
    });
  });

  return reminders;
}

/**
 * Checks and dispatches push/local notifications for today's active incubation reminders.
 * Automatically deduplicates via localStorage.
 */
export async function syncAndDispatchIncubationAlerts(records: BreedingRecord[], birds: Bird[]): Promise<number> {
  if (getNotificationPermission() !== 'granted') {
    return 0;
  }

  const reminders = getActiveIncubationReminders(records, birds);
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  let dispatchedCount = 0;

  for (const item of reminders) {
    if (item.urgency === 'urgent' || item.urgency === 'today') {
      const storageKey = `averian_notif_sent_${item.id}_${todayStr}`;
      const alreadySent = localStorage.getItem(storageKey);

      if (!alreadySent) {
        const sent = await sendNotification(item.title, {
          body: item.description,
          tag: item.id
        });

        if (sent) {
          localStorage.setItem(storageKey, new Date().toISOString());
          dispatchedCount++;
        }
      }
    }
  }

  return dispatchedCount;
}

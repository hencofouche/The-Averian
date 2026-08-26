import { useState, useEffect, useCallback } from 'react';
import { BreedingRecord, Bird } from '../types';
import { 
  getNotificationPermission, 
  requestNotificationPermission, 
  syncAndDispatchIncubationAlerts, 
  getActiveIncubationReminders, 
  sendNotification,
  IncubationReminderItem 
} from '../lib/notifications';
import { toast } from 'sonner';

export function useIncubationNotifications(breedingRecords: BreedingRecord[] = [], birds: Bird[] = []) {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [reminders, setReminders] = useState<IncubationReminderItem[]>([]);
  const [isRequesting, setIsRequesting] = useState(false);

  // Initialize permission state
  useEffect(() => {
    setPermission(getNotificationPermission());
  }, []);

  // Compute reminders
  useEffect(() => {
    const activeReminders = getActiveIncubationReminders(breedingRecords, birds);
    setReminders(activeReminders);
  }, [breedingRecords, birds]);

  // Sync and dispatch notifications on load, focus, or record update
  useEffect(() => {
    if (permission === 'granted' && breedingRecords.length > 0) {
      syncAndDispatchIncubationAlerts(breedingRecords, birds).then((count) => {
        if (count > 0) {
          console.log(`[Incubation Notifications] Dispatched ${count} egg incubation reminder(s).`);
        }
      });
    }
  }, [permission, breedingRecords, birds]);

  // Re-check on window focus
  useEffect(() => {
    const handleFocus = () => {
      setPermission(getNotificationPermission());
      if (getNotificationPermission() === 'granted' && breedingRecords.length > 0) {
        syncAndDispatchIncubationAlerts(breedingRecords, birds);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [breedingRecords, birds]);

  // Request permission action
  const enableNotifications = useCallback(async () => {
    setIsRequesting(true);
    try {
      const result = await requestNotificationPermission();
      setPermission(result);
      if (result === 'granted') {
        toast.success('Incubation push alerts enabled! You will be alerted for candling, lockdown, and hatch dates.');
        await sendNotification('🐣 Incubation Notifications Activated', {
          body: 'The Averian will alert you when eggs are ready for candling, lockdown, and hatching!'
        });
        await syncAndDispatchIncubationAlerts(breedingRecords, birds);
      } else if (result === 'denied') {
        toast.error('Notification permission was blocked in your browser settings.');
      }
    } catch (err: any) {
      toast.error('Failed to enable notifications: ' + err.message);
    } finally {
      setIsRequesting(false);
    }
  }, [breedingRecords, birds]);

  return {
    permission,
    isSupported: permission !== 'unsupported',
    isGranted: permission === 'granted',
    reminders,
    enableNotifications,
    isRequesting
  };
}

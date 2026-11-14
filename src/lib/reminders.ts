import { apiRequest } from './api';
import type { FocusTask, Language } from '../types/brave';

export interface PushStatusResponse {
  publicKey: string;
  subscriptionsCount: number;
  endpoints: string[];
  reminderTime: string;
}

export function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function getReadyRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) {
    return navigator.serviceWorker.ready;
  }
  // Fallback registration if VitePWA dev worker hasn't registered yet
  await navigator.serviceWorker.register('/sw-push.js');
  return navigator.serviceWorker.ready;
}

export async function fetchPushStatus(): Promise<PushStatusResponse> {
  return apiRequest<PushStatusResponse>('/api/push/status');
}

export async function checkCurrentDeviceSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return false;
    const sub = await reg.pushManager.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
}

export async function enableDevicePush(
  reminderTime: string
): Promise<{ subscribed: boolean; reminderTime: string }> {
  if (!isPushSupported()) {
    throw new Error('PUSH_UNSUPPORTED');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('PERMISSION_DENIED');
  }

  const status = await fetchPushStatus();
  const registration = await getReadyRegistration();

  let sub = await registration.pushManager.getSubscription();
  if (!sub) {
    const keyBytes = urlBase64ToUint8Array(status.publicKey);
    sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes.buffer as ArrayBuffer,
    });
  }

  const jsonSub = sub.toJSON();
  return apiRequest<{ subscribed: boolean; reminderTime: string }>(
    '/api/push/subscribe',
    {
      method: 'POST',
      body: JSON.stringify({
        subscription: jsonSub,
        reminderTime,
        timezoneOffsetMinutes: new Date().getTimezoneOffset(),
      }),
    }
  );
}

export async function disableDevicePush(): Promise<void> {
  let endpoint: string | undefined;
  if (isPushSupported()) {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      endpoint = sub.endpoint;
      await sub.unsubscribe();
    }
  }
  await apiRequest('/api/push/unsubscribe', {
    method: 'DELETE',
    body: JSON.stringify({ endpoint }),
  });
}

export async function updatePushSchedule(
  reminderTime: string
): Promise<{ updated: boolean; reminderTime: string }> {
  return apiRequest<{ updated: boolean; reminderTime: string }>(
    '/api/push/schedule',
    {
      method: 'PUT',
      body: JSON.stringify({
        reminderTime,
        timezoneOffsetMinutes: new Date().getTimezoneOffset(),
      }),
    }
  );
}

export async function triggerTestNotification(
  lang: Language
): Promise<'push' | 'local'> {
  const res = await apiRequest<{ sent: number; failed: number }>(
    '/api/push/test',
    {
      method: 'POST',
    }
  );
  if (res.sent > 0) return 'push';

  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    if (Notification.permission === 'granted') {
      const title =
        lang === 'vi'
          ? 'BRAVE · Thông báo thử nghiệm'
          : 'BRAVE · Test Notification';
      const body =
        lang === 'vi'
          ? 'Thông báo đã sẵn sàng! BRAVE sẽ nhắc bạn nhẹ nhàng mỗi ngày.'
          : 'Notifications are ready! BRAVE will gently remind you every day.';
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: 'brave-local-test',
        });
      } else {
        new Notification(title, { body, icon: '/pwa-192x192.png' });
      }
      return 'local';
    }
  }
  throw new Error('NO_ACTIVE_SUBSCRIPTION');
}

function escapeICS(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function formatICSLocalDateTime(dateStr: string, timeStr: string): string {
  const cleanDate = dateStr.replace(/-/g, '');
  const [hh = '09', mm = '00'] = timeStr.split(':');
  return `${cleanDate}T${hh.padStart(2, '0')}${mm.padStart(2, '0')}00`;
}

function addMinutesToTime(dateStr: string, timeStr: string, addMins: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh = 9, mm = 0] = timeStr.split(':').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1, hh, mm + addMins, 0);
  const yy = dt.getFullYear();
  const mo = String(dt.getMonth() + 1).padStart(2, '0');
  const da = String(dt.getDate()).padStart(2, '0');
  const h2 = String(dt.getHours()).padStart(2, '0');
  const m2 = String(dt.getMinutes()).padStart(2, '0');
  return `${yy}${mo}${da}T${h2}${m2}00`;
}

function triggerICSDownload(filename: string, icsContent: string) {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function downloadTaskICS(task: FocusTask, lang: Language) {
  const time = task.scheduledTime || '09:00';
  const dtStart = formatICSLocalDateTime(task.scheduledDate, time);
  const dtEnd = addMinutesToTime(
    task.scheduledDate,
    time,
    task.durationMinutes || 25
  );
  const descParts = [
    task.tinyFirstStep
      ? `${lang === 'vi' ? 'Bước 2 phút đầu tiên' : '2-minute first step'}: ${task.tinyFirstStep}`
      : '',
    task.notes || '',
    `${lang === 'vi' ? 'Mở BRAVE' : 'Open BRAVE'}: ${window.location.origin}`,
  ].filter(Boolean);

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BRAVE//Planner Reminder//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:brave-task-${task.id}@brave.app`,
    `DTSTAMP:${dtStart}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeICS(`[BRAVE] ${task.title}`)}`,
    `DESCRIPTION:${escapeICS(descParts.join('\n'))}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeICS(task.title)}`,
    'TRIGGER:-PT15M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  triggerICSDownload(`brave-task-${task.id}.ics`, ics);
}

export function downloadDailyReminderICS(reminderTime: string, lang: Language) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;
  const cleanTime = /^\d{2}:\d{2}$/.test(reminderTime) ? reminderTime : '20:00';
  const dtStart = formatICSLocalDateTime(todayStr, cleanTime);
  const dtEnd = addMinutesToTime(todayStr, cleanTime, 10);

  const summary =
    lang === 'vi'
      ? 'BRAVE · Check-in dũng cảm & việc hôm nay (2 phút)'
      : 'BRAVE · Daily courage & focus check-in (2 min)';
  const desc =
    lang === 'vi'
      ? `Mở BRAVE để hoàn thành bước nhỏ hôm nay và giữ chuỗi tiến bộ: ${window.location.origin}`
      : `Open BRAVE for your tiny daily step and keep your streak alive: ${window.location.origin}`;

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BRAVE//Daily Check-in//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    'UID:brave-daily-checkin@brave.app',
    `DTSTAMP:${dtStart}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    'RRULE:FREQ=DAILY',
    `SUMMARY:${escapeICS(summary)}`,
    `DESCRIPTION:${escapeICS(desc)}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeICS(summary)}`,
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  triggerICSDownload('brave-daily-reminder.ics', ics);
}

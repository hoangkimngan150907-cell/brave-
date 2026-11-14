import { createRequire } from 'module';
import { and, eq, isNotNull, isNull, ne } from 'drizzle-orm';
import type webpushTypes from 'web-push';

const require = createRequire(import.meta.url);
const webpush = require('web-push') as typeof webpushTypes;
import { db } from '../db/index.ts';
import {
  appSettings,
  focusTasks,
  pushSubscriptions,
  userChallenges,
  userPreferences,
  users,
} from '../db/schema.ts';

interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

let cachedVapid: VapidKeys | null = null;
let schedulerStarted = false;

export async function getVapidKeys(): Promise<VapidKeys> {
  if (cachedVapid) return cachedVapid;

  const envPub = process.env.VAPID_PUBLIC_KEY?.trim();
  const envPriv = process.env.VAPID_PRIVATE_KEY?.trim();
  if (envPub && envPriv) {
    cachedVapid = { publicKey: envPub, privateKey: envPriv };
    webpush.setVapidDetails('mailto:hello@brave.app', envPub, envPriv);
    return cachedVapid;
  }

  const [existing] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, 'vapid_keys'))
    .limit(1);

  if (existing) {
    try {
      const parsed = JSON.parse(existing.value) as VapidKeys;
      if (parsed.publicKey && parsed.privateKey) {
        cachedVapid = parsed;
        webpush.setVapidDetails(
          'mailto:hello@brave.app',
          parsed.publicKey,
          parsed.privateKey
        );
        return cachedVapid;
      }
    } catch {
      // Regenerate below if corrupted
    }
  }

  const generated = webpush.generateVAPIDKeys();
  await db
    .insert(appSettings)
    .values({
      key: 'vapid_keys',
      value: JSON.stringify(generated),
    })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: JSON.stringify(generated), updatedAt: new Date() },
    });

  cachedVapid = generated;
  webpush.setVapidDetails(
    'mailto:hello@brave.app',
    generated.publicKey,
    generated.privateKey
  );
  return cachedVapid;
}

export interface PushMessagePayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export async function sendPushToUser(
  userId: number,
  payload: PushMessagePayload
): Promise<{ sent: number; failed: number }> {
  await getVapidKeys();

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.enabled, true)));

  if (subs.length === 0) {
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;
  const serialized = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/',
    tag: payload.tag || 'brave-reminder',
  });

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        serialized
      );
      sent += 1;
    } catch (err) {
      failed += 1;
      const statusCode = (err as { statusCode?: number })?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await db
          .delete(pushSubscriptions)
          .where(eq(pushSubscriptions.id, sub.id));
      } else {
        console.error('Web Push delivery failed for subscription', sub.id, err);
      }
    }
  }

  return { sent, failed };
}

function getLocalParts(nowMs: number, timezoneOffsetMinutes: number) {
  // Date.getTimezoneOffset() returns UTC - Local in minutes (e.g. -420 for UTC+7)
  const localMs = nowMs - timezoneOffsetMinutes * 60 * 1000;
  const d = new Date(localMs);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const mins = String(d.getUTCMinutes()).padStart(2, '0');
  return {
    dateStr: `${year}-${month}-${day}`,
    minutesOfDay: d.getUTCHours() * 60 + d.getUTCMinutes(),
    hhmm: `${hours}:${mins}`,
  };
}

function parseHHMM(hhmm: string | null | undefined): number | null {
  if (!hhmm) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

export async function runReminderTick() {
  try {
    const subs = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.enabled, true));

    if (subs.length === 0) return;

    const nowMs = Date.now();
    const userIds = Array.from(new Set(subs.map((s) => s.userId)));

    // 1. Daily gentle reminder check
    for (const userId of userIds) {
      const userSubs = subs.filter((s) => s.userId === userId);
      const primarySub = userSubs[0];
      if (!primarySub) continue;

      const local = getLocalParts(nowMs, primarySub.timezoneOffsetMinutes);
      const targetMins = parseHHMM(primarySub.reminderTime);
      if (targetMins !== null) {
        const diff = local.minutesOfDay - targetMins;
        const alreadySentToday = userSubs.some(
          (s) => s.lastDailySentDate === local.dateStr
        );

        if (!alreadySentToday && diff >= 0 && diff <= 20) {
          const [pref] = await db
            .select()
            .from(userPreferences)
            .where(eq(userPreferences.userId, userId))
            .limit(1);

          if (!pref || pref.notificationPreferences.dailyReminder !== false) {
            const [u] = await db
              .select({ preferredLanguage: users.preferredLanguage, fullName: users.fullName })
              .from(users)
              .where(eq(users.id, userId))
              .limit(1);
            const isVi = (u?.preferredLanguage || 'vi') === 'vi';

            const pendingTasks = await db
              .select({ id: focusTasks.id, title: focusTasks.title })
              .from(focusTasks)
              .where(
                and(
                  eq(focusTasks.userId, userId),
                  eq(focusTasks.scheduledDate, local.dateStr),
                  ne(focusTasks.status, 'done')
                )
              );

            const todayChallenges = await db
              .select({ status: userChallenges.status })
              .from(userChallenges)
              .where(
                and(
                  eq(userChallenges.userId, userId),
                  eq(userChallenges.assignedDate, local.dateStr)
                )
              );
            const hasDoneToday = todayChallenges.some((c) => c.status === 'completed');

            if (pendingTasks.length > 0 || !hasDoneToday) {
              const title = isVi
                ? 'BRAVE · Nhắc nhẹ hôm nay'
                : 'BRAVE · Gentle daily check-in';
              const body = isVi
                ? pendingTasks.length > 0
                  ? `Còn ${pendingTasks.length} việc trong Lịch hôm nay (${pendingTasks[0].title}). Dành 2 phút bắt đầu bước nhỏ đầu tiên nhé!`
                  : 'Hôm nay bạn chưa check thử thách can đảm. Mở app 2 phút để giữ chuỗi tiến bộ nhé!'
                : pendingTasks.length > 0
                  ? `${pendingTasks.length} focus task(s) left today (${pendingTasks[0].title}). Take 2 minutes for your tiny first step!`
                  : 'Your daily courage step is waiting. Open BRAVE for 2 minutes to keep your streak alive!';

              const res = await sendPushToUser(userId, {
                title,
                body,
                url: '/',
                tag: `brave-daily-${local.dateStr}`,
              });

              if (res.sent > 0) {
                await db
                  .update(pushSubscriptions)
                  .set({ lastDailySentDate: local.dateStr, updatedAt: new Date() })
                  .where(eq(pushSubscriptions.userId, userId));
              }
            }
          }
        }
      }

      // 2. Scheduled focus_tasks reminders (0 to 15 mins before scheduledTime)
      const timedTasks = await db
        .select()
        .from(focusTasks)
        .where(
          and(
            eq(focusTasks.userId, userId),
            eq(focusTasks.scheduledDate, local.dateStr),
            ne(focusTasks.status, 'done'),
            isNotNull(focusTasks.scheduledTime),
            isNull(focusTasks.reminderSentAt)
          )
        );

      if (timedTasks.length > 0) {
        const [u] = await db
          .select({ preferredLanguage: users.preferredLanguage })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);
        const isVi = (u?.preferredLanguage || 'vi') === 'vi';

        for (const task of timedTasks) {
          const taskMins = parseHHMM(task.scheduledTime);
          if (taskMins === null) continue;
          const minsUntil = taskMins - local.minutesOfDay;
          if (minsUntil >= -5 && minsUntil <= 15) {
            const title = isVi
              ? `Sắp đến giờ (${task.scheduledTime}): ${task.title}`
              : `Coming up (${task.scheduledTime}): ${task.title}`;
            const body = task.tinyFirstStep
              ? isVi
                ? `Bước 2 phút: ${task.tinyFirstStep}`
                : `2-minute step: ${task.tinyFirstStep}`
              : isVi
                ? 'Nhấn để mở BRAVE và bắt đầu 2 phút chống trì hoãn ngay.'
                : 'Tap to open BRAVE and start a 2-minute anti-procrastination sprint.';

            const res = await sendPushToUser(userId, {
              title,
              body,
              url: '/',
              tag: `brave-task-${task.id}`,
            });

            if (res.sent > 0) {
              await db
                .update(focusTasks)
                .set({ reminderSentAt: new Date() })
                .where(eq(focusTasks.id, task.id));
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Reminder scheduler tick error:', err);
  }
}

export function startReminderScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;
  // Warm up VAPID keys and run every 60 seconds
  getVapidKeys().catch((err) => console.error('VAPID init warning:', err));
  setInterval(() => {
    runReminderTick();
  }, 60 * 1000);
}

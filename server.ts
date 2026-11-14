import 'dotenv/config';
import crypto from 'crypto';
import fs from 'fs';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { and, desc, eq, inArray, notInArray, or, sql } from 'drizzle-orm';
import { db } from './src/db/index.ts';
import {
  challengeGroups,
  challenges,
  coachMessages,
  communityComments,
  communityPosts,
  communityReactions,
  diaryEntries,
  fears,
  focusTasks,
  futureLetters,
  groupMemberships,
  pushSubscriptions,
  reports,
  userBlocks,
  userChallenges,
  userFollows,
  userPreferences,
  userProgress,
  users,
} from './src/db/schema.ts';
import { adminAuth } from './src/lib/firebase-admin.ts';
import { type AuthRequest, requireAuth } from './src/middleware/auth.ts';
import {
  clearSessionCookie,
  hashPassword,
  setSessionCookie,
  signSessionToken,
  verifyPassword,
} from './src/server/auth.ts';
import { generateCoachReply } from './src/server/coach.ts';
import {
  getVapidKeys,
  sendPushToUser,
  startReminderScheduler,
} from './src/server/push.ts';
import { ensureSeededData, evaluateBadges } from './src/server/seed.ts';

function sanitizeUser(u: typeof users.$inferSelect | undefined) {
  if (!u) return undefined;
  const {
    passwordHash: _ph,
    verificationToken: _vt,
    resetToken: _rt,
    resetTokenExpiresAt: _rte,
    ...safe
  } = u;
  return safe;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function getYesterdayDateString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

async function pickDailyChallengeForUser(userId: number, excludeChallengeIds: number[] = []) {
  await ensureSeededData();

  const [prefs] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);

  const allChallenges = await db.select().from(challenges).where(eq(challenges.isActive, true));
  const completedRows = await db
    .select({ challengeId: userChallenges.challengeId })
    .from(userChallenges)
    .where(and(eq(userChallenges.userId, userId), eq(userChallenges.status, 'completed')));

  const completedIds = new Set(
    completedRows.map((r) => r.challengeId).filter((id): id is number => id !== null)
  );
  const excludeSet = new Set(excludeChallengeIds);

  const intensityMap: Record<string, string[]> = {
    gentle: ['tiny', 'easy'],
    balanced: ['easy', 'medium'],
    ambitious: ['medium', 'difficult', 'milestone'],
  };
  const preferredDifficulties = intensityMap[prefs?.challengeIntensity || 'gentle'] || [
    'tiny',
    'easy',
  ];
  const preferredCategories = new Set(prefs?.fearCategories || []);

  const candidates = allChallenges.filter((c) => !excludeSet.has(c.id));
  const pool = candidates.length > 0 ? candidates : allChallenges;

  const scored = pool.map((ch) => {
    let score = 0;
    if (!completedIds.has(ch.id)) score += 10;
    if (preferredDifficulties.includes(ch.difficulty)) score += 6;
    if (preferredCategories.has(ch.category)) score += 4;
    if (prefs && ch.estimatedMinutes <= Number(prefs.availableTime || 15)) score += 2;
    return { ch, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const topPool = scored.slice(0, Math.min(3, scored.length));
  return topPool[Math.floor(Math.random() * topPool.length)]?.ch || allChallenges[0];
}

function getAllowedOrigins(): Set<string> {
  const origins = new Set<string>();
  const addOrigin = (raw?: string) => {
    if (!raw) return;
    for (const part of raw.split(',')) {
      const cleaned = part.trim().replace(/\/+$/, '');
      if (cleaned) origins.add(cleaned);
    }
  };

  addOrigin(process.env.FRONTEND_ORIGIN);
  addOrigin(process.env.APP_URL);

  if (!process.env.FRONTEND_ORIGIN) {
    let projectId = process.env.FIREBASE_PROJECT_ID?.trim();
    if (!projectId) {
      try {
        const cfgPath = path.resolve(__dirname, 'firebase-applet-config.json');
        if (fs.existsSync(cfgPath)) {
          const parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) as {
            projectId?: string;
          };
          projectId = parsed.projectId;
        }
      } catch {
        // Ignore missing config file
      }
    }
    if (projectId) {
      origins.add(`https://${projectId}.web.app`);
      origins.add(`https://${projectId}.firebaseapp.com`);
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    origins.add('http://localhost:3000');
    origins.add('http://localhost:5173');
  }

  return origins;
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);

  // Strict CORS for Firebase Hosting frontend + Render backend (Bearer token auth)
  const allowedOrigins = getAllowedOrigins();
  app.use((req, res, next) => {
    const requestOrigin = req.headers.origin?.replace(/\/+$/, '');
    if (requestOrigin && allowedOrigins.has(requestOrigin)) {
      res.setHeader('Access-Control-Allow-Origin', requestOrigin);
      res.setHeader('Vary', 'Origin');
      res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, PATCH, DELETE, OPTIONS'
      );
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization'
      );
      res.setHeader('Access-Control-Max-Age', '86400');
    }

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    return next();
  });

  app.use(express.json({ limit: '4mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'brave-api' });
  });

  // Email / Password Authentication (scrypt + signed HttpOnly cookie)
  app.post('/api/auth/signup', async (req, res) => {
    try {
      await ensureSeededData();
      const { email, password, fullName, preferredLanguage } = req.body as {
        email?: string;
        password?: string;
        fullName?: string;
        preferredLanguage?: 'vi' | 'en';
      };
      const cleanEmail = String(email || '').trim().toLowerCase();
      if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return res.status(400).json({ error: 'Invalid email address.' });
      }
      if (!password || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
      }

      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, cleanEmail))
        .limit(1);
      if (existing.length > 0) {
        return res.status(409).json({ error: 'EMAIL_EXISTS' });
      }

      const uid = `email_${crypto.randomUUID()}`;
      const baseUsername = cleanEmail
        .split('@')[0]
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '')
        .slice(0, 16);
      const username = `${baseUsername || 'brave'}_${crypto.randomBytes(3).toString('hex')}`;
      const verificationToken = String(Math.floor(100000 + Math.random() * 900000));

      const [created] = await db
        .insert(users)
        .values({
          uid,
          email: cleanEmail,
          passwordHash: hashPassword(password),
          emailVerified: false,
          verificationToken,
          fullName: (fullName || cleanEmail.split('@')[0] || 'Brave Explorer').trim().slice(0, 80),
          username,
          preferredLanguage: preferredLanguage === 'en' ? 'en' : 'vi',
          onboardingCompleted: false,
        })
        .returning();

      const [preferences] = await db
        .insert(userPreferences)
        .values({
          userId: created.id,
          personalGoals: [],
          fearCategories: [],
          confidenceLevel: 5,
          challengeIntensity: 'gentle',
          availableTime: '10',
        })
        .returning();

      const [progress] = await db
        .insert(userProgress)
        .values({
          userId: created.id,
          totalPoints: 0,
          currentStreak: 0,
          longestStreak: 0,
          completedChallenges: 0,
          unlockedBadges: [],
          confidenceHistory: [],
        })
        .returning();

      const token = signSessionToken({ userId: created.id, uid: created.uid });
      setSessionCookie(req, res, token);

      res.status(201).json({
        user: sanitizeUser(created),
        preferences,
        progress,
      });
    } catch (error) {
      console.error('POST /api/auth/signup failed:', error);
      res.status(500).json({ error: 'Could not create account.' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      await ensureSeededData();
      const { email, password } = req.body as { email?: string; password?: string };
      const cleanEmail = String(email || '').trim().toLowerCase();
      if (!cleanEmail || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }

      const [found] = await db
        .select()
        .from(users)
        .where(eq(users.email, cleanEmail))
        .limit(1);

      if (!found || !found.passwordHash || !verifyPassword(password, found.passwordHash)) {
        return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
      }

      const [preferences] = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, found.id))
        .limit(1);
      const [progress] = await db
        .select()
        .from(userProgress)
        .where(eq(userProgress.userId, found.id))
        .limit(1);

      const token = signSessionToken({ userId: found.id, uid: found.uid });
      setSessionCookie(req, res, token);

      res.json({
        user: sanitizeUser(found),
        preferences,
        progress,
      });
    } catch (error) {
      console.error('POST /api/auth/login failed:', error);
      res.status(500).json({ error: 'Login failed.' });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    clearSessionCookie(req, res);
    res.json({ ok: true });
  });

  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = req.body as { email?: string };
      const cleanEmail = String(email || '').trim().toLowerCase();
      if (!cleanEmail) {
        return res.status(400).json({ error: 'Email is required.' });
      }

      const [found] = await db
        .select()
        .from(users)
        .where(eq(users.email, cleanEmail))
        .limit(1);

      if (!found || !found.passwordHash) {
        return res.status(404).json({ error: 'ACCOUNT_NOT_FOUND' });
      }

      const resetCode = String(Math.floor(100000 + Math.random() * 900000));
      const expires = new Date(Date.now() + 15 * 60 * 1000);
      await db
        .update(users)
        .set({ resetToken: resetCode, resetTokenExpiresAt: expires, updatedAt: new Date() })
        .where(eq(users.id, found.id));

      res.json({ ok: true, resetCode });
    } catch (error) {
      console.error('POST /api/auth/forgot-password failed:', error);
      res.status(500).json({ error: 'Could not start password reset.' });
    }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { email, code, newPassword } = req.body as {
        email?: string;
        code?: string;
        newPassword?: string;
      };
      const cleanEmail = String(email || '').trim().toLowerCase();
      if (!cleanEmail || !code || !newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'Valid email, 6-digit code, and 6+ char password required.' });
      }

      const [found] = await db
        .select()
        .from(users)
        .where(eq(users.email, cleanEmail))
        .limit(1);

      if (
        !found ||
        !found.resetToken ||
        found.resetToken !== code.trim() ||
        !found.resetTokenExpiresAt ||
        found.resetTokenExpiresAt.getTime() < Date.now()
      ) {
        return res.status(400).json({ error: 'INVALID_RESET_CODE' });
      }

      await db
        .update(users)
        .set({
          passwordHash: hashPassword(newPassword),
          resetToken: null,
          resetTokenExpiresAt: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, found.id));

      res.json({ ok: true });
    } catch (error) {
      console.error('POST /api/auth/reset-password failed:', error);
      res.status(500).json({ error: 'Failed to reset password.' });
    }
  });

  // User profile, preferences & progress
  app.get('/api/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      await ensureSeededData();
      const userId = req.dbUserId!;

      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      const [preferences] = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, userId))
        .limit(1);
      const [progress] = await db
        .select()
        .from(userProgress)
        .where(eq(userProgress.userId, userId))
        .limit(1);

      res.json({ user: sanitizeUser(user), preferences, progress });
    } catch (error) {
      console.error('GET /api/me failed:', error);
      res.status(500).json({ error: 'Failed to load account data.' });
    }
  });

  app.put('/api/me/profile', requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.dbUserId!;
      const { fullName, username, bio, avatarUrl, preferredLanguage } = req.body as {
        fullName?: string;
        username?: string;
        bio?: string;
        avatarUrl?: string;
        preferredLanguage?: string;
      };

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (typeof fullName === 'string') updates.fullName = fullName.trim().slice(0, 80);
      if (typeof bio === 'string') updates.bio = bio.trim().slice(0, 300);
      if (typeof avatarUrl === 'string') updates.avatarUrl = avatarUrl.slice(0, 500000);
      if (preferredLanguage === 'vi' || preferredLanguage === 'en') {
        updates.preferredLanguage = preferredLanguage;
      }
      if (typeof username === 'string' && username.trim().length >= 3) {
        updates.username = username
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, '')
          .slice(0, 30);
      }

      const [updated] = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, userId))
        .returning();

      res.json({ user: sanitizeUser(updated) });
    } catch (error) {
      console.error('PUT /api/me/profile failed:', error);
      res.status(400).json({ error: 'Could not update profile. Username may already be taken.' });
    }
  });

  app.put('/api/me/preferences', requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.dbUserId!;
      const {
        personalGoals,
        fearCategories,
        confidenceLevel,
        challengeIntensity,
        availableTime,
        notificationPreferences,
        completeOnboarding,
      } = req.body;

      const [existingPref] = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, userId))
        .limit(1);

      const nextConfidence =
        typeof confidenceLevel === 'number'
          ? Math.min(10, Math.max(1, confidenceLevel))
          : existingPref?.confidenceLevel ?? 5;

      const normalizedGoals = Array.isArray(personalGoals)
        ? Array.from(
            new Set(
              personalGoals
                .map((g) => String(g).trim().slice(0, 80))
                .filter(Boolean)
            )
          ).slice(0, 20)
        : existingPref?.personalGoals ?? [];

      const [updatedPref] = await db
        .insert(userPreferences)
        .values({
          userId,
          personalGoals: normalizedGoals,
          fearCategories: Array.isArray(fearCategories)
            ? fearCategories
            : existingPref?.fearCategories ?? [],
          confidenceLevel: nextConfidence,
          challengeIntensity: challengeIntensity || existingPref?.challengeIntensity || 'gentle',
          availableTime: String(availableTime || existingPref?.availableTime || '10'),
          notificationPreferences:
            notificationPreferences || existingPref?.notificationPreferences,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: userPreferences.userId,
          set: {
            personalGoals: normalizedGoals,
            fearCategories: Array.isArray(fearCategories)
              ? fearCategories
              : existingPref?.fearCategories ?? [],
            confidenceLevel: nextConfidence,
            challengeIntensity: challengeIntensity || existingPref?.challengeIntensity || 'gentle',
            availableTime: String(availableTime || existingPref?.availableTime || '10'),
            notificationPreferences:
              notificationPreferences || existingPref?.notificationPreferences,
            updatedAt: new Date(),
          },
        })
        .returning();

      if (completeOnboarding) {
        await db
          .update(users)
          .set({ onboardingCompleted: true, updatedAt: new Date() })
          .where(eq(users.id, userId));
      }

      if (typeof confidenceLevel === 'number') {
        const [prog] = await db
          .select()
          .from(userProgress)
          .where(eq(userProgress.userId, userId))
          .limit(1);
        const history = [...(prog?.confidenceHistory || [])];
        const today = getTodayDateString();
        const idx = history.findIndex((h) => h.date === today);
        if (idx >= 0) {
          history[idx] = { date: today, score: nextConfidence };
        } else {
          history.push({ date: today, score: nextConfidence });
        }
        await db
          .update(userProgress)
          .set({ confidenceHistory: history.slice(-30), updatedAt: new Date() })
          .where(eq(userProgress.userId, userId));
      }

      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      const [progress] = await db
        .select()
        .from(userProgress)
        .where(eq(userProgress.userId, userId))
        .limit(1);

      res.json({ user: sanitizeUser(user), preferences: updatedPref, progress });
    } catch (error) {
      console.error('PUT /api/me/preferences failed:', error);
      res.status(500).json({ error: 'Failed to save preferences.' });
    }
  });

  app.delete('/api/me/account', requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.dbUserId!;
      const uid = req.authUid || req.user?.uid;
      await db.delete(users).where(eq(users.id, userId));
      clearSessionCookie(req, res);
      if (uid && !uid.startsWith('email_')) {
        try {
          if (adminAuth) {
            await adminAuth.deleteUser(uid);
          }
        } catch (authErr) {
          console.warn('Firebase user deletion warning:', authErr);
        }
      }
      res.json({ deleted: true });
    } catch (error) {
      console.error('DELETE /api/me/account failed:', error);
      res.status(500).json({ error: 'Failed to delete account.' });
    }
  });

  // Fear Map CRUD
  app.get('/api/fears', requireAuth, async (req: AuthRequest, res) => {
    try {
      const rows = await db
        .select()
        .from(fears)
        .where(eq(fears.userId, req.dbUserId!))
        .orderBy(desc(fears.createdAt));
      res.json({ fears: rows });
    } catch (error) {
      console.error('GET /api/fears failed:', error);
      res.status(500).json({ error: 'Failed to load fears.' });
    }
  });

  app.post('/api/fears', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { category, title, description, intensity, triggers, emotionalResponse, progressNote } =
        req.body;
      if (!category || !title || !description) {
        return res.status(400).json({ error: 'Category, title, and description are required.' });
      }
      const [created] = await db
        .insert(fears)
        .values({
          userId: req.dbUserId!,
          category: String(category).slice(0, 60),
          title: String(title).trim().slice(0, 140),
          description: String(description).trim().slice(0, 1500),
          intensity: Math.min(10, Math.max(1, Number(intensity) || 5)),
          triggers: triggers ? String(triggers).trim().slice(0, 500) : null,
          emotionalResponse: emotionalResponse
            ? String(emotionalResponse).trim().slice(0, 500)
            : null,
          progressNote: progressNote ? String(progressNote).trim().slice(0, 500) : null,
        })
        .returning();
      res.status(201).json({ fear: created });
    } catch (error) {
      console.error('POST /api/fears failed:', error);
      res.status(500).json({ error: 'Failed to save fear entry.' });
    }
  });

  app.put('/api/fears/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const { intensity, progressNote, isResolved, triggers, emotionalResponse } = req.body;
      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (typeof intensity === 'number') updates.intensity = Math.min(10, Math.max(1, intensity));
      if (typeof progressNote === 'string') updates.progressNote = progressNote.trim().slice(0, 500);
      if (typeof triggers === 'string') updates.triggers = triggers.trim().slice(0, 500);
      if (typeof emotionalResponse === 'string') {
        updates.emotionalResponse = emotionalResponse.trim().slice(0, 500);
      }
      if (typeof isResolved === 'boolean') updates.isResolved = isResolved;

      const [updated] = await db
        .update(fears)
        .set(updates)
        .where(and(eq(fears.id, id), eq(fears.userId, req.dbUserId!)))
        .returning();
      if (!updated) return res.status(404).json({ error: 'Fear entry not found.' });
      res.json({ fear: updated });
    } catch (error) {
      console.error('PUT /api/fears/:id failed:', error);
      res.status(500).json({ error: 'Failed to update fear entry.' });
    }
  });

  app.delete('/api/fears/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      await db.delete(fears).where(and(eq(fears.id, id), eq(fears.userId, req.dbUserId!)));
      res.json({ deleted: true });
    } catch (error) {
      console.error('DELETE /api/fears/:id failed:', error);
      res.status(500).json({ error: 'Failed to delete fear entry.' });
    }
  });

  // Challenges: Ladder, Daily, User Challenges
  app.get('/api/challenges/ladder', requireAuth, async (req: AuthRequest, res) => {
    try {
      await ensureSeededData();
      const allChallenges = await db
        .select()
        .from(challenges)
        .where(
          and(
            eq(challenges.isActive, true),
            or(
              eq(challenges.isPublic, true),
              eq(challenges.createdByUserId, req.dbUserId!)
            )
          )
        )
        .orderBy(challenges.level, challenges.id);
      const userRows = await db
        .select()
        .from(userChallenges)
        .where(eq(userChallenges.userId, req.dbUserId!))
        .orderBy(desc(userChallenges.createdAt));

      res.json({ challenges: allChallenges, userChallenges: userRows });
    } catch (error) {
      console.error('GET /api/challenges/ladder failed:', error);
      res.status(500).json({ error: 'Failed to load Courage Ladder.' });
    }
  });

  app.get('/api/challenges/daily', requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.dbUserId!;
      const today = getTodayDateString();

      const existingToday = await db
        .select()
        .from(userChallenges)
        .where(
          and(
            eq(userChallenges.userId, userId),
            eq(userChallenges.assignedDate, today)
          )
        )
        .orderBy(desc(userChallenges.createdAt));

      const activeToday = existingToday.find((r) => r.status !== 'skipped') || existingToday[0];

      if (activeToday) {
        const challengeTemplate = activeToday.challengeId
          ? (
              await db
                .select()
                .from(challenges)
                .where(eq(challenges.id, activeToday.challengeId))
                .limit(1)
            )[0] || null
          : null;
        return res.json({ userChallenge: activeToday, template: challengeTemplate });
      }

      const picked = await pickDailyChallengeForUser(userId);
      const [created] = await db
        .insert(userChallenges)
        .values({
          userId,
          challengeId: picked.id,
          status: 'assigned',
          assignedDate: today,
        })
        .returning();

      res.json({ userChallenge: created, template: picked });
    } catch (error) {
      console.error('GET /api/challenges/daily failed:', error);
      res.status(500).json({ error: 'Failed to load daily challenge.' });
    }
  });

  app.post('/api/challenges/daily/replace', requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.dbUserId!;
      const today = getTodayDateString();
      const { currentUserChallengeId } = req.body as { currentUserChallengeId?: number };

      let excludeIds: number[] = [];
      if (currentUserChallengeId) {
        const [cur] = await db
          .select()
          .from(userChallenges)
          .where(and(eq(userChallenges.id, currentUserChallengeId), eq(userChallenges.userId, userId)))
          .limit(1);
        if (cur) {
          if (cur.challengeId) excludeIds.push(cur.challengeId);
          await db
            .update(userChallenges)
            .set({ status: 'skipped' })
            .where(eq(userChallenges.id, cur.id));
        }
      }

      const picked = await pickDailyChallengeForUser(userId, excludeIds);
      const [created] = await db
        .insert(userChallenges)
        .values({
          userId,
          challengeId: picked.id,
          status: 'assigned',
          assignedDate: today,
        })
        .returning();

      res.json({ userChallenge: created, template: picked });
    } catch (error) {
      console.error('POST /api/challenges/daily/replace failed:', error);
      res.status(500).json({ error: 'Failed to replace daily challenge.' });
    }
  });

  app.post('/api/challenges/assign', requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.dbUserId!;
      const {
        challengeId,
        customTitle,
        customDescription,
        customCategory,
        customDifficulty,
        estimatedMinutes,
        setAsToday,
        saveAsTemplate,
        isPublic,
        sourceType,
        handbookRef,
      } = req.body as {
        challengeId?: number;
        customTitle?: string;
        customDescription?: string;
        customCategory?: string;
        customDifficulty?: string;
        estimatedMinutes?: number;
        setAsToday?: boolean;
        saveAsTemplate?: boolean;
        isPublic?: boolean;
        sourceType?: string;
        handbookRef?: string;
      };

      let template = null;
      if (challengeId) {
        const [found] = await db
          .select()
          .from(challenges)
          .where(eq(challenges.id, Number(challengeId)))
          .limit(1);
        template = found || null;
      }

      if (!template && (!customTitle || !String(customTitle).trim())) {
        return res.status(400).json({ error: 'Challenge reference or custom title is required.' });
      }

      const today = getTodayDateString();
      if (setAsToday) {
        await db
          .update(userChallenges)
          .set({ status: 'skipped' })
          .where(
            and(
              eq(userChallenges.userId, userId),
              eq(userChallenges.assignedDate, today),
              inArray(userChallenges.status, ['assigned', 'in_progress', 'paused'])
            )
          );
      }

      const diffLevelMap: Record<string, number> = {
        tiny: 1,
        easy: 2,
        medium: 3,
        difficult: 4,
        milestone: 5,
      };
      const diffPointsMap: Record<string, number> = {
        tiny: 10,
        easy: 15,
        medium: 25,
        difficult: 40,
        milestone: 60,
      };

      if (!template && saveAsTemplate && customTitle) {
        const cleanTitle = String(customTitle).trim().slice(0, 140);
        const cleanDesc = String(customDescription || cleanTitle).trim().slice(0, 600);
        const diffKey = String(customDifficulty || 'easy');
        const mins = Math.min(120, Math.max(2, Number(estimatedMinutes) || 10));
        const [savedTpl] = await db
          .insert(challenges)
          .values({
            slug: `user-${userId}-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
            level: diffLevelMap[diffKey] || 2,
            titleVi: cleanTitle,
            titleEn: cleanTitle,
            descriptionVi: cleanDesc,
            descriptionEn: cleanDesc,
            stepsVi: [],
            stepsEn: [],
            category: String(customCategory || 'social'),
            difficulty: diffKey,
            estimatedMinutes: mins,
            rewardPoints: diffPointsMap[diffKey] || 15,
            completionCriteriaVi: null,
            completionCriteriaEn: null,
            sourceType: sourceType === 'handbook' ? 'handbook' : 'user',
            handbookRef: handbookRef ? String(handbookRef).slice(0, 140) : null,
            createdByUserId: userId,
            isPublic: Boolean(isPublic),
            isActive: true,
          })
          .returning();
        template = savedTpl;
      }

      const [created] = await db
        .insert(userChallenges)
        .values({
          userId,
          challengeId: template ? template.id : null,
          customTitle: template ? null : String(customTitle).trim().slice(0, 140),
          customDescription: template
            ? null
            : String(customDescription || '').trim().slice(0, 600),
          customCategory: template ? null : String(customCategory || 'social'),
          customDifficulty: template ? null : String(customDifficulty || 'easy'),
          status: setAsToday ? 'assigned' : 'in_progress',
          assignedDate: today,
          startedAt: setAsToday ? null : new Date(),
        })
        .returning();

      res.status(201).json({ userChallenge: created, template });
    } catch (error) {
      console.error('POST /api/challenges/assign failed:', error);
      res.status(500).json({ error: 'Failed to assign challenge.' });
    }
  });

  app.put('/api/challenges/user/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.dbUserId!;
      const id = Number(req.params.id);
      const { status, reflection, difficultyRating } = req.body as {
        status?: 'assigned' | 'in_progress' | 'paused' | 'completed' | 'skipped';
        reflection?: string;
        difficultyRating?: number;
      };

      const [existing] = await db
        .select()
        .from(userChallenges)
        .where(and(eq(userChallenges.id, id), eq(userChallenges.userId, userId)))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ error: 'Challenge record not found.' });
      }

      let pointsAwarded = existing.pointsEarned;
      let newlyCompleted = false;

      if (status === 'completed' && existing.status !== 'completed') {
        newlyCompleted = true;
        if (existing.challengeId) {
          const [tpl] = await db
            .select()
            .from(challenges)
            .where(eq(challenges.id, existing.challengeId))
            .limit(1);
          pointsAwarded = tpl?.rewardPoints ?? 15;
        } else {
          const diffPoints: Record<string, number> = {
            tiny: 10,
            easy: 15,
            medium: 25,
            difficult: 40,
            milestone: 60,
          };
          pointsAwarded = diffPoints[existing.customDifficulty || 'easy'] || 15;
        }
      }

      const [updated] = await db
        .update(userChallenges)
        .set({
          status: status || existing.status,
          startedAt:
            status === 'in_progress' && !existing.startedAt ? new Date() : existing.startedAt,
          completedAt:
            status === 'completed' && !existing.completedAt ? new Date() : existing.completedAt,
          reflection:
            typeof reflection === 'string' ? reflection.trim().slice(0, 1000) : existing.reflection,
          difficultyRating:
            typeof difficultyRating === 'number'
              ? Math.min(5, Math.max(1, difficultyRating))
              : existing.difficultyRating,
          pointsEarned: pointsAwarded,
        })
        .where(eq(userChallenges.id, id))
        .returning();

      let updatedProgress = null;
      if (newlyCompleted) {
        const [prog] = await db
          .select()
          .from(userProgress)
          .where(eq(userProgress.userId, userId))
          .limit(1);

        const today = getTodayDateString();
        const yesterday = getYesterdayDateString();
        let nextStreak = prog?.currentStreak ?? 0;
        if (prog?.lastActivityDate === today) {
          nextStreak = Math.max(1, nextStreak);
        } else if (prog?.lastActivityDate === yesterday) {
          nextStreak = nextStreak + 1;
        } else {
          nextStreak = 1;
        }

        const nextLongest = Math.max(prog?.longestStreak ?? 0, nextStreak);
        const nextCompletedCount = (prog?.completedChallenges ?? 0) + 1;
        const nextTotalPoints = (prog?.totalPoints ?? 0) + pointsAwarded;

        const completedUserChallenges = await db
          .select({
            challengeId: userChallenges.challengeId,
            customCategory: userChallenges.customCategory,
          })
          .from(userChallenges)
          .where(and(eq(userChallenges.userId, userId), eq(userChallenges.status, 'completed')));

        const tplIds = completedUserChallenges
          .map((c) => c.challengeId)
          .filter((cid): cid is number => cid !== null);
        const tplCats =
          tplIds.length > 0
            ? (
                await db
                  .select({ category: challenges.category })
                  .from(challenges)
                  .where(inArray(challenges.id, tplIds))
              ).map((r) => r.category)
            : [];
        const allCats = [
          ...tplCats,
          ...completedUserChallenges
            .map((c) => c.customCategory)
            .filter((c): c is string => Boolean(c)),
        ];

        const unlockedBadges = evaluateBadges({
          completedCount: nextCompletedCount,
          currentStreak: nextStreak,
          longestStreak: nextLongest,
          totalPoints: nextTotalPoints,
          completedCategories: allCats,
          existingBadges: prog?.unlockedBadges || [],
        });

        const [savedProg] = await db
          .update(userProgress)
          .set({
            totalPoints: nextTotalPoints,
            currentStreak: nextStreak,
            longestStreak: nextLongest,
            completedChallenges: nextCompletedCount,
            lastActivityDate: today,
            unlockedBadges,
            updatedAt: new Date(),
          })
          .where(eq(userProgress.userId, userId))
          .returning();

        updatedProgress = savedProg;
      }

      res.json({ userChallenge: updated, progress: updatedProgress });
    } catch (error) {
      console.error('PUT /api/challenges/user/:id failed:', error);
      res.status(500).json({ error: 'Failed to update challenge progress.' });
    }
  });

  // Anti-Procrastination To-Do List & Schedule (focus_tasks)
  app.get('/api/tasks', requireAuth, async (req: AuthRequest, res) => {
    try {
      const rows = await db
        .select()
        .from(focusTasks)
        .where(eq(focusTasks.userId, req.dbUserId!))
        .orderBy(focusTasks.scheduledDate, focusTasks.scheduledTime, desc(focusTasks.createdAt));
      res.json({ tasks: rows });
    } catch (error) {
      console.error('GET /api/tasks failed:', error);
      res.status(500).json({ error: 'Failed to load scheduled tasks.' });
    }
  });

  app.post('/api/tasks', requireAuth, async (req: AuthRequest, res) => {
    try {
      const {
        title,
        notes,
        scheduledDate,
        scheduledTime,
        durationMinutes,
        priority,
        procrastinationTrigger,
        tinyFirstStep,
      } = req.body as {
        title?: string;
        notes?: string;
        scheduledDate?: string;
        scheduledTime?: string;
        durationMinutes?: number;
        priority?: string;
        procrastinationTrigger?: string;
        tinyFirstStep?: string;
      };

      if (!title || !String(title).trim()) {
        return res.status(400).json({ error: 'Task title is required.' });
      }

      const validPriority =
        priority === 'must_do' || priority === 'important' || priority === 'nice_to_have'
          ? priority
          : 'important';

      const [created] = await db
        .insert(focusTasks)
        .values({
          userId: req.dbUserId!,
          title: String(title).trim().slice(0, 180),
          notes: notes ? String(notes).trim().slice(0, 1000) : null,
          scheduledDate:
            scheduledDate && /^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)
              ? scheduledDate
              : getTodayDateString(),
          scheduledTime:
            scheduledTime && /^\d{2}:\d{2}$/.test(scheduledTime) ? scheduledTime : null,
          durationMinutes: Math.min(240, Math.max(5, Number(durationMinutes) || 25)),
          priority: validPriority,
          procrastinationTrigger: procrastinationTrigger
            ? String(procrastinationTrigger).slice(0, 60)
            : null,
          tinyFirstStep: tinyFirstStep ? String(tinyFirstStep).trim().slice(0, 240) : null,
          status: 'todo',
        })
        .returning();

      res.status(201).json({ task: created });
    } catch (error) {
      console.error('POST /api/tasks failed:', error);
      res.status(500).json({ error: 'Failed to create task.' });
    }
  });

  app.put('/api/tasks/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.dbUserId!;
      const id = Number(req.params.id);
      const {
        title,
        notes,
        scheduledDate,
        scheduledTime,
        durationMinutes,
        priority,
        procrastinationTrigger,
        tinyFirstStep,
        status,
        focusSecondsDelta,
      } = req.body as {
        title?: string;
        notes?: string | null;
        scheduledDate?: string;
        scheduledTime?: string | null;
        durationMinutes?: number;
        priority?: 'must_do' | 'important' | 'nice_to_have';
        procrastinationTrigger?: string | null;
        tinyFirstStep?: string | null;
        status?: 'todo' | 'in_progress' | 'done';
        focusSecondsDelta?: number;
      };

      const [existing] = await db
        .select()
        .from(focusTasks)
        .where(and(eq(focusTasks.id, id), eq(focusTasks.userId, userId)))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ error: 'Task not found.' });
      }

      const nextStatus =
        status === 'todo' || status === 'in_progress' || status === 'done'
          ? status
          : existing.status;

      const newlyDone = nextStatus === 'done' && existing.status !== 'done';
      const deltaSec =
        typeof focusSecondsDelta === 'number' && focusSecondsDelta > 0
          ? Math.min(7200, Math.round(focusSecondsDelta))
          : 0;

      const [updated] = await db
        .update(focusTasks)
        .set({
          title: typeof title === 'string' && title.trim() ? title.trim().slice(0, 180) : existing.title,
          notes: notes !== undefined ? (notes ? String(notes).trim().slice(0, 1000) : null) : existing.notes,
          scheduledDate:
            scheduledDate && /^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)
              ? scheduledDate
              : existing.scheduledDate,
          scheduledTime:
            scheduledTime !== undefined
              ? scheduledTime && /^\d{2}:\d{2}$/.test(scheduledTime)
                ? scheduledTime
                : null
              : existing.scheduledTime,
          durationMinutes:
            typeof durationMinutes === 'number'
              ? Math.min(240, Math.max(5, durationMinutes))
              : existing.durationMinutes,
          priority:
            priority === 'must_do' || priority === 'important' || priority === 'nice_to_have'
              ? priority
              : existing.priority,
          procrastinationTrigger:
            procrastinationTrigger !== undefined
              ? procrastinationTrigger
                ? String(procrastinationTrigger).slice(0, 60)
                : null
              : existing.procrastinationTrigger,
          tinyFirstStep:
            tinyFirstStep !== undefined
              ? tinyFirstStep
                ? String(tinyFirstStep).trim().slice(0, 240)
                : null
              : existing.tinyFirstStep,
          status: nextStatus,
          focusSecondsSpent: existing.focusSecondsSpent + deltaSec,
          reminderSentAt:
            (scheduledDate && scheduledDate !== existing.scheduledDate) ||
            (scheduledTime !== undefined && scheduledTime !== existing.scheduledTime)
              ? null
              : existing.reminderSentAt,
          completedAt: newlyDone ? new Date() : nextStatus !== 'done' ? null : existing.completedAt,
          updatedAt: new Date(),
        })
        .where(eq(focusTasks.id, id))
        .returning();

      let updatedProgress = null;
      if (newlyDone) {
        const [prog] = await db
          .select()
          .from(userProgress)
          .where(eq(userProgress.userId, userId))
          .limit(1);

        const taskPoints = existing.priority === 'must_do' ? 15 : 10;
        const today = getTodayDateString();
        const yesterday = getYesterdayDateString();
        let nextStreak = prog?.currentStreak ?? 0;
        if (prog?.lastActivityDate === today) {
          nextStreak = Math.max(1, nextStreak);
        } else if (prog?.lastActivityDate === yesterday) {
          nextStreak = nextStreak + 1;
        } else {
          nextStreak = 1;
        }

        const [savedProg] = await db
          .update(userProgress)
          .set({
            totalPoints: (prog?.totalPoints ?? 0) + taskPoints,
            currentStreak: nextStreak,
            longestStreak: Math.max(prog?.longestStreak ?? 0, nextStreak),
            lastActivityDate: today,
            updatedAt: new Date(),
          })
          .where(eq(userProgress.userId, userId))
          .returning();
        updatedProgress = savedProg;
      }

      res.json({ task: updated, progress: updatedProgress });
    } catch (error) {
      console.error('PUT /api/tasks/:id failed:', error);
      res.status(500).json({ error: 'Failed to update task.' });
    }
  });

  app.delete('/api/tasks/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      await db
        .delete(focusTasks)
        .where(and(eq(focusTasks.id, id), eq(focusTasks.userId, req.dbUserId!)));
      res.json({ deleted: true });
    } catch (error) {
      console.error('DELETE /api/tasks/:id failed:', error);
      res.status(500).json({ error: 'Failed to delete task.' });
    }
  });

  // Web Push & Phone Reminders
  app.get('/api/push/status', requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.dbUserId!;
      const { publicKey } = await getVapidKeys();
      const subs = await db
        .select({
          id: pushSubscriptions.id,
          endpoint: pushSubscriptions.endpoint,
          reminderTime: pushSubscriptions.reminderTime,
          timezoneOffsetMinutes: pushSubscriptions.timezoneOffsetMinutes,
          enabled: pushSubscriptions.enabled,
        })
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.userId, userId));

      const [pref] = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, userId))
        .limit(1);

      res.json({
        publicKey,
        subscriptionsCount: subs.filter((s) => s.enabled).length,
        endpoints: subs.map((s) => s.endpoint),
        reminderTime:
          subs[0]?.reminderTime ||
          pref?.notificationPreferences?.reminderTime ||
          '20:00',
      });
    } catch (error) {
      console.error('GET /api/push/status failed:', error);
      res.status(500).json({ error: 'Failed to fetch push status.' });
    }
  });

  app.post('/api/push/subscribe', requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.dbUserId!;
      const { subscription, reminderTime, timezoneOffsetMinutes } = req.body as {
        subscription?: {
          endpoint?: string;
          keys?: { p256dh?: string; auth?: string };
        };
        reminderTime?: string;
        timezoneOffsetMinutes?: number;
      };

      const endpoint = subscription?.endpoint?.trim();
      const p256dh = subscription?.keys?.p256dh?.trim();
      const authKey = subscription?.keys?.auth?.trim();

      if (!endpoint || !p256dh || !authKey) {
        return res.status(400).json({ error: 'Invalid push subscription payload.' });
      }

      const cleanTime =
        reminderTime && /^\d{2}:\d{2}$/.test(reminderTime) ? reminderTime : '20:00';
      const tzOffset =
        typeof timezoneOffsetMinutes === 'number' && Number.isFinite(timezoneOffsetMinutes)
          ? Math.round(timezoneOffsetMinutes)
          : -420;

      await db
        .insert(pushSubscriptions)
        .values({
          userId,
          endpoint,
          p256dh,
          auth: authKey,
          reminderTime: cleanTime,
          timezoneOffsetMinutes: tzOffset,
          enabled: true,
        })
        .onConflictDoUpdate({
          target: pushSubscriptions.endpoint,
          set: {
            userId,
            p256dh,
            auth: authKey,
            reminderTime: cleanTime,
            timezoneOffsetMinutes: tzOffset,
            enabled: true,
            updatedAt: new Date(),
          },
        });

      // Sync reminderTime into userPreferences as well
      const [pref] = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, userId))
        .limit(1);
      if (pref) {
        await db
          .update(userPreferences)
          .set({
            notificationPreferences: {
              ...pref.notificationPreferences,
              dailyReminder: true,
              reminderTime: cleanTime,
              timezoneOffsetMinutes: tzOffset,
            },
            updatedAt: new Date(),
          })
          .where(eq(userPreferences.userId, userId));
      }

      res.json({ subscribed: true, reminderTime: cleanTime });
    } catch (error) {
      console.error('POST /api/push/subscribe failed:', error);
      res.status(500).json({ error: 'Failed to save push subscription.' });
    }
  });

  app.put('/api/push/schedule', requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.dbUserId!;
      const { reminderTime, timezoneOffsetMinutes } = req.body as {
        reminderTime?: string;
        timezoneOffsetMinutes?: number;
      };
      const cleanTime =
        reminderTime && /^\d{2}:\d{2}$/.test(reminderTime) ? reminderTime : '20:00';
      const tzOffset =
        typeof timezoneOffsetMinutes === 'number' && Number.isFinite(timezoneOffsetMinutes)
          ? Math.round(timezoneOffsetMinutes)
          : -420;

      await db
        .update(pushSubscriptions)
        .set({
          reminderTime: cleanTime,
          timezoneOffsetMinutes: tzOffset,
          lastDailySentDate: null,
          updatedAt: new Date(),
        })
        .where(eq(pushSubscriptions.userId, userId));

      const [pref] = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, userId))
        .limit(1);
      if (pref) {
        await db
          .update(userPreferences)
          .set({
            notificationPreferences: {
              ...pref.notificationPreferences,
              reminderTime: cleanTime,
              timezoneOffsetMinutes: tzOffset,
            },
            updatedAt: new Date(),
          })
          .where(eq(userPreferences.userId, userId));
      }

      res.json({ updated: true, reminderTime: cleanTime });
    } catch (error) {
      console.error('PUT /api/push/schedule failed:', error);
      res.status(500).json({ error: 'Failed to update reminder schedule.' });
    }
  });

  app.delete('/api/push/unsubscribe', requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.dbUserId!;
      const { endpoint } = (req.body || {}) as { endpoint?: string };
      if (endpoint) {
        await db
          .delete(pushSubscriptions)
          .where(
            and(
              eq(pushSubscriptions.userId, userId),
              eq(pushSubscriptions.endpoint, endpoint)
            )
          );
      } else {
        await db
          .delete(pushSubscriptions)
          .where(eq(pushSubscriptions.userId, userId));
      }
      res.json({ unsubscribed: true });
    } catch (error) {
      console.error('DELETE /api/push/unsubscribe failed:', error);
      res.status(500).json({ error: 'Failed to unsubscribe push notifications.' });
    }
  });

  app.post('/api/push/test', requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.dbUserId!;
      const [u] = await db
        .select({ preferredLanguage: users.preferredLanguage })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      const isVi = (u?.preferredLanguage || 'vi') === 'vi';

      const result = await sendPushToUser(userId, {
        title: isVi ? 'BRAVE · Thông báo thử nghiệm' : 'BRAVE · Test Notification',
        body: isVi
          ? 'Thông báo điện thoại đã hoạt động! BRAVE sẽ nhắc bạn đúng giờ hẹn và trước các việc quan trọng.'
          : 'Phone notifications are working! BRAVE will gently remind you on schedule.',
        url: '/',
        tag: `brave-test-${Date.now()}`,
      });

      res.json(result);
    } catch (error) {
      console.error('POST /api/push/test failed:', error);
      res.status(500).json({ error: 'Failed to send test push notification.' });
    }
  });

  // Brave Diary (strictly private)
  app.get('/api/diary', requireAuth, async (req: AuthRequest, res) => {
    try {
      const entries = await db
        .select()
        .from(diaryEntries)
        .where(eq(diaryEntries.userId, req.dbUserId!))
        .orderBy(desc(diaryEntries.createdAt));
      res.json({ entries });
    } catch (error) {
      console.error('GET /api/diary failed:', error);
      res.status(500).json({ error: 'Failed to load diary entries.' });
    }
  });

  app.post('/api/diary', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { title, content, mood, promptUsed, lessonLearned, imageData } = req.body;
      if (!title || !content) {
        return res.status(400).json({ error: 'Title and reflection content are required.' });
      }
      const [created] = await db
        .insert(diaryEntries)
        .values({
          userId: req.dbUserId!,
          title: String(title).trim().slice(0, 160),
          content: String(content).trim().slice(0, 5000),
          mood: String(mood || 'hopeful').slice(0, 40),
          promptUsed: promptUsed ? String(promptUsed).slice(0, 300) : null,
          lessonLearned: lessonLearned ? String(lessonLearned).trim().slice(0, 500) : null,
          imageData:
            typeof imageData === 'string' && imageData.startsWith('data:image/')
              ? imageData.slice(0, 1500000)
              : null,
          isPrivate: true,
        })
        .returning();
      res.status(201).json({ entry: created });
    } catch (error) {
      console.error('POST /api/diary failed:', error);
      res.status(500).json({ error: 'Failed to save diary entry.' });
    }
  });

  app.delete('/api/diary/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      await db
        .delete(diaryEntries)
        .where(and(eq(diaryEntries.id, id), eq(diaryEntries.userId, req.dbUserId!)));
      res.json({ deleted: true });
    } catch (error) {
      console.error('DELETE /api/diary/:id failed:', error);
      res.status(500).json({ error: 'Failed to delete diary entry.' });
    }
  });

  // Future Self Letters
  app.get('/api/letters', requireAuth, async (req: AuthRequest, res) => {
    try {
      const rows = await db
        .select()
        .from(futureLetters)
        .where(eq(futureLetters.userId, req.dbUserId!))
        .orderBy(desc(futureLetters.createdAt));

      const today = getTodayDateString();
      const normalized = rows.map((letter) => ({
        ...letter,
        isDelivered: letter.isDelivered || letter.deliveryDate <= today,
      }));
      res.json({ letters: normalized });
    } catch (error) {
      console.error('GET /api/letters failed:', error);
      res.status(500).json({ error: 'Failed to load letters.' });
    }
  });

  app.post('/api/letters', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { title, content, futureGoals, deliveryDate } = req.body;
      if (!title || !content || !deliveryDate) {
        return res.status(400).json({ error: 'Title, letter content, and delivery date required.' });
      }
      const today = getTodayDateString();
      const [created] = await db
        .insert(futureLetters)
        .values({
          userId: req.dbUserId!,
          title: String(title).trim().slice(0, 160),
          content: String(content).trim().slice(0, 6000),
          futureGoals: Array.isArray(futureGoals)
            ? futureGoals.map((g) => String(g).trim()).filter(Boolean).slice(0, 6)
            : [],
          deliveryDate: String(deliveryDate).slice(0, 10),
          isDelivered: String(deliveryDate).slice(0, 10) <= today,
        })
        .returning();
      res.status(201).json({ letter: created });
    } catch (error) {
      console.error('POST /api/letters failed:', error);
      res.status(500).json({ error: 'Failed to seal future letter.' });
    }
  });

  app.put('/api/letters/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const { goalAchieved } = req.body as { goalAchieved?: boolean };
      const [updated] = await db
        .update(futureLetters)
        .set({ goalAchieved: Boolean(goalAchieved) })
        .where(and(eq(futureLetters.id, id), eq(futureLetters.userId, req.dbUserId!)))
        .returning();
      if (!updated) return res.status(404).json({ error: 'Letter not found.' });
      res.json({ letter: updated });
    } catch (error) {
      console.error('PUT /api/letters/:id failed:', error);
      res.status(500).json({ error: 'Failed to update letter.' });
    }
  });

  app.delete('/api/letters/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      await db
        .delete(futureLetters)
        .where(and(eq(futureLetters.id, id), eq(futureLetters.userId, req.dbUserId!)));
      res.json({ deleted: true });
    } catch (error) {
      console.error('DELETE /api/letters/:id failed:', error);
      res.status(500).json({ error: 'Failed to delete letter.' });
    }
  });

  // AI Brave Coach
  app.get('/api/coach/messages', requireAuth, async (req: AuthRequest, res) => {
    try {
      const messages = await db
        .select()
        .from(coachMessages)
        .where(eq(coachMessages.userId, req.dbUserId!))
        .orderBy(coachMessages.createdAt);
      res.json({ messages });
    } catch (error) {
      console.error('GET /api/coach/messages failed:', error);
      res.status(500).json({ error: 'Failed to load coach conversation.' });
    }
  });

  app.post('/api/coach/chat', requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.dbUserId!;
      const { message, language } = req.body as { message?: string; language?: 'vi' | 'en' };
      if (!message || !message.trim()) {
        return res.status(400).json({ error: 'Message cannot be empty.' });
      }

      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      const [prefs] = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, userId))
        .limit(1);
      const [prog] = await db
        .select()
        .from(userProgress)
        .where(eq(userProgress.userId, userId))
        .limit(1);
      const recent = await db
        .select()
        .from(coachMessages)
        .where(eq(coachMessages.userId, userId))
        .orderBy(desc(coachMessages.createdAt))
        .limit(8);

      const activeLang = language === 'en' || language === 'vi' ? language : (user?.preferredLanguage as 'vi' | 'en') || 'vi';
      const cleanMsg = message.trim().slice(0, 1500);

      const [savedUserMsg] = await db
        .insert(coachMessages)
        .values({
          userId,
          role: 'user',
          content: cleanMsg,
          language: activeLang,
        })
        .returning();

      const result = await generateCoachReply({
        language: activeLang,
        userName: user?.fullName || user?.username || 'bạn',
        goals: prefs?.personalGoals || [],
        fears: prefs?.fearCategories || [],
        confidenceLevel: prefs?.confidenceLevel ?? 5,
        completedCount: prog?.completedChallenges ?? 0,
        recentHistory: recent
          .reverse()
          .map((m) => ({ role: m.role, content: m.content })),
        userMessage: cleanMsg,
      });

      const fullReply = result.reflectiveQuestion
        ? `${result.reply}\n\n${result.reflectiveQuestion}`
        : result.reply;

      const [savedAssistantMsg] = await db
        .insert(coachMessages)
        .values({
          userId,
          role: 'assistant',
          content: fullReply,
          suggestedChallenge: result.suggestedChallenge,
          language: activeLang,
        })
        .returning();

      res.json({
        userMessage: savedUserMsg,
        assistantMessage: savedAssistantMsg,
        source: result.source,
      });
    } catch (error) {
      console.error('POST /api/coach/chat failed:', error);
      res.status(500).json({ error: 'Coach could not respond right now.' });
    }
  });

  app.delete('/api/coach/messages', requireAuth, async (req: AuthRequest, res) => {
    try {
      await db.delete(coachMessages).where(eq(coachMessages.userId, req.dbUserId!));
      res.json({ cleared: true });
    } catch (error) {
      console.error('DELETE /api/coach/messages failed:', error);
      res.status(500).json({ error: 'Failed to clear coach history.' });
    }
  });

  // BRAVE Together — Community
  app.get('/api/community/feed', requireAuth, async (req: AuthRequest, res) => {
    try {
      await ensureSeededData();
      const userId = req.dbUserId!;

      const blocks = await db
        .select({ blockedId: userBlocks.blockedId })
        .from(userBlocks)
        .where(eq(userBlocks.blockerId, userId));
      const blockedSet = new Set(blocks.map((b) => b.blockedId));

      const rawPosts = await db
        .select()
        .from(communityPosts)
        .where(
          blockedSet.size > 0
            ? notInArray(communityPosts.userId, Array.from(blockedSet))
            : sql`true`
        )
        .orderBy(desc(communityPosts.createdAt))
        .limit(40);

      const authorIds = Array.from(new Set(rawPosts.map((p) => p.userId)));
      const authors =
        authorIds.length > 0
          ? await db
              .select({
                id: users.id,
                fullName: users.fullName,
                username: users.username,
                avatarUrl: users.avatarUrl,
              })
              .from(users)
              .where(inArray(users.id, authorIds))
          : [];
      const authorMap = new Map(authors.map((a) => [a.id, a]));

      const postIds = rawPosts.map((p) => p.id);
      const reactions =
        postIds.length > 0
          ? await db
              .select()
              .from(communityReactions)
              .where(inArray(communityReactions.postId, postIds))
          : [];
      const comments =
        postIds.length > 0
          ? await db
              .select()
              .from(communityComments)
              .where(inArray(communityComments.postId, postIds))
              .orderBy(communityComments.createdAt)
          : [];

      const commentAuthorIds = Array.from(new Set(comments.map((c) => c.userId)));
      const missingCommentAuthors = commentAuthorIds.filter((id) => !authorMap.has(id));
      if (missingCommentAuthors.length > 0) {
        const extra = await db
          .select({
            id: users.id,
            fullName: users.fullName,
            username: users.username,
            avatarUrl: users.avatarUrl,
          })
          .from(users)
          .where(inArray(users.id, missingCommentAuthors));
        extra.forEach((a) => authorMap.set(a.id, a));
      }

      const follows = await db
        .select({ followingId: userFollows.followingId })
        .from(userFollows)
        .where(eq(userFollows.followerId, userId));
      const followingSet = new Set(follows.map((f) => f.followingId));

      const enriched = rawPosts.map((post) => {
        const postReactions = reactions.filter((r) => r.postId === post.id);
        const myReaction = postReactions.find((r) => r.userId === userId)?.reactionType || null;
        const reactionCounts = {
          courage: postReactions.filter((r) => r.reactionType === 'courage').length,
          warmth: postReactions.filter((r) => r.reactionType === 'warmth').length,
          inspire: postReactions.filter((r) => r.reactionType === 'inspire').length,
        };
        const postComments = comments
          .filter((c) => c.postId === post.id && !blockedSet.has(c.userId))
          .map((c) => ({
            ...c,
            author: authorMap.get(c.userId) || {
              id: c.userId,
              fullName: 'Brave Member',
              username: 'member',
              avatarUrl: null,
            },
          }));

        return {
          ...post,
          author: authorMap.get(post.userId) || {
            id: post.userId,
            fullName: 'Brave Member',
            username: 'member',
            avatarUrl: null,
          },
          isFollowingAuthor: followingSet.has(post.userId),
          isOwnPost: post.userId === userId,
          myReaction,
          reactionCounts,
          comments: postComments,
        };
      });

      const groups = await db.select().from(challengeGroups);
      const memberships = await db
        .select({ groupId: groupMemberships.groupId })
        .from(groupMemberships)
        .where(eq(groupMemberships.userId, userId));
      const joinedSet = new Set(memberships.map((m) => m.groupId));
      const memberCounts = await db
        .select({
          groupId: groupMemberships.groupId,
          total: sql<number>`count(*)::int`,
        })
        .from(groupMemberships)
        .groupBy(groupMemberships.groupId);
      const countMap = new Map(memberCounts.map((m) => [m.groupId, m.total]));

      res.json({
        posts: enriched,
        groups: groups.map((g) => ({
          ...g,
          joined: joinedSet.has(g.id),
          memberCount: countMap.get(g.id) || 0,
        })),
      });
    } catch (error) {
      console.error('GET /api/community/feed failed:', error);
      res.status(500).json({ error: 'Failed to load community feed.' });
    }
  });

  app.post('/api/community/posts', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { content, category, challengeTitle } = req.body;
      if (!content || !String(content).trim()) {
        return res.status(400).json({ error: 'Post content is required.' });
      }
      const [created] = await db
        .insert(communityPosts)
        .values({
          userId: req.dbUserId!,
          content: String(content).trim().slice(0, 2000),
          category: String(category || 'story').slice(0, 40),
          challengeTitle: challengeTitle ? String(challengeTitle).trim().slice(0, 140) : null,
          visibility: 'public',
        })
        .returning();
      res.status(201).json({ post: created });
    } catch (error) {
      console.error('POST /api/community/posts failed:', error);
      res.status(500).json({ error: 'Failed to publish post.' });
    }
  });

  app.delete('/api/community/posts/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      await db
        .delete(communityPosts)
        .where(and(eq(communityPosts.id, id), eq(communityPosts.userId, req.dbUserId!)));
      res.json({ deleted: true });
    } catch (error) {
      console.error('DELETE /api/community/posts/:id failed:', error);
      res.status(500).json({ error: 'Failed to delete post.' });
    }
  });

  app.post('/api/community/posts/:id/react', requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.dbUserId!;
      const postId = Number(req.params.id);
      const { reactionType } = req.body as { reactionType?: 'courage' | 'warmth' | 'inspire' };
      const type = reactionType || 'courage';

      const [existing] = await db
        .select()
        .from(communityReactions)
        .where(and(eq(communityReactions.postId, postId), eq(communityReactions.userId, userId)))
        .limit(1);

      if (existing && existing.reactionType === type) {
        await db.delete(communityReactions).where(eq(communityReactions.id, existing.id));
        return res.json({ reaction: null });
      }

      if (existing) {
        const [updated] = await db
          .update(communityReactions)
          .set({ reactionType: type })
          .where(eq(communityReactions.id, existing.id))
          .returning();
        return res.json({ reaction: updated.reactionType });
      }

      const [created] = await db
        .insert(communityReactions)
        .values({ postId, userId, reactionType: type })
        .returning();
      res.json({ reaction: created.reactionType });
    } catch (error) {
      console.error('POST /api/community/posts/:id/react failed:', error);
      res.status(500).json({ error: 'Failed to react to post.' });
    }
  });

  app.post('/api/community/posts/:id/comments', requireAuth, async (req: AuthRequest, res) => {
    try {
      const postId = Number(req.params.id);
      const { content } = req.body;
      if (!content || !String(content).trim()) {
        return res.status(400).json({ error: 'Comment cannot be empty.' });
      }
      const [created] = await db
        .insert(communityComments)
        .values({
          postId,
          userId: req.dbUserId!,
          content: String(content).trim().slice(0, 800),
        })
        .returning();
      res.status(201).json({ comment: created });
    } catch (error) {
      console.error('POST /api/community/posts/:id/comments failed:', error);
      res.status(500).json({ error: 'Failed to post comment.' });
    }
  });

  app.post('/api/community/posts/:id/report', requireAuth, async (req: AuthRequest, res) => {
    try {
      const postId = Number(req.params.id);
      const { reason } = req.body;
      await db.insert(reports).values({
        reporterId: req.dbUserId!,
        reportedPostId: postId,
        reason: String(reason || 'Inappropriate content').slice(0, 400),
        status: 'pending',
      });
      res.status(201).json({ reported: true });
    } catch (error) {
      console.error('POST /api/community/posts/:id/report failed:', error);
      res.status(500).json({ error: 'Failed to submit report.' });
    }
  });

  app.post('/api/community/follow/:targetUserId', requireAuth, async (req: AuthRequest, res) => {
    try {
      const followerId = req.dbUserId!;
      const followingId = Number(req.params.targetUserId);
      if (followerId === followingId) {
        return res.status(400).json({ error: 'Cannot follow yourself.' });
      }
      const [existing] = await db
        .select()
        .from(userFollows)
        .where(and(eq(userFollows.followerId, followerId), eq(userFollows.followingId, followingId)))
        .limit(1);

      if (existing) {
        await db.delete(userFollows).where(eq(userFollows.id, existing.id));
        return res.json({ following: false });
      }
      await db.insert(userFollows).values({ followerId, followingId });
      res.json({ following: true });
    } catch (error) {
      console.error('POST /api/community/follow failed:', error);
      res.status(500).json({ error: 'Failed to update follow status.' });
    }
  });

  app.post('/api/community/block/:targetUserId', requireAuth, async (req: AuthRequest, res) => {
    try {
      const blockerId = req.dbUserId!;
      const blockedId = Number(req.params.targetUserId);
      if (blockerId === blockedId) {
        return res.status(400).json({ error: 'Cannot block yourself.' });
      }
      await db
        .insert(userBlocks)
        .values({ blockerId, blockedId })
        .onConflictDoNothing();
      res.json({ blocked: true });
    } catch (error) {
      console.error('POST /api/community/block failed:', error);
      res.status(500).json({ error: 'Failed to block user.' });
    }
  });

  app.post('/api/community/groups/:id/toggle', requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.dbUserId!;
      const groupId = Number(req.params.id);
      const [existing] = await db
        .select()
        .from(groupMemberships)
        .where(and(eq(groupMemberships.groupId, groupId), eq(groupMemberships.userId, userId)))
        .limit(1);

      if (existing) {
        await db.delete(groupMemberships).where(eq(groupMemberships.id, existing.id));
        return res.json({ joined: false });
      }
      await db.insert(groupMemberships).values({ groupId, userId });
      res.json({ joined: true });
    } catch (error) {
      console.error('POST /api/community/groups/:id/toggle failed:', error);
      res.status(500).json({ error: 'Failed to update group membership.' });
    }
  });

  app.use('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API route not found' });
  });

  const isProd =
    process.env.NODE_ENV === 'production' ||
    process.env.npm_lifecycle_event === 'start';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(
        express.static(distPath, {
          setHeaders: (res, filePath) => {
            if (filePath.endsWith('.webmanifest')) {
              res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
            } else if (filePath.endsWith('sw.js') || filePath.endsWith('sw-push.js')) {
              res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            }
          },
        })
      );
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      app.get('/', (_req, res) => {
        res.json({ ok: true, service: 'brave-api' });
      });
    }
  }

  const port = Number(process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`BRAVE server listening on http://0.0.0.0:${port}`);
    startReminderScheduler();
  });
}

startServer().catch((err) => {
  console.error('Failed to start BRAVE server:', err);
  process.exit(1);
});

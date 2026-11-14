import { eq } from 'drizzle-orm';
import { db } from './index.ts';
import { userPreferences, userProgress, users } from './schema.ts';

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string | null,
  avatarUrl?: string | null
) {
  try {
    const existing = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (existing.length > 0) {
      const current = existing[0];
      const nextFullName =
        displayName && (!current.fullName || current.fullName === current.email.split('@')[0])
          ? displayName
          : current.fullName;
      const nextAvatar = avatarUrl && !current.avatarUrl ? avatarUrl : current.avatarUrl;
      const nextEmail = email && current.email !== email ? email : current.email;
      if (
        nextFullName !== current.fullName ||
        nextAvatar !== current.avatarUrl ||
        nextEmail !== current.email
      ) {
        const [synced] = await db
          .update(users)
          .set({
            fullName: nextFullName,
            avatarUrl: nextAvatar,
            email: nextEmail,
            updatedAt: new Date(),
          })
          .where(eq(users.id, current.id))
          .returning();
        return synced;
      }
      return current;
    }

    const baseUsername = (email.split('@')[0] || 'brave')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 18);
    const suffix = uid.slice(0, 5).toLowerCase();
    const generatedUsername = `${baseUsername || 'brave'}_${suffix}`;

    const [created] = await db
      .insert(users)
      .values({
        uid,
        email,
        fullName: displayName || email.split('@')[0] || 'Brave Explorer',
        username: generatedUsername,
        avatarUrl: avatarUrl || null,
        preferredLanguage: 'vi',
        onboardingCompleted: false,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: { email },
      })
      .returning();

    await db
      .insert(userPreferences)
      .values({
        userId: created.id,
        personalGoals: [],
        fearCategories: [],
        confidenceLevel: 5,
        challengeIntensity: 'gentle',
        availableTime: '10',
      })
      .onConflictDoNothing({ target: userPreferences.userId });

    await db
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
      .onConflictDoNothing({ target: userProgress.userId });

    return created;
  } catch (error) {
    console.error('Database error in getOrCreateUser:', error);
    throw new Error('Failed to synchronize user account.', { cause: error });
  }
}

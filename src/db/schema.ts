import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export interface NotificationPrefs {
  dailyReminder: boolean;
  weeklySummary: boolean;
  milestoneAlerts: boolean;
  encouragingMessages: boolean;
  reminderTime?: string;
  timezoneOffsetMinutes?: number;
}

export interface ConfidenceEntry {
  date: string;
  score: number;
}

export interface SuggestedChallengePayload {
  title: string;
  description: string;
  category: string;
  difficulty: string;
  estimatedMinutes: number;
  rewardPoints: number;
}

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  passwordHash: text('password_hash'),
  emailVerified: boolean('email_verified').notNull().default(false),
  verificationToken: text('verification_token'),
  resetToken: text('reset_token'),
  resetTokenExpiresAt: timestamp('reset_token_expires_at'),
  username: text('username').unique(),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  preferredLanguage: text('preferred_language').notNull().default('vi'),
  onboardingCompleted: boolean('onboarding_completed').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const userPreferences = pgTable('user_preferences', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  personalGoals: jsonb('personal_goals').$type<string[]>().notNull().default([]),
  fearCategories: jsonb('fear_categories').$type<string[]>().notNull().default([]),
  confidenceLevel: integer('confidence_level').notNull().default(5),
  challengeIntensity: text('challenge_intensity').notNull().default('gentle'),
  availableTime: text('available_time').notNull().default('10'),
  notificationPreferences: jsonb('notification_preferences')
    .$type<NotificationPrefs>()
    .notNull()
    .default({
      dailyReminder: true,
      weeklySummary: true,
      milestoneAlerts: true,
      encouragingMessages: true,
      reminderTime: '20:00',
      timezoneOffsetMinutes: -420,
    }),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const fears = pgTable(
  'fears',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    category: text('category').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    intensity: integer('intensity').notNull().default(5),
    triggers: text('triggers'),
    emotionalResponse: text('emotional_response'),
    progressNote: text('progress_note'),
    isResolved: boolean('is_resolved').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('fears_user_id_idx').on(table.userId)]
);

export const challenges = pgTable('challenges', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  level: integer('level').notNull().default(1),
  titleVi: text('title_vi').notNull(),
  titleEn: text('title_en').notNull(),
  descriptionVi: text('description_vi').notNull(),
  descriptionEn: text('description_en').notNull(),
  stepsVi: jsonb('steps_vi').$type<string[]>().notNull().default([]),
  stepsEn: jsonb('steps_en').$type<string[]>().notNull().default([]),
  category: text('category').notNull(),
  difficulty: text('difficulty').notNull().default('tiny'),
  estimatedMinutes: integer('estimated_minutes').notNull().default(5),
  rewardPoints: integer('reward_points').notNull().default(10),
  completionCriteriaVi: text('completion_criteria_vi'),
  completionCriteriaEn: text('completion_criteria_en'),
  sourceType: text('source_type').notNull().default('system'),
  handbookRef: text('handbook_ref'),
  createdByUserId: integer('created_by_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  isPublic: boolean('is_public').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),
});

export const userChallenges = pgTable(
  'user_challenges',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    challengeId: integer('challenge_id').references(() => challenges.id, {
      onDelete: 'set null',
    }),
    customTitle: text('custom_title'),
    customDescription: text('custom_description'),
    customCategory: text('custom_category'),
    customDifficulty: text('custom_difficulty'),
    status: text('status').notNull().default('assigned'),
    assignedDate: text('assigned_date'),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
    reflection: text('reflection'),
    difficultyRating: integer('difficulty_rating'),
    pointsEarned: integer('points_earned').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('user_challenges_user_id_idx').on(table.userId)]
);

export const userProgress = pgTable('user_progress', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  totalPoints: integer('total_points').notNull().default(0),
  currentStreak: integer('current_streak').notNull().default(0),
  longestStreak: integer('longest_streak').notNull().default(0),
  completedChallenges: integer('completed_challenges').notNull().default(0),
  lastActivityDate: text('last_activity_date'),
  unlockedBadges: jsonb('unlocked_badges').$type<string[]>().notNull().default([]),
  confidenceHistory: jsonb('confidence_history')
    .$type<ConfidenceEntry[]>()
    .notNull()
    .default([]),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const diaryEntries = pgTable(
  'diary_entries',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    title: text('title').notNull(),
    content: text('content').notNull(),
    mood: text('mood').notNull().default('hopeful'),
    promptUsed: text('prompt_used'),
    lessonLearned: text('lesson_learned'),
    imageData: text('image_data'),
    isPrivate: boolean('is_private').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('diary_entries_user_id_idx').on(table.userId)]
);

export const futureLetters = pgTable(
  'future_letters',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    title: text('title').notNull(),
    content: text('content').notNull(),
    futureGoals: jsonb('future_goals').$type<string[]>().notNull().default([]),
    goalAchieved: boolean('goal_achieved').notNull().default(false),
    deliveryDate: text('delivery_date').notNull(),
    isDelivered: boolean('is_delivered').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('future_letters_user_id_idx').on(table.userId)]
);

export const coachMessages = pgTable(
  'coach_messages',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    role: text('role').notNull(),
    content: text('content').notNull(),
    suggestedChallenge: jsonb('suggested_challenge').$type<SuggestedChallengePayload | null>(),
    language: text('language').notNull().default('vi'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('coach_messages_user_id_idx').on(table.userId)]
);

export const communityPosts = pgTable(
  'community_posts',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    content: text('content').notNull(),
    category: text('category').notNull().default('story'),
    challengeTitle: text('challenge_title'),
    visibility: text('visibility').notNull().default('public'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('community_posts_user_id_idx').on(table.userId)]
);

export const communityComments = pgTable(
  'community_comments',
  {
    id: serial('id').primaryKey(),
    postId: integer('post_id')
      .references(() => communityPosts.id, { onDelete: 'cascade' })
      .notNull(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('community_comments_post_id_idx').on(table.postId)]
);

export const communityReactions = pgTable(
  'community_reactions',
  {
    id: serial('id').primaryKey(),
    postId: integer('post_id')
      .references(() => communityPosts.id, { onDelete: 'cascade' })
      .notNull(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    reactionType: text('reaction_type').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('community_reactions_post_user_idx').on(table.postId, table.userId),
  ]
);

export const userFollows = pgTable(
  'user_follows',
  {
    id: serial('id').primaryKey(),
    followerId: integer('follower_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    followingId: integer('following_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('user_follows_pair_idx').on(table.followerId, table.followingId),
  ]
);

export const userBlocks = pgTable(
  'user_blocks',
  {
    id: serial('id').primaryKey(),
    blockerId: integer('blocker_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    blockedId: integer('blocked_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('user_blocks_pair_idx').on(table.blockerId, table.blockedId),
  ]
);

export const reports = pgTable('reports', {
  id: serial('id').primaryKey(),
  reporterId: integer('reporter_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  reportedPostId: integer('reported_post_id').references(() => communityPosts.id, {
    onDelete: 'cascade',
  }),
  reason: text('reason').notNull(),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const challengeGroups = pgTable('challenge_groups', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  nameVi: text('name_vi').notNull(),
  nameEn: text('name_en').notNull(),
  descriptionVi: text('description_vi').notNull(),
  descriptionEn: text('description_en').notNull(),
  category: text('category').notNull(),
});

export const groupMemberships = pgTable(
  'group_memberships',
  {
    id: serial('id').primaryKey(),
    groupId: integer('group_id')
      .references(() => challengeGroups.id, { onDelete: 'cascade' })
      .notNull(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('group_memberships_pair_idx').on(table.groupId, table.userId),
  ]
);

export const focusTasks = pgTable(
  'focus_tasks',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    title: text('title').notNull(),
    notes: text('notes'),
    scheduledDate: text('scheduled_date').notNull(),
    scheduledTime: text('scheduled_time'),
    durationMinutes: integer('duration_minutes').notNull().default(25),
    priority: text('priority').notNull().default('important'),
    procrastinationTrigger: text('procrastination_trigger'),
    tinyFirstStep: text('tiny_first_step'),
    status: text('status').notNull().default('todo'),
    focusSecondsSpent: integer('focus_seconds_spent').notNull().default(0),
    reminderSentAt: timestamp('reminder_sent_at'),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('focus_tasks_user_id_idx').on(table.userId),
    index('focus_tasks_user_date_idx').on(table.userId, table.scheduledDate),
  ]
);

export const appSettings = pgTable('app_settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    endpoint: text('endpoint').notNull().unique(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    reminderTime: text('reminder_time').notNull().default('20:00'),
    timezoneOffsetMinutes: integer('timezone_offset_minutes').notNull().default(-420),
    enabled: boolean('enabled').notNull().default(true),
    lastDailySentDate: text('last_daily_sent_date'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('push_subscriptions_user_id_idx').on(table.userId)]
);

export const usersRelations = relations(users, ({ one, many }) => ({
  preferences: one(userPreferences),
  progress: one(userProgress),
  fears: many(fears),
  userChallenges: many(userChallenges),
  diaryEntries: many(diaryEntries),
  futureLetters: many(futureLetters),
  coachMessages: many(coachMessages),
  communityPosts: many(communityPosts),
  focusTasks: many(focusTasks),
}));

export const communityPostsRelations = relations(communityPosts, ({ one, many }) => ({
  author: one(users, {
    fields: [communityPosts.userId],
    references: [users.id],
  }),
  comments: many(communityComments),
  reactions: many(communityReactions),
}));

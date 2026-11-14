export type Language = 'vi' | 'en';

export type ScreenId =
  | 'home'
  | 'planner'
  | 'fears'
  | 'coach'
  | 'challenges'
  | 'diary'
  | 'journey'
  | 'community'
  | 'profile';

export interface NotificationPrefs {
  dailyReminder: boolean;
  weeklySummary: boolean;
  milestoneAlerts: boolean;
  encouragingMessages: boolean;
  reminderTime?: string;
  timezoneOffsetMinutes?: number;
}

export interface UserProfile {
  id: number;
  uid: string;
  email: string;
  username: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  preferredLanguage: Language;
  onboardingCompleted: boolean;
  createdAt: string;
}

export interface UserPreferences {
  id: number;
  userId: number;
  personalGoals: string[];
  fearCategories: string[];
  confidenceLevel: number;
  challengeIntensity: 'gentle' | 'balanced' | 'ambitious';
  availableTime: string;
  notificationPreferences: NotificationPrefs;
}

export interface ConfidencePoint {
  date: string;
  score: number;
}

export interface UserProgress {
  id: number;
  userId: number;
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  completedChallenges: number;
  lastActivityDate: string | null;
  unlockedBadges: string[];
  confidenceHistory: ConfidencePoint[];
}

export interface FearEntry {
  id: number;
  userId: number;
  category: string;
  title: string;
  description: string;
  intensity: number;
  triggers: string | null;
  emotionalResponse: string | null;
  progressNote: string | null;
  isResolved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChallengeTemplate {
  id: number;
  slug: string;
  level: number;
  titleVi: string;
  titleEn: string;
  descriptionVi: string;
  descriptionEn: string;
  stepsVi: string[];
  stepsEn: string[];
  category: string;
  difficulty: 'tiny' | 'easy' | 'medium' | 'difficult' | 'milestone';
  estimatedMinutes: number;
  rewardPoints: number;
  completionCriteriaVi: string | null;
  completionCriteriaEn: string | null;
  sourceType?: string;
  handbookRef?: string | null;
  createdByUserId?: number | null;
  isPublic?: boolean;
}

export interface UserChallenge {
  id: number;
  userId: number;
  challengeId: number | null;
  customTitle: string | null;
  customDescription: string | null;
  customCategory: string | null;
  customDifficulty: string | null;
  status: 'assigned' | 'in_progress' | 'paused' | 'completed' | 'skipped';
  assignedDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  reflection: string | null;
  difficultyRating: number | null;
  pointsEarned: number;
  createdAt: string;
}

export interface FocusTask {
  id: number;
  userId: number;
  title: string;
  notes: string | null;
  scheduledDate: string;
  scheduledTime: string | null;
  durationMinutes: number;
  priority: 'must_do' | 'important' | 'nice_to_have';
  procrastinationTrigger: string | null;
  tinyFirstStep: string | null;
  status: 'todo' | 'in_progress' | 'done';
  focusSecondsSpent: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DiaryEntry {
  id: number;
  userId: number;
  title: string;
  content: string;
  mood: string;
  promptUsed: string | null;
  lessonLearned: string | null;
  imageData: string | null;
  isPrivate: boolean;
  createdAt: string;
}

export interface FutureLetter {
  id: number;
  userId: number;
  title: string;
  content: string;
  futureGoals: string[];
  goalAchieved: boolean;
  deliveryDate: string;
  isDelivered: boolean;
  createdAt: string;
}

export interface SuggestedChallenge {
  title: string;
  description: string;
  category: string;
  difficulty: string;
  estimatedMinutes: number;
  rewardPoints: number;
}

export interface CoachMessage {
  id: number;
  userId: number;
  role: 'user' | 'assistant';
  content: string;
  suggestedChallenge: SuggestedChallenge | null;
  language: Language;
  createdAt: string;
}

export interface CommunityAuthor {
  id: number;
  fullName: string | null;
  username: string | null;
  avatarUrl: string | null;
}

export interface CommunityComment {
  id: number;
  postId: number;
  userId: number;
  content: string;
  createdAt: string;
  author: CommunityAuthor;
}

export interface CommunityPost {
  id: number;
  userId: number;
  content: string;
  category: string;
  challengeTitle: string | null;
  createdAt: string;
  author: CommunityAuthor;
  isFollowingAuthor: boolean;
  isOwnPost: boolean;
  myReaction: 'courage' | 'warmth' | 'inspire' | null;
  reactionCounts: {
    courage: number;
    warmth: number;
    inspire: number;
  };
  comments: CommunityComment[];
}

export interface ChallengeGroup {
  id: number;
  slug: string;
  nameVi: string;
  nameEn: string;
  descriptionVi: string;
  descriptionEn: string;
  category: string;
  joined: boolean;
  memberCount: number;
}

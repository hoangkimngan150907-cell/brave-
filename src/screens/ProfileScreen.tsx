import React, { useState } from 'react';
import { LogOut, Trash2 } from 'lucide-react';
import { GOALS_LIST, getT } from '../i18n/translations';
import { apiRequest } from '../lib/api';
import type {
  Language,
  NotificationPrefs,
  UserPreferences,
  UserProfile,
  UserProgress,
} from '../types/brave';
import { PWAInstallButton } from '../components/PWAComponents';
import { ReminderSettingsCard } from '../components/ReminderSettingsCard';
import courageEmblemImg from '../assets/images/courage_botanical_emblem_1794589220227.jpg';

interface ProfileScreenProps {
  lang: Language;
  onChangeLang: (lang: Language) => void;
  user: UserProfile;
  preferences: UserPreferences;
  progress: UserProgress;
  onLoggedOut: () => Promise<void>;
  onUpdated: (payload: {
    user?: UserProfile;
    preferences?: UserPreferences;
    progress?: UserProgress;
  }) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  lang,
  onChangeLang,
  user,
  preferences,
  progress,
  onLoggedOut,
  onUpdated,
}) => {
  const t = getT(lang);
  const [fullName, setFullName] = useState(user.fullName || '');
  const [username, setUsername] = useState(user.username || '');
  const [bio, setBio] = useState(user.bio || '');
  const [goals, setGoals] = useState<string[]>(preferences.personalGoals || []);
  const [customGoalInput, setCustomGoalInput] = useState('');
  const [confidenceLevel, setConfidenceLevel] = useState(
    preferences.confidenceLevel || 5
  );
  const [intensity, setIntensity] = useState(
    preferences.challengeIntensity || 'gentle'
  );
  const [availableTime, setAvailableTime] = useState(
    preferences.availableTime || '10'
  );
  const [notifs, setNotifs] = useState<NotificationPrefs>(
    preferences.notificationPreferences || {
      dailyReminder: true,
      weeklySummary: true,
      milestoneAlerts: true,
      encouragingMessages: true,
    }
  );
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const showSaved = () => {
    setSavedMsg(t.profile.savedToast);
    setTimeout(() => setSavedMsg(null), 3000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiRequest<{ user: UserProfile }>('/api/me/profile', {
      method: 'PUT',
      body: JSON.stringify({
        fullName,
        username,
        bio,
        preferredLanguage: lang,
      }),
    });
    onUpdated({ user: res.user });
    showSaved();
  };

  const handleSavePrefs = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiRequest<{
      user: UserProfile;
      preferences: UserPreferences;
      progress: UserProgress;
    }>('/api/me/preferences', {
      method: 'PUT',
      body: JSON.stringify({
        personalGoals: goals,
        confidenceLevel,
        challengeIntensity: intensity,
        availableTime,
        notificationPreferences: notifs,
      }),
    });
    onUpdated(res);
    showSaved();
  };

  const toggleGoal = (id: string) => {
    setGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const addCustomGoal = () => {
    const clean = customGoalInput.trim();
    if (!clean) return;
    if (!goals.includes(clean) && goals.length < 20) {
      setGoals((prev) => [...prev, clean]);
    }
    setCustomGoalInput('');
  };

  const customGoalsSelected = goals.filter(
    (id) => !GOALS_LIST.some((g) => g.id === id)
  );

  const handleDeleteAccount = async () => {
    await apiRequest('/api/me/account', { method: 'DELETE' });
    await onLoggedOut();
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#EADBD5]">
        <div>
          <h1 className="font-serif-editorial text-3xl font-semibold text-[#493633]">
            {t.profile.title}
          </h1>
          <p className="text-sm text-[#987D77] mt-1">{t.profile.subtitle}</p>
        </div>

        <button
          type="button"
          onClick={onLoggedOut}
          className="inline-flex items-center gap-2 rounded-full border border-[#EADBD5] bg-[#FFFAF7] hover:bg-[#E7BDB8]/30 px-5 py-2.5 min-h-[44px] text-sm font-medium text-[#493633] self-start sm:self-auto cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-[#C98585]" />
          <span>{t.profile.signOut}</span>
        </button>
      </div>

      {savedMsg && (
        <div className="rounded-2xl bg-[#FFFAF7] border border-[#C98585] px-4 py-3 text-xs font-medium text-[#493633]">
          {savedMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Profile Form */}
        <form
          onSubmit={handleSaveProfile}
          className="lg:col-span-6 rounded-3xl bg-[#FFFAF7] border border-[#EADBD5] p-6 sm:p-8 space-y-5"
        >
          <div className="flex items-center gap-4 pb-4 border-b border-[#EADBD5]">
            <div className="w-16 h-16 rounded-full overflow-hidden border border-[#EADBD5] bg-[#E7BDB8]/40 shrink-0">
              {!imgFailed ? (
                <img
                  src={courageEmblemImg}
                  alt="BRAVE botanical emblem"
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-serif-editorial text-xl text-[#493633]">
                  {(user.fullName || 'B')[0]}
                </div>
              )}
            </div>
            <div>
              <p className="font-serif-editorial text-xl font-semibold text-[#493633]">
                {user.fullName || user.username}
              </p>
              <p className="text-xs text-[#987D77]">
                {user.email} · {progress.totalPoints} {t.home.points}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#987D77] mb-1.5">
              {t.profile.displayName}
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/60 px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#987D77] mb-1.5">
              {t.profile.username}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/60 px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#987D77] mb-1.5">
              {t.profile.bio}
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/60 p-4 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#987D77] mb-2">
              {t.profile.language}
            </label>
            <div className="inline-flex items-center rounded-full border border-[#EADBD5] bg-[#F7EEE9] p-1">
              <button
                type="button"
                onClick={() => onChangeLang('vi')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-full cursor-pointer ${
                  lang === 'vi'
                    ? 'bg-[#C98585] text-[#FFFAF7]'
                    : 'text-[#987D77]'
                }`}
              >
                Tiếng Việt (VI)
              </button>
              <button
                type="button"
                onClick={() => onChangeLang('en')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-full cursor-pointer ${
                  lang === 'en'
                    ? 'bg-[#C98585] text-[#FFFAF7]'
                    : 'text-[#987D77]'
                }`}
              >
                English (EN)
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="rounded-full bg-[#C98585] hover:bg-[#b87474] px-6 py-2.5 min-h-[44px] text-sm font-medium text-[#FFFAF7] cursor-pointer"
          >
            {t.profile.saveProfile}
          </button>
        </form>

        {/* Preferences, Notifications & PWA */}
        <div className="lg:col-span-6 space-y-6">
          <form
            onSubmit={handleSavePrefs}
            className="rounded-3xl bg-[#FFFAF7] border border-[#EADBD5] p-6 sm:p-8 space-y-5"
          >
            <h2 className="font-serif-editorial text-xl font-semibold text-[#493633]">
              {t.profile.prefsTitle}
            </h2>

            <div>
              <p className="text-xs font-medium text-[#987D77] mb-2 tabular-nums">
                {t.onboarding.step2Title} ({goals.length}{' '}
                {lang === 'vi' ? 'đã chọn' : 'selected'})
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {GOALS_LIST.map((g) => {
                  const selected = goals.includes(g.id);
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => toggleGoal(g.id)}
                      className={`text-left rounded-xl border px-3 py-2 text-xs font-medium cursor-pointer ${
                        selected
                          ? 'border-[#C98585] bg-[#E7BDB8]/35 text-[#493633]'
                          : 'border-[#EADBD5] text-[#987D77]'
                      }`}
                    >
                      {lang === 'vi' ? g.vi : g.en}
                    </button>
                  );
                })}
                {customGoalsSelected.map((customLabel) => (
                  <button
                    key={customLabel}
                    type="button"
                    onClick={() => toggleGoal(customLabel)}
                    className="text-left rounded-xl border border-[#C98585] bg-[#E7BDB8]/35 text-[#493633] px-3 py-2 text-xs font-medium truncate cursor-pointer"
                  >
                    {customLabel}
                  </button>
                ))}
              </div>
              <div className="mt-2.5 flex gap-2">
                <input
                  type="text"
                  value={customGoalInput}
                  onChange={(e) => setCustomGoalInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomGoal();
                    }
                  }}
                  placeholder={t.onboarding.customGoalPlaceholder}
                  className="flex-1 rounded-xl border border-[#EADBD5] bg-[#F7EEE9]/60 px-3 py-2 text-xs text-[#493633]"
                />
                <button
                  type="button"
                  onClick={addCustomGoal}
                  className="rounded-full border border-[#C98585] px-3.5 py-2 text-xs font-medium text-[#493633] hover:bg-[#E7BDB8]/30 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {t.onboarding.addCustomGoalBtn}
                </button>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-[#987D77] mb-1">
                <span>{t.onboarding.step4Title}</span>
                <span className="font-semibold text-[#C98585] tabular-nums">
                  {confidenceLevel}/10
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={confidenceLevel}
                onChange={(e) => setConfidenceLevel(Number(e.target.value))}
                className="w-full accent-[#C98585]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#987D77] mb-1">
                  {t.onboarding.step5Title}
                </label>
                <select
                  value={intensity}
                  onChange={(e) =>
                    setIntensity(
                      e.target.value as 'gentle' | 'balanced' | 'ambitious'
                    )
                  }
                  className="w-full rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/60 px-3 py-2.5 text-sm"
                >
                  {t.onboarding.intensities.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#987D77] mb-1">
                  {t.onboarding.step6Title}
                </label>
                <select
                  value={availableTime}
                  onChange={(e) => setAvailableTime(e.target.value)}
                  className="w-full rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/60 px-3 py-2.5 text-sm"
                >
                  {['5', '10', '15', '30', 'flexible'].map((v) => (
                    <option key={v} value={v}>
                      {v === 'flexible'
                        ? t.onboarding.flexible
                        : `${v} ${t.onboarding.minutes}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-[#EADBD5] space-y-2.5">
              <p className="text-xs font-medium text-[#987D77]">
                {t.profile.notifTitle}
              </p>
              {(
                Object.keys(t.profile.notifs) as Array<
                  'dailyReminder' | 'weeklySummary' | 'milestoneAlerts' | 'encouragingMessages'
                >
              ).map((key) => (
                <label
                  key={key}
                  className="flex items-center justify-between text-sm text-[#493633] cursor-pointer"
                >
                  <span>{t.profile.notifs[key]}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(notifs[key])}
                    onChange={(e) =>
                      setNotifs((prev) => ({ ...prev, [key]: e.target.checked }))
                    }
                    className="accent-[#C98585] w-4 h-4"
                  />
                </label>
              ))}
            </div>

            <button
              type="submit"
              className="rounded-full bg-[#C98585] hover:bg-[#b87474] px-6 py-2.5 min-h-[44px] text-sm font-medium text-[#FFFAF7] cursor-pointer"
            >
              {t.profile.savePrefs}
            </button>
          </form>

          {/* Phone Push & Calendar Reminders */}
          <ReminderSettingsCard
            lang={lang}
            initialTime={notifs.reminderTime || '20:00'}
          />

          {/* PWA Card */}
          <div className="rounded-3xl bg-[#FFFAF7] border border-[#EADBD5] p-6 space-y-3">
            <h3 className="font-serif-editorial text-lg font-semibold text-[#493633]">
              {t.profile.pwaTitle}
            </h3>
            <p className="text-xs text-[#987D77] leading-relaxed">
              {t.profile.pwaDesc}
            </p>
            <PWAInstallButton lang={lang} variant="full" />
          </div>

          {/* Account Deletion */}
          <div className="rounded-3xl bg-[#FFFAF7] border border-[#EADBD5] p-6 space-y-3">
            <h3 className="font-serif-editorial text-lg font-semibold text-[#493633]">
              {t.profile.dangerZone}
            </h3>
            <p className="text-xs text-[#987D77] leading-relaxed">
              {t.profile.deleteDesc}
            </p>
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-2 rounded-full border border-[#C98585] px-4 py-2 text-xs font-medium text-[#C98585] hover:bg-[#E7BDB8]/25 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t.profile.deleteBtn}</span>
              </button>
            ) : (
              <div className="space-y-3 pt-2">
                <p className="text-xs font-medium text-[#493633]">
                  {t.profile.deleteConfirm}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    className="rounded-full bg-[#493633] px-4 py-2 text-xs font-medium text-[#FFFAF7] cursor-pointer"
                  >
                    {t.profile.deleteBtn}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-full border border-[#EADBD5] px-4 py-2 text-xs text-[#987D77] cursor-pointer"
                  >
                    {t.home.cancel}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

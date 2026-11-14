import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CalendarCheck2,
  Check,
  CheckCircle2,
  Compass,
  Flame,
  MessageCircleHeart,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Users,
} from 'lucide-react';
import { DIFFICULTY_LABELS, FEAR_CATEGORIES, getT } from '../i18n/translations';
import { apiRequest } from '../lib/api';
import type {
  ChallengeTemplate,
  FocusTask,
  Language,
  ScreenId,
  UserChallenge,
  UserProfile,
  UserProgress,
} from '../types/brave';

interface HomeScreenProps {
  lang: Language;
  user: UserProfile;
  progress: UserProgress;
  onProgressUpdated: (p: UserProgress) => void;
  onNavigate: (screen: ScreenId) => void;
}

function getLocalDateStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  lang,
  user,
  progress,
  onProgressUpdated,
  onNavigate,
}) => {
  const t = getT(lang);
  const [dailyUC, setDailyUC] = useState<UserChallenge | null>(null);
  const [template, setTemplate] = useState<ChallengeTemplate | null>(null);
  const [upcoming, setUpcoming] = useState<ChallengeTemplate[]>([]);
  const [todayTasks, setTodayTasks] = useState<FocusTask[]>([]);
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [showProposeForm, setShowProposeForm] = useState(false);
  const [proposeTitle, setProposeTitle] = useState('');
  const [proposeDesc, setProposeDesc] = useState('');
  const [reflection, setReflection] = useState('');
  const [rating, setRating] = useState(3);

  const todayStr = getLocalDateStr();

  const loadDaily = async () => {
    setLoading(true);
    try {
      const [dailyData, ladderData, tasksData] = await Promise.all([
        apiRequest<{ userChallenge: UserChallenge; template: ChallengeTemplate | null }>(
          '/api/challenges/daily'
        ),
        apiRequest<{ challenges: ChallengeTemplate[] }>('/api/challenges/ladder'),
        apiRequest<{ tasks: FocusTask[] }>('/api/tasks'),
      ]);
      setDailyUC(dailyData.userChallenge);
      setTemplate(dailyData.template);
      const nextList = ladderData.challenges
        .filter((c) => c.id !== dailyData.template?.id)
        .slice(0, 3);
      setUpcoming(nextList);
      setTodayTasks(
        tasksData.tasks.filter(
          (item) => item.scheduledDate === todayStr || item.status !== 'done'
        )
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDaily();
  }, []);

  const updateChallengeStatus = async (
    status: 'in_progress' | 'paused' | 'completed' | 'skipped',
    extra?: { reflection?: string; difficultyRating?: number }
  ) => {
    if (!dailyUC) return;
    setActionBusy(true);
    try {
      const res = await apiRequest<{
        userChallenge: UserChallenge;
        progress: UserProgress | null;
      }>(`/api/challenges/user/${dailyUC.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status, ...extra }),
      });
      setDailyUC(res.userChallenge);
      if (res.progress) onProgressUpdated(res.progress);
      setShowCompleteForm(false);
      setReflection('');
    } finally {
      setActionBusy(false);
    }
  };

  const handleReplace = async () => {
    if (!dailyUC) return;
    setActionBusy(true);
    try {
      const res = await apiRequest<{
        userChallenge: UserChallenge;
        template: ChallengeTemplate | null;
      }>('/api/challenges/daily/replace', {
        method: 'POST',
        body: JSON.stringify({ currentUserChallengeId: dailyUC.id }),
      });
      setDailyUC(res.userChallenge);
      setTemplate(res.template);
    } finally {
      setActionBusy(false);
    }
  };

  const handleProposeToday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposeTitle.trim()) return;
    setActionBusy(true);
    try {
      const res = await apiRequest<{
        userChallenge: UserChallenge;
        template: ChallengeTemplate | null;
      }>('/api/challenges/assign', {
        method: 'POST',
        body: JSON.stringify({
          customTitle: proposeTitle.trim(),
          customDescription: proposeDesc.trim() || proposeTitle.trim(),
          customCategory: 'procrastination',
          customDifficulty: 'easy',
          setAsToday: true,
          saveAsTemplate: true,
          isPublic: false,
        }),
      });
      setDailyUC(res.userChallenge);
      setTemplate(res.template);
      setProposeTitle('');
      setProposeDesc('');
      setShowProposeForm(false);
    } finally {
      setActionBusy(false);
    }
  };

  const handleQuickAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;
    const res = await apiRequest<{ task: FocusTask }>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({
        title: quickTaskTitle.trim(),
        scheduledDate: todayStr,
        priority: 'must_do',
        durationMinutes: 25,
      }),
    });
    setTodayTasks((prev) => [res.task, ...prev]);
    setQuickTaskTitle('');
  };

  const toggleQuickTask = async (task: FocusTask) => {
    const nextStatus = task.status === 'done' ? 'todo' : 'done';
    const res = await apiRequest<{ task: FocusTask; progress: UserProgress | null }>(
      `/api/tasks/${task.id}`,
      {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus }),
      }
    );
    setTodayTasks((prev) =>
      prev.map((item) => (item.id === task.id ? res.task : item))
    );
    if (res.progress) onProgressUpdated(res.progress);
  };

  const todayFormatted = new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const quoteIndex = new Date().getDate() % t.home.dailyQuotes.length;
  const dailyTitle = template
    ? lang === 'vi'
      ? template.titleVi
      : template.titleEn
    : dailyUC?.customTitle || '';
  const dailyDesc = template
    ? lang === 'vi'
      ? template.descriptionVi
      : template.descriptionEn
    : dailyUC?.customDescription || '';
  const dailySteps = template
    ? lang === 'vi'
      ? template.stepsVi
      : template.stepsEn
    : [];
  const categoryObj = FEAR_CATEGORIES.find(
    (c) => c.id === (template?.category || dailyUC?.customCategory)
  );
  const categoryLabel = categoryObj
    ? lang === 'vi'
      ? categoryObj.vi
      : categoryObj.en
    : template?.category || '';
  const difficultyKey = template?.difficulty || dailyUC?.customDifficulty || 'tiny';
  const difficultyLabel = DIFFICULTY_LABELS[difficultyKey]
    ? lang === 'vi'
      ? DIFFICULTY_LABELS[difficultyKey].vi
      : DIFFICULTY_LABELS[difficultyKey].en
    : difficultyKey;

  const visibleTodayTasks = todayTasks.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Personalized Greeting & Date + Core Metrics */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#EADBD5]">
        <div>
          <p className="text-xs text-[#987D77] capitalize">{todayFormatted}</p>
          <h1 className="font-serif-editorial text-3xl sm:text-4xl font-semibold text-[#493633] mt-1">
            {t.home.greeting} {user.fullName || user.username}
          </h1>
        </div>

        <div className="grid grid-cols-3 gap-4 sm:gap-8">
          <div>
            <p className="text-xs text-[#987D77]">{t.home.points}</p>
            <p className="font-serif-editorial text-2xl sm:text-3xl font-semibold text-[#C98585] tabular-nums">
              {progress.totalPoints}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#987D77]">{t.home.streak}</p>
            <p className="font-serif-editorial text-2xl sm:text-3xl font-semibold text-[#493633] tabular-nums">
              {progress.currentStreak}{' '}
              <span className="text-sm font-sans font-normal text-[#987D77]">
                {t.home.days}
              </span>
            </p>
          </div>
          <div>
            <p className="text-xs text-[#987D77]">{t.home.completed}</p>
            <p className="font-serif-editorial text-2xl sm:text-3xl font-semibold text-[#493633] tabular-nums">
              {progress.completedChallenges}
            </p>
          </div>
        </div>
      </section>

      {/* Main Grid: Today's Little Courage + Daily Message & Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8 rounded-3xl bg-[#FFFAF7] border border-[#EADBD5] p-6 sm:p-8 flex flex-col justify-between">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-4 w-36 bg-[#EADBD5] rounded" />
              <div className="h-8 w-2/3 bg-[#EADBD5] rounded" />
              <div className="h-20 w-full bg-[#F7EEE9] rounded-2xl" />
            </div>
          ) : dailyUC ? (
            <>
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <p className="text-xs font-medium text-[#C98585]">{t.home.dailyTitle}</p>
                  <div className="text-xs text-[#987D77] flex flex-wrap items-center gap-2 tabular-nums">
                    <span>{categoryLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span>{difficultyLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {template?.estimatedMinutes || 10} {t.onboarding.minutes}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#C98585] font-semibold">
                      +{template?.rewardPoints || 15} pts
                    </span>
                    {template?.handbookRef && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{template.handbookRef}</span>
                      </>
                    )}
                  </div>
                </div>

                <h2 className="font-serif-editorial text-2xl sm:text-3xl font-semibold text-[#493633] [text-wrap:balance]">
                  {dailyTitle}
                </h2>
                <p className="mt-3 text-sm sm:text-base text-[#493633]/85 leading-relaxed">
                  {dailyDesc}
                </p>

                {dailySteps.length > 0 && (
                  <ol className="mt-5 space-y-2 border-t border-[#EADBD5] pt-4">
                    {dailySteps.map((st, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-3 text-sm text-[#493633]/85"
                      >
                        <span className="text-xs font-semibold text-[#C98585] tabular-nums mt-0.5">
                          0{idx + 1}
                        </span>
                        <span>{st}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              {/* Inline User Proposal Form for Today */}
              {showProposeForm && (
                <form
                  onSubmit={handleProposeToday}
                  className="mt-5 rounded-2xl bg-[#F7EEE9] border border-[#EADBD5] p-4 space-y-3"
                >
                  <p className="text-xs font-medium text-[#493633]">
                    {lang === 'vi'
                      ? 'Bạn hiểu rõ hôm nay mình cần làm gì nhất — tự đặt thử thách cho hôm nay:'
                      : 'Design your own realistic challenge for today:'}
                  </p>
                  <input
                    type="text"
                    required
                    value={proposeTitle}
                    onChange={(e) => setProposeTitle(e.target.value)}
                    placeholder={t.challenges.customNamePh}
                    className="w-full rounded-xl border border-[#EADBD5] bg-[#FFFAF7] px-3.5 py-2.5 text-sm text-[#493633]"
                  />
                  <input
                    type="text"
                    value={proposeDesc}
                    onChange={(e) => setProposeDesc(e.target.value)}
                    placeholder={t.challenges.customDescPh}
                    className="w-full rounded-xl border border-[#EADBD5] bg-[#FFFAF7] px-3.5 py-2.5 text-sm text-[#493633]"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="submit"
                      disabled={actionBusy}
                      className="rounded-full bg-[#C98585] hover:bg-[#b87474] px-4 py-2 text-xs font-medium text-[#FFFAF7] cursor-pointer"
                    >
                      {t.challenges.createTodayBtn}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowProposeForm(false)}
                      className="rounded-full border border-[#EADBD5] bg-[#FFFAF7] px-4 py-2 text-xs text-[#987D77] cursor-pointer"
                    >
                      {t.home.cancel}
                    </button>
                  </div>
                </form>
              )}

              {/* Challenge Actions */}
              <div className="mt-6 pt-5 border-t border-[#EADBD5]">
                {dailyUC.status === 'completed' ? (
                  <div className="rounded-2xl bg-[#F7EEE9] border border-[#EADBD5] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 text-sm font-medium text-[#493633]">
                      <CheckCircle2 className="w-5 h-5 text-[#C98585] shrink-0" />
                      <span>{t.home.doneToday}</span>
                    </div>
                    <button
                      type="button"
                      disabled={actionBusy}
                      onClick={handleReplace}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[#C98585] hover:underline cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{lang === 'vi' ? 'Nhận thêm thử thách' : 'Take another challenge'}</span>
                    </button>
                  </div>
                ) : showCompleteForm ? (
                  <div className="space-y-4 rounded-2xl bg-[#F7EEE9] p-4 border border-[#EADBD5]">
                    <textarea
                      rows={2}
                      value={reflection}
                      onChange={(e) => setReflection(e.target.value)}
                      placeholder={t.home.reflectionPlaceholder}
                      className="w-full rounded-xl border border-[#EADBD5] bg-[#FFFAF7] p-3 text-sm text-[#493633] focus:outline-none focus:border-[#C98585]"
                    />
                    <div>
                      <p className="text-xs text-[#987D77] mb-2">{t.home.rateDifficulty}</p>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setRating(num)}
                            className={`w-9 h-9 rounded-full text-xs font-semibold border transition-colors cursor-pointer tabular-nums ${
                              rating === num
                                ? 'bg-[#C98585] border-[#C98585] text-[#FFFAF7]'
                                : 'bg-[#FFFAF7] border-[#EADBD5] text-[#493633]'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        disabled={actionBusy}
                        onClick={() =>
                          updateChallengeStatus('completed', {
                            reflection,
                            difficultyRating: rating,
                          })
                        }
                        className="rounded-full bg-[#C98585] px-5 py-2.5 text-sm font-medium text-[#FFFAF7] hover:bg-[#b87474] cursor-pointer"
                      >
                        {t.home.confirmComplete}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCompleteForm(false)}
                        className="rounded-full border border-[#EADBD5] bg-[#FFFAF7] px-4 py-2.5 text-sm text-[#987D77] cursor-pointer"
                      >
                        {t.home.cancel}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2.5">
                    {dailyUC.status !== 'in_progress' ? (
                      <button
                        type="button"
                        disabled={actionBusy}
                        onClick={() => updateChallengeStatus('in_progress')}
                        className="inline-flex items-center gap-2 rounded-full bg-[#C98585] hover:bg-[#b87474] px-6 py-2.5 min-h-[44px] text-sm font-medium text-[#FFFAF7] transition-colors cursor-pointer"
                      >
                        <Play className="w-4 h-4" />
                        <span>{t.home.startBtn}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={actionBusy}
                        onClick={() => updateChallengeStatus('paused')}
                        className="inline-flex items-center gap-2 rounded-full border border-[#EADBD5] bg-[#F7EEE9] px-5 py-2.5 min-h-[44px] text-sm font-medium text-[#493633] cursor-pointer"
                      >
                        <Pause className="w-4 h-4" />
                        <span>{t.home.pauseBtn}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={actionBusy}
                      onClick={() => setShowCompleteForm(true)}
                      className="inline-flex items-center gap-2 rounded-full border border-[#C98585] bg-[#FFFAF7] hover:bg-[#E7BDB8]/30 px-5 py-2.5 min-h-[44px] text-sm font-medium text-[#493633] transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#C98585]" />
                      <span>{t.home.completeBtn}</span>
                    </button>

                    <button
                      type="button"
                      disabled={actionBusy}
                      onClick={handleReplace}
                      className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] text-xs font-medium text-[#987D77] hover:text-[#493633] cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{t.home.replaceBtn}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowProposeForm((v) => !v)}
                      className="inline-flex items-center gap-1 px-3 py-2 min-h-[44px] text-xs font-medium text-[#C98585] hover:underline cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t.home.proposeTodayBtn}</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Right Column: Editorial Note + Quick Access */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="rounded-3xl bg-[#E7BDB8]/35 border border-[#EADBD5] p-6 flex-1 flex flex-col justify-between">
            <div>
              <p className="text-xs font-medium text-[#987D77]">{t.home.dailyQuoteLabel}</p>
              <p className="font-serif-editorial italic text-lg text-[#493633] mt-3 leading-relaxed">
                “{t.home.dailyQuotes[quoteIndex]}”
              </p>
            </div>
            <p className="text-xs text-[#987D77] mt-4">BRAVE Editorial</p>
          </div>

          <div className="rounded-3xl bg-[#FFFAF7] border border-[#EADBD5] p-6">
            <p className="text-xs font-medium text-[#987D77] mb-3">{t.home.quickAccess}</p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => onNavigate('planner')}
                className="flex items-center gap-2 rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/60 hover:bg-[#E7BDB8]/30 p-3 min-h-[44px] text-xs font-medium text-[#493633] cursor-pointer"
              >
                <CalendarCheck2 className="w-4 h-4 text-[#C98585] shrink-0" />
                <span className="truncate">{t.nav.planner}</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('coach')}
                className="flex items-center gap-2 rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/60 hover:bg-[#E7BDB8]/30 p-3 min-h-[44px] text-xs font-medium text-[#493633] cursor-pointer"
              >
                <MessageCircleHeart className="w-4 h-4 text-[#C98585] shrink-0" />
                <span className="truncate">{t.nav.coach}</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('diary')}
                className="flex items-center gap-2 rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/60 hover:bg-[#E7BDB8]/30 p-3 min-h-[44px] text-xs font-medium text-[#493633] cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-[#C98585] shrink-0" />
                <span className="truncate">{t.nav.diary}</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('fears')}
                className="flex items-center gap-2 rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/60 hover:bg-[#E7BDB8]/30 p-3 min-h-[44px] text-xs font-medium text-[#493633] cursor-pointer"
              >
                <Compass className="w-4 h-4 text-[#C98585] shrink-0" />
                <span className="truncate">{t.nav.fears}</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('community')}
                className="col-span-2 flex items-center justify-center gap-2 rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/60 hover:bg-[#E7BDB8]/30 p-3 min-h-[44px] text-xs font-medium text-[#493633] cursor-pointer"
              >
                <Users className="w-4 h-4 text-[#C98585] shrink-0" />
                <span className="truncate">{t.nav.community}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Real-Life To-Do & Anti-Procrastination Strip */}
      <section className="rounded-3xl bg-[#FFFAF7] border border-[#EADBD5] p-6 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-serif-editorial text-xl sm:text-2xl font-semibold text-[#493633]">
              {t.home.todayTasksTitle}
            </h2>
            <p className="text-xs text-[#987D77] mt-0.5">
              {lang === 'vi'
                ? 'Hoàn thành nhiệm vụ thực tế quan trọng song song với thử thách can đảm (+10–15 pts).'
                : 'Keep real deadlines moving alongside courage steps (+10–15 pts).'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('planner')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#C98585] hover:underline self-start sm:self-auto cursor-pointer"
          >
            <span>{t.home.openPlannerBtn}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <form onSubmit={handleQuickAddTask} className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            value={quickTaskTitle}
            onChange={(e) => setQuickTaskTitle(e.target.value)}
            placeholder={t.home.quickAddTaskPh}
            className="flex-1 rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/60 px-4 py-2.5 text-sm text-[#493633]"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#C98585] hover:bg-[#b87474] px-5 py-2.5 min-h-[42px] text-xs font-medium text-[#FFFAF7] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.home.addTaskBtn}</span>
          </button>
        </form>

        {visibleTodayTasks.length === 0 ? (
          <p className="text-xs sm:text-sm text-[#987D77]">{t.home.todayTasksEmpty}</p>
        ) : (
          <div className="divide-y divide-[#EADBD5]">
            {visibleTodayTasks.map((task) => {
              const isDone = task.status === 'done';
              return (
                <div
                  key={task.id}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <button
                    type="button"
                    onClick={() => toggleQuickTask(task)}
                    className="flex items-center gap-3 text-left flex-1 min-w-0 cursor-pointer"
                  >
                    <span
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                        isDone
                          ? 'bg-[#C98585] border-[#C98585] text-[#FFFAF7]'
                          : 'border-[#C98585] bg-[#FFFAF7]'
                      }`}
                    >
                      {isDone && <Check className="w-3 h-3" />}
                    </span>
                    <span
                      className={`text-sm truncate ${
                        isDone ? 'line-through text-[#987D77]' : 'text-[#493633]'
                      }`}
                    >
                      {task.title}
                    </span>
                  </button>
                  <span className="text-xs text-[#987D77] tabular-nums shrink-0">
                    {task.scheduledTime ? `${task.scheduledTime} · ` : ''}
                    {task.durationMinutes} {t.onboarding.minutes}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Upcoming Challenges */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif-editorial text-xl sm:text-2xl font-semibold text-[#493633]">
            {t.home.upcomingTitle}
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('challenges')}
            className="text-xs font-medium text-[#C98585] hover:underline cursor-pointer"
          >
            {lang === 'vi' ? 'Xem Cẩm nang & Tự đề xuất' : 'Explore Handbook & Ladder'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {upcoming.map((ch) => (
            <button
              key={ch.id}
              type="button"
              onClick={() => onNavigate('challenges')}
              className="text-left rounded-3xl bg-[#FFFAF7] border border-[#EADBD5] hover:border-[#C98585] p-5 transition-colors flex flex-col justify-between gap-3 cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-[#987D77] tabular-nums mb-2">
                  <span>
                    {lang === 'vi' ? `Cấp ${ch.level}` : `Level ${ch.level}`}
                  </span>
                  <span className="text-[#C98585] font-medium">+{ch.rewardPoints} pts</span>
                </div>
                <h3 className="font-serif-editorial text-lg font-semibold text-[#493633]">
                  {lang === 'vi' ? ch.titleVi : ch.titleEn}
                </h3>
                <p className="text-xs text-[#987D77] mt-1.5 line-clamp-2 leading-relaxed">
                  {lang === 'vi' ? ch.descriptionVi : ch.descriptionEn}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-[#C98585]">
                <Flame className="w-3.5 h-3.5" />
                <span>{ch.estimatedMinutes} {t.onboarding.minutes}</span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

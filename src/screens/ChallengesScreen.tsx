import React, { useEffect, useState } from 'react';
import {
  BookOpenText,
  CheckCircle2,
  Pause,
  Play,
  Plus,
  SkipForward,
  Sparkles,
} from 'lucide-react';
import { HANDBOOK_CHAPTERS, type HandbookChallengeExample } from '../data/handbook';
import {
  DIFFICULTY_LABELS,
  FEAR_CATEGORIES,
  LEVEL_NAMES,
  getT,
} from '../i18n/translations';
import { apiRequest } from '../lib/api';
import type {
  ChallengeTemplate,
  Language,
  UserChallenge,
  UserProgress,
} from '../types/brave';

interface ChallengesScreenProps {
  lang: Language;
  onProgressUpdated: (p: UserProgress) => void;
  initialTab?: 'ladder' | 'handbook' | 'active' | 'custom';
}

export const ChallengesScreen: React.FC<ChallengesScreenProps> = ({
  lang,
  onProgressUpdated,
  initialTab = 'ladder',
}) => {
  const t = getT(lang);
  const [tab, setTab] = useState<'ladder' | 'handbook' | 'active' | 'custom'>(
    initialTab
  );
  const [templates, setTemplates] = useState<ChallengeTemplate[]>([]);
  const [userChallenges, setUserChallenges] = useState<UserChallenge[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customCategory, setCustomCategory] = useState('procrastination');
  const [customDifficulty, setCustomDifficulty] = useState('easy');
  const [customMinutes, setCustomMinutes] = useState(10);
  const [shareToLadder, setShareToLadder] = useState(false);
  const [handbookRef, setHandbookRef] = useState<string | null>(null);

  const [completingId, setCompletingId] = useState<number | null>(null);
  const [reflection, setReflection] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => setToastMsg(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<{
        challenges: ChallengeTemplate[];
        userChallenges: UserChallenge[];
      }>('/api/challenges/ladder');
      setTemplates(data.challenges);
      setUserChallenges(data.userChallenges);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const assignTemplate = async (challengeId: number, setAsToday = false) => {
    const res = await apiRequest<{ userChallenge: UserChallenge }>(
      '/api/challenges/assign',
      {
        method: 'POST',
        body: JSON.stringify({ challengeId, setAsToday }),
      }
    );
    setUserChallenges((prev) => [res.userChallenge, ...prev]);
    if (setAsToday) {
      showToast(
        lang === 'vi'
          ? 'Đã đặt làm thử thách hôm nay trên Trang chủ!'
          : "Set as today's challenge on Home!"
      );
    } else {
      setTab('active');
    }
  };

  const assignHandbookExample = async (
    ex: HandbookChallengeExample,
    chapterTitle: string,
    setAsToday = false
  ) => {
    const res = await apiRequest<{
      userChallenge: UserChallenge;
      template: ChallengeTemplate | null;
    }>('/api/challenges/assign', {
      method: 'POST',
      body: JSON.stringify({
        customTitle: lang === 'vi' ? ex.titleVi : ex.titleEn,
        customDescription: lang === 'vi' ? ex.descriptionVi : ex.descriptionEn,
        customCategory: ex.category,
        customDifficulty: ex.difficulty,
        estimatedMinutes: ex.estimatedMinutes,
        setAsToday,
        saveAsTemplate: true,
        isPublic: false,
        sourceType: 'handbook',
        handbookRef: chapterTitle,
      }),
    });
    if (res.template) {
      setTemplates((prev) => [...prev, res.template!]);
    }
    setUserChallenges((prev) => [res.userChallenge, ...prev]);
    if (setAsToday) {
      showToast(
        lang === 'vi'
          ? 'Đã đặt ví dụ từ Cẩm nang làm thử thách hôm nay!'
          : "Set handbook pick as today's challenge!"
      );
    } else {
      setTab('active');
    }
  };

  const prefillCustomFromHandbook = (
    ex: HandbookChallengeExample,
    sourceLabel: string
  ) => {
    setCustomTitle(lang === 'vi' ? ex.titleVi : ex.titleEn);
    setCustomDescription(lang === 'vi' ? ex.descriptionVi : ex.descriptionEn);
    setCustomCategory(ex.category);
    setCustomDifficulty(ex.difficulty);
    setCustomMinutes(ex.estimatedMinutes);
    setHandbookRef(sourceLabel);
    setTab('custom');
  };

  const submitProposedChallenge = async (setAsToday: boolean) => {
    if (!customTitle.trim()) return;
    const res = await apiRequest<{
      userChallenge: UserChallenge;
      template: ChallengeTemplate | null;
    }>('/api/challenges/assign', {
      method: 'POST',
      body: JSON.stringify({
        customTitle: customTitle.trim(),
        customDescription: customDescription.trim(),
        customCategory,
        customDifficulty,
        estimatedMinutes: customMinutes,
        setAsToday,
        saveAsTemplate: true,
        isPublic: shareToLadder,
        sourceType: handbookRef ? 'handbook' : 'user',
        handbookRef: handbookRef || undefined,
      }),
    });
    if (res.template) {
      setTemplates((prev) => [...prev, res.template!]);
    }
    setUserChallenges((prev) => [res.userChallenge, ...prev]);
    setCustomTitle('');
    setCustomDescription('');
    setHandbookRef(null);
    if (setAsToday) {
      showToast(
        lang === 'vi'
          ? 'Đã đặt thử thách của bạn làm nhiệm vụ can đảm hôm nay!'
          : "Set your proposed challenge as today's challenge!"
      );
    } else {
      setTab('active');
    }
  };

  const updateStatus = async (
    id: number,
    status: 'in_progress' | 'paused' | 'completed' | 'skipped',
    note?: string
  ) => {
    const res = await apiRequest<{
      userChallenge: UserChallenge;
      progress: UserProgress | null;
    }>(`/api/challenges/user/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status, reflection: note }),
    });
    setUserChallenges((prev) =>
      prev.map((uc) => (uc.id === id ? res.userChallenge : uc))
    );
    if (res.progress) onProgressUpdated(res.progress);
    setCompletingId(null);
    setReflection('');
  };

  const quickProposalContexts =
    lang === 'vi'
      ? [
          {
            label: 'Học tập / Deadline',
            title: 'Mở file bài tập khó nhất và hoàn thành trọn phần mở đầu 15 phút',
            cat: 'procrastination',
          },
          {
            label: 'Đi một mình',
            title: 'Tự đi ăn hoặc ngồi quán cà phê quen 20 phút không cầm điện thoại',
            cat: 'alone',
          },
          {
            label: 'Đặt ranh giới',
            title: 'Nhắn từ chối lịch sự 1 việc ngoài kế hoạch để giữ giờ nghỉ ngơi',
            cat: 'opinions',
          },
          {
            label: 'Chia sẻ thật',
            title: 'Đăng 1 story/bài viết chia sẻ điều mình đang học mà không sửa quá 2 lần',
            cat: 'failure',
          },
        ]
      : [
          {
            label: 'Deadline opener',
            title: 'Open my hardest assignment and draft the opening section for 15 min',
            cat: 'procrastination',
          },
          {
            label: 'Solo outing',
            title: 'Grab lunch or coffee solo for 20 minutes without scrolling my phone',
            cat: 'alone',
          },
          {
            label: 'Boundary',
            title: 'Politely turn down 1 extra request today to protect my energy',
            cat: 'opinions',
          },
          {
            label: 'Share work',
            title: 'Post 1 honest update on what I am learning without over-editing',
            cat: 'failure',
          },
        ];

  const templateMap = new Map(templates.map((tpl) => [tpl.id, tpl]));
  const levelItems = templates.filter((c) => c.level === selectedLevel);

  return (
    <div className="space-y-8">
      <div className="pb-6 border-b border-[#EADBD5]">
        <h1 className="font-serif-editorial text-3xl font-semibold text-[#493633]">
          {t.challenges.title}
        </h1>
        <p className="text-sm text-[#987D77] mt-1 max-w-2xl">
          {t.challenges.subtitle}
        </p>

        <div className="mt-5 inline-flex flex-wrap items-center gap-1 p-1 rounded-full bg-[#FFFAF7] border border-[#EADBD5]">
          {(['ladder', 'handbook', 'active', 'custom'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                tab === item
                  ? 'bg-[#C98585] text-[#FFFAF7]'
                  : 'text-[#987D77] hover:text-[#493633]'
              }`}
            >
              {item === 'ladder'
                ? t.challenges.tabLadder
                : item === 'handbook'
                  ? t.challenges.tabHandbook
                  : item === 'active'
                    ? `${t.challenges.tabActive} (${userChallenges.length})`
                    : t.challenges.tabCustom}
            </button>
          ))}
        </div>
      </div>

      {toastMsg && (
        <div className="rounded-2xl bg-[#FFFAF7] border border-[#C98585] px-4 py-3 text-xs font-medium text-[#493633]">
          {toastMsg}
        </div>
      )}

      {tab === 'ladder' && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setSelectedLevel(lvl)}
                className={`rounded-2xl border px-4 py-2.5 text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                  selectedLevel === lvl
                    ? 'border-[#C98585] bg-[#E7BDB8]/40 text-[#493633]'
                    : 'border-[#EADBD5] bg-[#FFFAF7] text-[#987D77] hover:text-[#493633]'
                }`}
              >
                {lang === 'vi' ? LEVEL_NAMES[lvl].vi : LEVEL_NAMES[lvl].en}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="h-32 rounded-3xl bg-[#FFFAF7] border border-[#EADBD5] animate-pulse" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {levelItems.map((ch) => {
                const completedTimes = userChallenges.filter(
                  (uc) => uc.challengeId === ch.id && uc.status === 'completed'
                ).length;
                const diff = DIFFICULTY_LABELS[ch.difficulty];
                return (
                  <div
                    key={ch.id}
                    className="rounded-3xl bg-[#FFFAF7] border border-[#EADBD5] p-6 flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#987D77] tabular-nums mb-2">
                        <span>
                          {diff ? (lang === 'vi' ? diff.vi : diff.en) : ch.difficulty} ·{' '}
                          {ch.estimatedMinutes} {t.onboarding.minutes}
                          {ch.handbookRef ? ` · ${ch.handbookRef}` : ''}
                          {ch.sourceType === 'user'
                            ? lang === 'vi'
                              ? ' · Người dùng đề xuất'
                              : ' · Member proposed'
                            : ''}
                        </span>
                        <span className="font-semibold text-[#C98585]">
                          +{ch.rewardPoints} pts
                        </span>
                      </div>
                      <h3 className="font-serif-editorial text-xl font-semibold text-[#493633]">
                        {lang === 'vi' ? ch.titleVi : ch.titleEn}
                      </h3>
                      <p className="text-sm text-[#493633]/85 mt-2 leading-relaxed">
                        {lang === 'vi' ? ch.descriptionVi : ch.descriptionEn}
                      </p>
                      {(lang === 'vi' ? ch.stepsVi : ch.stepsEn).length > 0 && (
                        <ul className="mt-4 space-y-1.5 text-xs text-[#987D77]">
                          {(lang === 'vi' ? ch.stepsVi : ch.stepsEn).map((s, i) => (
                            <li key={i}>
                              0{i + 1}. {s}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="pt-4 border-t border-[#EADBD5] flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-[#987D77] tabular-nums">
                        {completedTimes > 0
                          ? lang === 'vi'
                            ? `Đã làm ${completedTimes} lần`
                            : `Done ${completedTimes}×`
                          : lang === 'vi'
                            ? 'Thực tế & vừa sức'
                            : 'Grounded & doable'}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => assignTemplate(ch.id, true)}
                          className="rounded-full border border-[#EADBD5] hover:border-[#C98585] px-3.5 py-2 min-h-[38px] text-xs font-medium text-[#493633] cursor-pointer"
                        >
                          {t.challenges.setAsToday}
                        </button>
                        <button
                          type="button"
                          onClick={() => assignTemplate(ch.id, false)}
                          className="rounded-full bg-[#C98585] hover:bg-[#b87474] px-4 py-2 min-h-[38px] text-xs font-medium text-[#FFFAF7] cursor-pointer"
                        >
                          {t.challenges.startThis}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'handbook' && (
        <div className="space-y-6">
          <div className="rounded-3xl bg-[#E7BDB8]/30 border border-[#EADBD5] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-[#C98585]">
                {lang === 'vi'
                  ? 'Chưa biết tự đề xuất thử thách gì?'
                  : 'Unsure what challenge to propose?'}
              </p>
              <p className="text-sm text-[#493633]/90 leading-relaxed max-w-2xl">
                {lang === 'vi'
                  ? 'Dưới đây là các nguyên lý thực tế trích từ những cuốn sách/cẩm nang tâm lý hành vi uy tín kèm ví dụ đời thường. Bạn có thể chọn làm ngay hoặc sửa lại cho khớp hoàn cảnh của mình.'
                  : 'Browse grounded principles from proven behavioral handbooks along with everyday examples. Adopt one directly or customize it to fit your day.'}
              </p>
            </div>
            <BookOpenText className="w-6 h-6 text-[#C98585] shrink-0 hidden sm:block" />
          </div>

          <div className="space-y-6">
            {HANDBOOK_CHAPTERS.map((chapter) => (
              <section
                key={chapter.id}
                className="rounded-3xl bg-[#FFFAF7] border border-[#EADBD5] p-6 sm:p-8 space-y-5"
              >
                <div className="space-y-1.5 pb-4 border-b border-[#EADBD5]">
                  <p className="text-xs text-[#987D77] tabular-nums">
                    {lang === 'vi' ? 'Chương' : 'Chapter'} {chapter.chapterNum} ·{' '}
                    {lang === 'vi' ? chapter.sourceBookVi : chapter.sourceBookEn}
                  </p>
                  <h2 className="font-serif-editorial text-2xl font-semibold text-[#493633]">
                    {lang === 'vi' ? chapter.titleVi : chapter.titleEn}
                  </h2>
                  <p className="text-sm text-[#493633]/85 leading-relaxed max-w-3xl">
                    {lang === 'vi' ? chapter.insightVi : chapter.insightEn}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {chapter.examples.map((ex) => (
                    <div
                      key={ex.id}
                      className="rounded-2xl bg-[#F7EEE9]/65 border border-[#EADBD5] p-5 flex flex-col justify-between gap-4"
                    >
                      <div>
                        <p className="text-xs text-[#987D77] tabular-nums mb-1">
                          {DIFFICULTY_LABELS[ex.difficulty]?.[lang] || ex.difficulty} ·{' '}
                          {ex.estimatedMinutes} {t.onboarding.minutes}
                        </p>
                        <h3 className="font-serif-editorial text-lg font-semibold text-[#493633]">
                          {lang === 'vi' ? ex.titleVi : ex.titleEn}
                        </h3>
                        <p className="text-xs sm:text-sm text-[#493633]/85 mt-1.5 leading-relaxed">
                          {lang === 'vi' ? ex.descriptionVi : ex.descriptionEn}
                        </p>
                        <ul className="mt-3 space-y-1 text-xs text-[#987D77]">
                          {(lang === 'vi' ? ex.stepsVi : ex.stepsEn).map((st, idx) => (
                            <li key={idx}>
                              0{idx + 1}. {st}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-3 border-t border-[#EADBD5] flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            assignHandbookExample(
                              ex,
                              lang === 'vi'
                                ? chapter.sourceBookVi
                                : chapter.sourceBookEn,
                              false
                            )
                          }
                          className="rounded-full bg-[#C98585] hover:bg-[#b87474] px-4 py-2 text-xs font-medium text-[#FFFAF7] cursor-pointer"
                        >
                          {t.challenges.useHandbookExample}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            prefillCustomFromHandbook(
                              ex,
                              lang === 'vi'
                                ? chapter.sourceBookVi
                                : chapter.sourceBookEn
                            )
                          }
                          className="rounded-full border border-[#EADBD5] bg-[#FFFAF7] hover:border-[#C98585] px-4 py-2 text-xs font-medium text-[#493633] cursor-pointer"
                        >
                          {t.challenges.customizeHandbookExample}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}

      {tab === 'active' && (
        <div className="space-y-4">
          {userChallenges.length === 0 ? (
            <div className="rounded-3xl bg-[#FFFAF7] border border-[#EADBD5] p-8 text-center">
              <p className="text-sm text-[#987D77]">
                {lang === 'vi'
                  ? 'Bạn chưa bắt đầu thử thách nào. Hãy chọn một thử thách thực tế, trích từ Cẩm nang hoặc tự đề xuất nhé.'
                  : 'No challenges started yet. Pick one from the Ladder, Handbook, or propose your own.'}
              </p>
            </div>
          ) : (
            userChallenges.map((uc) => {
              const tpl = uc.challengeId ? templateMap.get(uc.challengeId) : null;
              const title = tpl
                ? lang === 'vi'
                  ? tpl.titleVi
                  : tpl.titleEn
                : uc.customTitle || '';
              const desc = tpl
                ? lang === 'vi'
                  ? tpl.descriptionVi
                  : tpl.descriptionEn
                : uc.customDescription || '';

              return (
                <div
                  key={uc.id}
                  className="rounded-3xl bg-[#FFFAF7] border border-[#EADBD5] p-6 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#987D77]">
                    <span>
                      {t.challenges.statusLabels[uc.status]}
                      {uc.assignedDate ? ` · ${uc.assignedDate}` : ''}
                    </span>
                    {uc.pointsEarned > 0 && (
                      <span className="font-semibold text-[#C98585] tabular-nums">
                        +{uc.pointsEarned} pts
                      </span>
                    )}
                  </div>
                  <h3 className="font-serif-editorial text-xl font-semibold text-[#493633]">
                    {title}
                  </h3>
                  {desc && (
                    <p className="text-sm text-[#493633]/85 leading-relaxed">{desc}</p>
                  )}
                  {uc.reflection && (
                    <p className="text-xs italic text-[#987D77] pt-2 border-t border-[#EADBD5]">
                      “{uc.reflection}”
                    </p>
                  )}

                  {uc.status !== 'completed' && uc.status !== 'skipped' && (
                    <div className="pt-3 border-t border-[#EADBD5]">
                      {completingId === uc.id ? (
                        <div className="space-y-3">
                          <textarea
                            rows={2}
                            value={reflection}
                            onChange={(e) => setReflection(e.target.value)}
                            placeholder={t.home.reflectionPlaceholder}
                            className="w-full rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/60 p-3 text-sm"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                updateStatus(uc.id, 'completed', reflection)
                              }
                              className="rounded-full bg-[#C98585] px-4 py-2 text-xs font-medium text-[#FFFAF7] cursor-pointer"
                            >
                              {t.home.confirmComplete}
                            </button>
                            <button
                              type="button"
                              onClick={() => setCompletingId(null)}
                              className="rounded-full border border-[#EADBD5] px-4 py-2 text-xs text-[#987D77] cursor-pointer"
                            >
                              {t.home.cancel}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => setCompletingId(uc.id)}
                            className="inline-flex items-center gap-1.5 rounded-full bg-[#C98585] px-4 py-2 text-xs font-medium text-[#FFFAF7] cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{t.home.completeBtn}</span>
                          </button>
                          {uc.status === 'paused' ? (
                            <button
                              type="button"
                              onClick={() => updateStatus(uc.id, 'in_progress')}
                              className="inline-flex items-center gap-1.5 rounded-full border border-[#EADBD5] px-4 py-2 text-xs text-[#493633] cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5" />
                              <span>{t.home.startBtn}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => updateStatus(uc.id, 'paused')}
                              className="inline-flex items-center gap-1.5 rounded-full border border-[#EADBD5] px-4 py-2 text-xs text-[#987D77] cursor-pointer"
                            >
                              <Pause className="w-3.5 h-3.5" />
                              <span>{t.home.pauseBtn}</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => updateStatus(uc.id, 'skipped')}
                            className="inline-flex items-center gap-1 text-xs text-[#987D77] hover:text-[#493633] px-2 py-2 cursor-pointer"
                          >
                            <SkipForward className="w-3.5 h-3.5" />
                            <span>{lang === 'vi' ? 'Bỏ qua' : 'Skip'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === 'custom' && (
        <div className="max-w-3xl space-y-6">
          <div className="rounded-3xl bg-[#FFFAF7] border border-[#EADBD5] p-6 sm:p-8 space-y-5">
            <div>
              <h2 className="font-serif-editorial text-xl font-semibold text-[#493633]">
                {t.challenges.customTitle}
              </h2>
              <p className="text-xs sm:text-sm text-[#987D77] mt-1">
                {t.challenges.customSubtitle}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#987D77]">
                  {lang === 'vi' ? 'Gợi ý nhanh theo tình huống:' : 'Quick real-life templates:'}
                </span>
                <button
                  type="button"
                  onClick={() => setTab('handbook')}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#C98585] hover:underline cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {lang === 'vi'
                      ? 'Hoặc trích thêm từ Cẩm nang →'
                      : 'Or pick from Handbook →'}
                  </span>
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {quickProposalContexts.map((ctx) => (
                  <button
                    key={ctx.label}
                    type="button"
                    onClick={() => {
                      setCustomTitle(ctx.title);
                      setCustomCategory(ctx.cat);
                    }}
                    className="rounded-full border border-[#EADBD5] bg-[#F7EEE9]/70 hover:border-[#C98585] px-3.5 py-1.5 text-xs text-[#493633] cursor-pointer"
                  >
                    {ctx.label}
                  </button>
                ))}
              </div>
            </div>

            {handbookRef && (
              <div className="text-xs text-[#987D77]">
                {lang === 'vi' ? 'Nguồn trích:' : 'Adapted from:'} {handbookRef}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#987D77] mb-1.5">
                {t.challenges.customName}
              </label>
              <input
                type="text"
                required
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder={t.challenges.customNamePh}
                className="w-full rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/60 px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#987D77] mb-1.5">
                {t.challenges.customDesc}
              </label>
              <textarea
                rows={3}
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                placeholder={t.challenges.customDescPh}
                className="w-full rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/60 p-4 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#987D77] mb-1.5">
                  {t.challenges.customCat}
                </label>
                <select
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="w-full rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/60 px-3 py-3 text-sm"
                >
                  {FEAR_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {lang === 'vi' ? c.vi : c.en}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#987D77] mb-1.5">
                  {t.challenges.customDiff}
                </label>
                <select
                  value={customDifficulty}
                  onChange={(e) => setCustomDifficulty(e.target.value)}
                  className="w-full rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/60 px-3 py-3 text-sm"
                >
                  {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {lang === 'vi' ? v.vi : v.en}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#987D77] mb-1.5">
                  {t.challenges.customMinutes}
                </label>
                <input
                  type="number"
                  min={2}
                  max={120}
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(Number(e.target.value) || 10)}
                  className="w-full rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/60 px-3 py-3 text-sm tabular-nums"
                />
              </div>
            </div>

            <label className="flex items-center gap-2.5 text-xs sm:text-sm text-[#493633] cursor-pointer">
              <input
                type="checkbox"
                checked={shareToLadder}
                onChange={(e) => setShareToLadder(e.target.checked)}
                className="accent-[#C98585] w-4 h-4"
              />
              <span>{t.challenges.sharePublicLabel}</span>
            </label>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => submitProposedChallenge(false)}
                className="inline-flex items-center gap-2 rounded-full bg-[#C98585] hover:bg-[#b87474] px-6 py-3 min-h-[44px] text-sm font-medium text-[#FFFAF7] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{t.challenges.createBtn}</span>
              </button>
              <button
                type="button"
                onClick={() => submitProposedChallenge(true)}
                className="inline-flex items-center gap-2 rounded-full border border-[#C98585] bg-[#FFFAF7] hover:bg-[#E7BDB8]/30 px-5 py-3 min-h-[44px] text-sm font-medium text-[#493633] cursor-pointer"
              >
                <span>{t.challenges.createTodayBtn}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

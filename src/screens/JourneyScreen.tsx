import React, { useEffect, useState } from 'react';
import { Award, CheckCircle2, Mail, Trash2 } from 'lucide-react';
import { BADGE_CATALOG, FEAR_CATEGORIES, getT } from '../i18n/translations';
import { apiRequest } from '../lib/api';
import type {
  ChallengeTemplate,
  FutureLetter,
  Language,
  UserChallenge,
  UserProgress,
} from '../types/brave';

interface JourneyScreenProps {
  lang: Language;
  progress: UserProgress;
}

export const JourneyScreen: React.FC<JourneyScreenProps> = ({ lang, progress }) => {
  const t = getT(lang);
  const [tab, setTab] = useState<'overview' | 'letters'>('overview');
  const [userChallenges, setUserChallenges] = useState<UserChallenge[]>([]);
  const [templates, setTemplates] = useState<ChallengeTemplate[]>([]);
  const [letters, setLetters] = useState<FutureLetter[]>([]);

  const [letterTitle, setLetterTitle] = useState('');
  const [letterDate, setLetterDate] = useState('');
  const [letterGoals, setLetterGoals] = useState('');
  const [letterBody, setLetterBody] = useState('');
  const [savingLetter, setSavingLetter] = useState(false);
  const [letterImgFailed, setLetterImgFailed] = useState(false);

  useEffect(() => {
    Promise.all([
      apiRequest<{ challenges: ChallengeTemplate[]; userChallenges: UserChallenge[] }>(
        '/api/challenges/ladder'
      ),
      apiRequest<{ letters: FutureLetter[] }>('/api/letters'),
    ]).then(([chData, letData]) => {
      setTemplates(chData.challenges);
      setUserChallenges(chData.userChallenges);
      setLetters(letData.letters);
    });
  }, []);

  const handleSealLetter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!letterTitle.trim() || !letterBody.trim() || !letterDate) return;
    setSavingLetter(true);
    try {
      const goalsArr = letterGoals
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await apiRequest<{ letter: FutureLetter }>('/api/letters', {
        method: 'POST',
        body: JSON.stringify({
          title: letterTitle,
          content: letterBody,
          futureGoals: goalsArr,
          deliveryDate: letterDate,
        }),
      });
      setLetters((prev) => [res.letter, ...prev]);
      setLetterTitle('');
      setLetterDate('');
      setLetterGoals('');
      setLetterBody('');
    } finally {
      setSavingLetter(false);
    }
  };

  const toggleGoalAchieved = async (letter: FutureLetter) => {
    const res = await apiRequest<{ letter: FutureLetter }>(`/api/letters/${letter.id}`, {
      method: 'PUT',
      body: JSON.stringify({ goalAchieved: !letter.goalAchieved }),
    });
    setLetters((prev) => prev.map((l) => (l.id === letter.id ? res.letter : l)));
  };

  const deleteLetter = async (id: number) => {
    await apiRequest(`/api/letters/${id}`, { method: 'DELETE' });
    setLetters((prev) => prev.filter((l) => l.id !== id));
  };

  // Compute completed challenge category distribution
  const tplMap = new Map(templates.map((x) => [x.id, x]));
  const completedRows = userChallenges.filter((uc) => uc.status === 'completed');
  const categoryCounts = new Map<string, number>();
  completedRows.forEach((uc) => {
    const cat =
      (uc.challengeId ? tplMap.get(uc.challengeId)?.category : uc.customCategory) ||
      'social';
    categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
  });

  const maxCatCount = Math.max(1, ...Array.from(categoryCounts.values()));
  const confidencePoints = progress.confidenceHistory || [];

  return (
    <div className="space-y-8">
      <div className="pb-6 border-b border-[#EADBD5]">
        <h1 className="font-serif-editorial text-3xl font-semibold text-[#493633]">
          {t.journey.title}
        </h1>
        <p className="text-sm text-[#987D77] mt-1 max-w-2xl">{t.journey.subtitle}</p>

        <div className="mt-5 inline-flex items-center gap-1 p-1 rounded-full bg-[#FFFAF7] border border-[#EADBD5]">
          <button
            type="button"
            onClick={() => setTab('overview')}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
              tab === 'overview'
                ? 'bg-[#C98585] text-[#FFFAF7]'
                : 'text-[#987D77] hover:text-[#493633]'
            }`}
          >
            {t.journey.tabOverview}
          </button>
          <button
            type="button"
            onClick={() => setTab('letters')}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
              tab === 'letters'
                ? 'bg-[#C98585] text-[#FFFAF7]'
                : 'text-[#987D77] hover:text-[#493633]'
            }`}
          >
            {t.journey.tabLetters} ({letters.length})
          </button>
        </div>
      </div>

      {tab === 'overview' ? (
        <div className="space-y-8">
          {/* 4 Summary Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-3xl bg-[#FFFAF7] border border-[#EADBD5] p-5">
              <p className="text-xs text-[#987D77]">{t.home.points}</p>
              <p className="font-serif-editorial text-3xl font-semibold text-[#C98585] mt-1 tabular-nums">
                {progress.totalPoints}
              </p>
            </div>
            <div className="rounded-3xl bg-[#FFFAF7] border border-[#EADBD5] p-5">
              <p className="text-xs text-[#987D77]">{t.home.completed}</p>
              <p className="font-serif-editorial text-3xl font-semibold text-[#493633] mt-1 tabular-nums">
                {progress.completedChallenges}
              </p>
            </div>
            <div className="rounded-3xl bg-[#FFFAF7] border border-[#EADBD5] p-5">
              <p className="text-xs text-[#987D77]">{t.home.streak}</p>
              <p className="font-serif-editorial text-3xl font-semibold text-[#493633] mt-1 tabular-nums">
                {progress.currentStreak}
              </p>
            </div>
            <div className="rounded-3xl bg-[#FFFAF7] border border-[#EADBD5] p-5">
              <p className="text-xs text-[#987D77]">
                {lang === 'vi' ? 'Chuỗi dài nhất' : 'Longest streak'}
              </p>
              <p className="font-serif-editorial text-3xl font-semibold text-[#493633] mt-1 tabular-nums">
                {progress.longestStreak}
              </p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-3xl bg-[#FFFAF7] border border-[#EADBD5] p-6">
              <h2 className="font-serif-editorial text-lg font-semibold text-[#493633] mb-4">
                {t.journey.weeklyChart}
              </h2>
              {categoryCounts.size === 0 ? (
                <p className="text-sm text-[#987D77] py-6">
                  {lang === 'vi'
                    ? 'Hoàn thành thử thách đầu tiên để xem biểu đồ tiến bộ theo từng kỹ năng.'
                    : 'Complete your first challenge to unlock your category progress chart.'}
                </p>
              ) : (
                <div className="space-y-3">
                  {Array.from(categoryCounts.entries()).map(([cat, count]) => {
                    const obj = FEAR_CATEGORIES.find((c) => c.id === cat);
                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-[#493633] font-medium">
                            {obj ? (lang === 'vi' ? obj.vi : obj.en) : cat}
                          </span>
                          <span className="text-[#987D77] tabular-nums">{count}</span>
                        </div>
                        <div className="h-2 rounded-full bg-[#F7EEE9] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#C98585]"
                            style={{ width: `${(count / maxCatCount) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-3xl bg-[#FFFAF7] border border-[#EADBD5] p-6">
              <h2 className="font-serif-editorial text-lg font-semibold text-[#493633] mb-4">
                {t.journey.confidenceChart}
              </h2>
              {confidencePoints.length === 0 ? (
                <p className="text-sm text-[#987D77] py-6">
                  {lang === 'vi'
                    ? 'Cập nhật mức độ tự tin trong Hồ sơ để theo dõi đường cong thay đổi.'
                    : 'Update your confidence rating in Profile to visualize your growth curve.'}
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-end gap-3 h-32 pt-4">
                    {confidencePoints.slice(-10).map((pt, idx) => (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end"
                      >
                        <span className="text-[11px] font-semibold text-[#C98585] tabular-nums">
                          {pt.score}
                        </span>
                        <div
                          className="w-full max-w-[32px] rounded-t-xl bg-[#E7BDB8] border border-[#C98585]/30"
                          style={{ height: `${pt.score * 10}%` }}
                        />
                        <span className="text-[10px] text-[#987D77] tabular-nums">
                          {pt.date.slice(5)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Achievement Badges */}
          <section className="space-y-4">
            <h2 className="font-serif-editorial text-2xl font-semibold text-[#493633]">
              {t.journey.badgesTitle}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {BADGE_CATALOG.map((b) => {
                const unlocked = (progress.unlockedBadges || []).includes(b.id);
                return (
                  <div
                    key={b.id}
                    className={`rounded-3xl border p-5 flex items-start gap-4 ${
                      unlocked
                        ? 'bg-[#FFFAF7] border-[#C98585]'
                        : 'bg-[#F7EEE9]/60 border-[#EADBD5] opacity-70'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        unlocked
                          ? 'bg-[#C98585] text-[#FFFAF7]'
                          : 'bg-[#EADBD5] text-[#987D77]'
                      }`}
                    >
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[11px] text-[#987D77]">
                        {unlocked ? t.journey.unlocked : t.journey.locked}
                      </p>
                      <h3 className="font-serif-editorial text-base font-semibold text-[#493633]">
                        {lang === 'vi' ? b.titleVi : b.titleEn}
                      </h3>
                      <p className="text-xs text-[#987D77] mt-1">
                        {lang === 'vi' ? b.descVi : b.descEn}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      ) : (
        /* Future Self — Letter to Myself */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <form
            onSubmit={handleSealLetter}
            className="lg:col-span-6 rounded-3xl bg-[#FFFAF7] border border-[#EADBD5] p-6 sm:p-8 space-y-5"
          >
            <div className="rounded-2xl overflow-hidden border border-[#EADBD5] aspect-[16/9] bg-[#E7BDB8]/30">
              {!letterImgFailed ? (
                <img
                  src="/src/assets/images/future_letter_envelope_1794589220202.jpg"
                  alt="Wax-sealed cotton envelope on blush linen"
                  referrerPolicy="no-referrer"
                  onError={() => setLetterImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-[#987D77]">
                  Future Self Letter
                </div>
              )}
            </div>

            <p className="text-sm text-[#987D77] leading-relaxed">
              {t.journey.lettersIntro}
            </p>

            <div>
              <label className="block text-xs font-medium text-[#987D77] mb-1.5">
                {t.journey.letterTitle}
              </label>
              <input
                type="text"
                required
                value={letterTitle}
                onChange={(e) => setLetterTitle(e.target.value)}
                className="w-full rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/60 px-4 py-3 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#987D77] mb-1.5">
                  {t.journey.letterDate}
                </label>
                <input
                  type="date"
                  required
                  value={letterDate}
                  onChange={(e) => setLetterDate(e.target.value)}
                  className="w-full rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/60 px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#987D77] mb-1.5">
                  {t.journey.letterGoals}
                </label>
                <input
                  type="text"
                  value={letterGoals}
                  onChange={(e) => setLetterGoals(e.target.value)}
                  className="w-full rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/60 px-4 py-3 text-sm"
                />
              </div>
            </div>

            <div>
              <textarea
                rows={5}
                required
                value={letterBody}
                onChange={(e) => setLetterBody(e.target.value)}
                placeholder={t.journey.letterBody}
                className="w-full rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/60 p-4 text-sm leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={savingLetter}
              className="w-full rounded-full bg-[#C98585] hover:bg-[#b87474] py-3 text-sm font-medium text-[#FFFAF7] cursor-pointer"
            >
              {t.journey.sealBtn}
            </button>
          </form>

          <div className="lg:col-span-6 space-y-4">
            {letters.map((l) => (
              <div
                key={l.id}
                className="rounded-3xl bg-[#FFFAF7] border border-[#EADBD5] p-6 space-y-3"
              >
                <div className="flex items-center justify-between text-xs text-[#987D77]">
                  <span className="inline-flex items-center gap-1.5 text-[#C98585] font-medium">
                    <Mail className="w-3.5 h-3.5" />
                    {l.isDelivered
                      ? `${t.journey.delivered} · ${l.deliveryDate}`
                      : `${t.journey.sealedUntil} ${l.deliveryDate}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteLetter(l.id)}
                    className="text-[#987D77] hover:text-[#493633] cursor-pointer"
                    aria-label="Delete letter"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h3 className="font-serif-editorial text-xl font-semibold text-[#493633]">
                  {l.title}
                </h3>
                <p className="text-sm text-[#493633]/85 whitespace-pre-line leading-relaxed">
                  {l.content}
                </p>

                {l.futureGoals.length > 0 && (
                  <p className="text-xs text-[#987D77]">
                    {l.futureGoals.join(' · ')}
                  </p>
                )}

                <div className="pt-3 border-t border-[#EADBD5]">
                  <button
                    type="button"
                    onClick={() => toggleGoalAchieved(l)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#C98585] hover:underline cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {l.goalAchieved
                        ? t.journey.goalAchievedBtn
                        : t.journey.markAchievedBtn}
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

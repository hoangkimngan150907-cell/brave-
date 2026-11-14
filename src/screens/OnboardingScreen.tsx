import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { FEAR_CATEGORIES, GOALS_LIST, getT } from '../i18n/translations';
import { apiRequest } from '../lib/api';
import type { Language, UserPreferences, UserProfile, UserProgress } from '../types/brave';

interface OnboardingScreenProps {
  lang: Language;
  onChangeLang: (lang: Language) => void;
  user: UserProfile;
  onComplete: (payload: {
    user: UserProfile;
    preferences: UserPreferences;
    progress: UserProgress;
  }) => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  lang,
  onChangeLang,
  user,
  onComplete,
}) => {
  const t = getT(lang);
  const [step, setStep] = useState(1);
  const [goals, setGoals] = useState<string[]>([]);
  const [customGoalInput, setCustomGoalInput] = useState('');
  const [fears, setFears] = useState<string[]>([]);
  const [confidenceLevel, setConfidenceLevel] = useState(5);
  const [intensity, setIntensity] = useState<'gentle' | 'balanced' | 'ambitious'>('gentle');
  const [availableTime, setAvailableTime] = useState('10');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  const toggleFear = (id: string) => {
    setFears((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const handleFinish = async () => {
    setSaving(true);
    setErrorMsg(null);
    try {
      const data = await apiRequest<{
        user: UserProfile;
        preferences: UserPreferences;
        progress: UserProgress;
      }>('/api/me/preferences', {
        method: 'PUT',
        body: JSON.stringify({
          personalGoals: goals,
          fearCategories: fears,
          confidenceLevel,
          challengeIntensity: intensity,
          availableTime,
          completeOnboarding: true,
        }),
      });
      onComplete(data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save roadmap');
    } finally {
      setSaving(false);
    }
  };

  const progressPct = Math.round((step / 7) * 100);
  const customGoalsSelected = goals.filter(
    (id) => !GOALS_LIST.some((g) => g.id === id)
  );

  return (
    <div className="min-h-screen bg-[#F7EEE9] text-[#493633] flex flex-col">
      <header className="border-b border-[#EADBD5] bg-[#F7EEE9]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <span className="font-serif-editorial text-2xl font-semibold">BRAVE</span>
          <div className="inline-flex items-center rounded-full border border-[#EADBD5] bg-[#FFFAF7] p-0.5">
            <button
              type="button"
              onClick={() => onChangeLang('vi')}
              className={`px-3 py-1 text-xs font-semibold rounded-full cursor-pointer ${
                lang === 'vi' ? 'bg-[#C98585] text-[#FFFAF7]' : 'text-[#987D77]'
              }`}
            >
              VI
            </button>
            <button
              type="button"
              onClick={() => onChangeLang('en')}
              className={`px-3 py-1 text-xs font-semibold rounded-full cursor-pointer ${
                lang === 'en' ? 'bg-[#C98585] text-[#FFFAF7]' : 'text-[#987D77]'
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col justify-between">
        <div>
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between text-xs text-[#987D77] mb-2 tabular-nums">
              <span>
                {t.onboarding.stepLabel} {step} {t.onboarding.of} 7
              </span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-[#EADBD5] overflow-hidden">
              <div
                className="h-full bg-[#C98585] transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div className="rounded-3xl bg-[#FFFAF7] border border-[#EADBD5] p-6 sm:p-10 shadow-sm">
            {step === 1 && (
              <div className="space-y-5">
                <p className="text-xs text-[#987D77]">
                  {lang === 'vi' ? `Chào ${user.fullName || 'bạn'}` : `Welcome, ${user.fullName || 'friend'}`}
                </p>
                <h1 className="font-serif-editorial text-2xl sm:text-3xl font-semibold leading-snug">
                  {t.onboarding.step1Title}
                </h1>
                <p className="text-sm sm:text-base text-[#987D77] leading-relaxed">
                  {t.onboarding.step1Desc}
                </p>
                <div className="pt-4 rounded-2xl bg-[#F7EEE9] border border-[#EADBD5] p-5">
                  <p className="font-serif-editorial italic text-base text-[#493633]">
                    “{t.coreQuote}”
                  </p>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h1 className="font-serif-editorial text-2xl sm:text-3xl font-semibold">
                    {t.onboarding.step2Title}
                  </h1>
                  <p className="text-sm text-[#987D77] mt-1 tabular-nums">
                    {t.onboarding.step2Desc} ({goals.length}{' '}
                    {lang === 'vi' ? 'đã chọn' : 'selected'})
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {GOALS_LIST.map((g) => {
                    const selected = goals.includes(g.id);
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => toggleGoal(g.id)}
                        className={`text-left rounded-2xl border px-4 py-3.5 min-h-[48px] text-sm font-medium flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                          selected
                            ? 'border-[#C98585] bg-[#E7BDB8]/35 text-[#493633]'
                            : 'border-[#EADBD5] bg-[#FFFAF7] text-[#493633]/85 hover:bg-[#F7EEE9]'
                        }`}
                      >
                        <span>{lang === 'vi' ? g.vi : g.en}</span>
                        {selected && <Check className="w-4 h-4 text-[#C98585] shrink-0" />}
                      </button>
                    );
                  })}
                  {customGoalsSelected.map((customLabel) => (
                    <button
                      key={customLabel}
                      type="button"
                      onClick={() => toggleGoal(customLabel)}
                      className="text-left rounded-2xl border border-[#C98585] bg-[#E7BDB8]/35 text-[#493633] px-4 py-3.5 min-h-[48px] text-sm font-medium flex items-center justify-between gap-2 transition-colors cursor-pointer"
                    >
                      <span className="truncate">{customLabel}</span>
                      <Check className="w-4 h-4 text-[#C98585] shrink-0" />
                    </button>
                  ))}
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
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
                    className="flex-1 rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/50 px-4 py-3 text-sm text-[#493633] focus:outline-none focus:border-[#C98585]"
                  />
                  <button
                    type="button"
                    onClick={addCustomGoal}
                    className="rounded-full border border-[#C98585] bg-[#FFFAF7] hover:bg-[#E7BDB8]/30 px-5 py-2.5 min-h-[44px] text-xs font-medium text-[#493633] whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {t.onboarding.addCustomGoalBtn}
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <h1 className="font-serif-editorial text-2xl sm:text-3xl font-semibold">
                    {t.onboarding.step3Title}
                  </h1>
                  <p className="text-sm text-[#987D77] mt-1">{t.onboarding.step3Desc}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {FEAR_CATEGORIES.map((f) => {
                    const selected = fears.includes(f.id);
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => toggleFear(f.id)}
                        className={`text-left rounded-2xl border px-4 py-3.5 min-h-[48px] text-sm font-medium flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                          selected
                            ? 'border-[#C98585] bg-[#E7BDB8]/35 text-[#493633]'
                            : 'border-[#EADBD5] bg-[#FFFAF7] text-[#493633]/85 hover:bg-[#F7EEE9]'
                        }`}
                      >
                        <span>{lang === 'vi' ? f.vi : f.en}</span>
                        {selected && <Check className="w-4 h-4 text-[#C98585] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h1 className="font-serif-editorial text-2xl sm:text-3xl font-semibold">
                    {t.onboarding.step4Title}
                  </h1>
                  <p className="text-sm text-[#987D77] mt-1">{t.onboarding.step4Desc}</p>
                </div>
                <div className="py-4">
                  <div className="text-center mb-4">
                    <span className="font-serif-editorial text-5xl font-semibold text-[#C98585] tabular-nums">
                      {confidenceLevel}
                    </span>
                    <span className="text-lg text-[#987D77]"> / 10</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={confidenceLevel}
                    onChange={(e) => setConfidenceLevel(Number(e.target.value))}
                    className="w-full accent-[#C98585] cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-[#987D77] mt-2">
                    <span>{lang === 'vi' ? '1 · Rất e ngại' : '1 · Very hesitant'}</span>
                    <span>{lang === 'vi' ? '10 · Rất vững vàng' : '10 · Very confident'}</span>
                  </div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-5">
                <h1 className="font-serif-editorial text-2xl sm:text-3xl font-semibold">
                  {t.onboarding.step5Title}
                </h1>
                <div className="space-y-3">
                  {t.onboarding.intensities.map((opt) => {
                    const active = intensity === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          setIntensity(opt.id as 'gentle' | 'balanced' | 'ambitious')
                        }
                        className={`w-full text-left rounded-2xl border p-4 sm:p-5 transition-colors cursor-pointer ${
                          active
                            ? 'border-[#C98585] bg-[#E7BDB8]/35'
                            : 'border-[#EADBD5] bg-[#FFFAF7] hover:bg-[#F7EEE9]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-base text-[#493633]">
                            {opt.title}
                          </span>
                          {active && <Check className="w-4 h-4 text-[#C98585]" />}
                        </div>
                        <p className="text-sm text-[#987D77] mt-1">{opt.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-5">
                <h1 className="font-serif-editorial text-2xl sm:text-3xl font-semibold">
                  {t.onboarding.step6Title}
                </h1>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {['5', '10', '15', '30', 'flexible'].map((val) => {
                    const active = availableTime === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setAvailableTime(val)}
                        className={`rounded-2xl border py-4 px-4 text-sm font-medium transition-colors cursor-pointer ${
                          active
                            ? 'border-[#C98585] bg-[#E7BDB8]/35 text-[#493633]'
                            : 'border-[#EADBD5] bg-[#FFFAF7] text-[#493633]/85 hover:bg-[#F7EEE9]'
                        }`}
                      >
                        {val === 'flexible'
                          ? t.onboarding.flexible
                          : `${val} ${t.onboarding.minutes}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 7 && (
              <div className="space-y-6">
                <div>
                  <h1 className="font-serif-editorial text-2xl sm:text-3xl font-semibold">
                    {t.onboarding.step7Title}
                  </h1>
                  <p className="text-sm text-[#987D77] mt-1">{t.onboarding.step7Desc}</p>
                </div>

                <div className="space-y-4 divide-y divide-[#EADBD5]">
                  <div className="pt-2">
                    <p className="text-xs text-[#987D77]">{t.onboarding.summaryGoals}</p>
                    <p className="text-sm font-medium text-[#493633] mt-1">
                      {goals.length > 0
                        ? goals
                            .map((id) => {
                              const g = GOALS_LIST.find((x) => x.id === id);
                              return g ? (lang === 'vi' ? g.vi : g.en) : id;
                            })
                            .join(' · ')
                        : lang === 'vi'
                          ? 'Xây dựng sự tự tin mỗi ngày'
                          : 'Build everyday confidence'}
                    </p>
                  </div>

                  <div className="pt-4">
                    <p className="text-xs text-[#987D77]">{t.onboarding.summaryFears}</p>
                    <p className="text-sm font-medium text-[#493633] mt-1">
                      {fears.length > 0
                        ? fears
                            .map((id) => {
                              const f = FEAR_CATEGORIES.find((x) => x.id === id);
                              return f ? (lang === 'vi' ? f.vi : f.en) : id;
                            })
                            .join(' · ')
                        : lang === 'vi'
                          ? 'Mở rộng vùng an toàn nhẹ nhàng'
                          : 'Gentle comfort zone expansion'}
                    </p>
                  </div>

                  <div className="pt-4">
                    <p className="text-xs text-[#987D77]">{t.onboarding.summaryPace}</p>
                    <p className="text-sm font-medium text-[#493633] mt-1 tabular-nums">
                      {t.onboarding.intensities.find((i) => i.id === intensity)?.title} ·{' '}
                      {availableTime === 'flexible'
                        ? t.onboarding.flexible
                        : `${availableTime} ${t.onboarding.minutes}`}
                    </p>
                  </div>
                </div>

                {errorMsg && (
                  <p className="text-xs text-[#C98585]">{errorMsg}</p>
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="mt-8 pt-6 border-t border-[#EADBD5] flex items-center justify-between gap-4">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="inline-flex items-center gap-2 rounded-full border border-[#EADBD5] px-5 py-2.5 min-h-[44px] text-sm font-medium text-[#493633] hover:bg-[#F7EEE9] cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{t.onboarding.back}</span>
                </button>
              ) : (
                <div />
              )}

              {step < 7 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => s + 1)}
                  className="inline-flex items-center gap-2 rounded-full bg-[#C98585] hover:bg-[#b87474] px-6 py-2.5 min-h-[44px] text-sm font-medium text-[#FFFAF7] cursor-pointer"
                >
                  <span>{t.onboarding.next}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleFinish}
                  className="inline-flex items-center gap-2 rounded-full bg-[#C98585] hover:bg-[#b87474] px-6 py-2.5 min-h-[44px] text-sm font-medium text-[#FFFAF7] cursor-pointer disabled:opacity-60"
                >
                  <span>{saving ? t.onboarding.saving : t.onboarding.finish}</span>
                  <Check className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

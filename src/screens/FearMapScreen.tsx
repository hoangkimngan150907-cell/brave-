import React, { useEffect, useState } from 'react';
import { CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { FEAR_CATEGORIES, getT } from '../i18n/translations';
import { apiRequest } from '../lib/api';
import type { FearEntry, Language } from '../types/brave';

export const FearMapScreen: React.FC<{ lang: Language }> = ({ lang }) => {
  const t = getT(lang);
  const [fears, setFears] = useState<FearEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [category, setCategory] = useState('public_speaking');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [triggers, setTriggers] = useState('');
  const [emotionalResponse, setEmotionalResponse] = useState('');
  const [intensity, setIntensity] = useState(6);
  const [saving, setSaving] = useState(false);

  const loadFears = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<{ fears: FearEntry[] }>('/api/fears');
      setFears(data.fears);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFears();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setSaving(true);
    try {
      const res = await apiRequest<{ fear: FearEntry }>('/api/fears', {
        method: 'POST',
        body: JSON.stringify({
          category,
          title,
          description,
          triggers,
          emotionalResponse,
          intensity,
        }),
      });
      setFears((prev) => [res.fear, ...prev]);
      setTitle('');
      setDescription('');
      setTriggers('');
      setEmotionalResponse('');
      setIntensity(6);
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const toggleResolved = async (item: FearEntry) => {
    const res = await apiRequest<{ fear: FearEntry }>(`/api/fears/${item.id}`, {
      method: 'PUT',
      body: JSON.stringify({ isResolved: !item.isResolved }),
    });
    setFears((prev) => prev.map((f) => (f.id === item.id ? res.fear : f)));
  };

  const deleteFear = async (id: number) => {
    await apiRequest(`/api/fears/${id}`, { method: 'DELETE' });
    setFears((prev) => prev.filter((f) => f.id !== id));
  };

  // Compute category intensity distribution for visual chart
  const categoryStats = FEAR_CATEGORIES.map((cat) => {
    const matching = fears.filter((f) => f.category === cat.id && !f.isResolved);
    const avg =
      matching.length > 0
        ? Math.round(
            (matching.reduce((s, x) => s + x.intensity, 0) / matching.length) * 10
          ) / 10
        : 0;
    return { ...cat, count: matching.length, avg };
  }).filter((c) => c.count > 0);

  const topFear = categoryStats.sort((a, b) => b.avg - a.avg)[0];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#EADBD5]">
        <div>
          <h1 className="font-serif-editorial text-3xl font-semibold text-[#493633]">
            {t.fears.title}
          </h1>
          <p className="text-sm text-[#987D77] mt-1 max-w-2xl">{t.fears.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#C98585] hover:bg-[#b87474] px-5 py-2.5 min-h-[44px] text-sm font-medium text-[#FFFAF7] whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t.fears.addBtn}</span>
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-3xl bg-[#FFFAF7] border border-[#EADBD5] p-6 sm:p-8 space-y-5"
        >
          <h2 className="font-serif-editorial text-xl font-semibold text-[#493633]">
            {t.fears.formTitle}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#987D77] mb-1.5">
                {t.fears.category}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/60 px-4 py-3 text-sm text-[#493633]"
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
                {t.fears.nameLabel}
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.fears.namePlaceholder}
                className="w-full rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/60 px-4 py-3 text-sm text-[#493633]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#987D77] mb-1.5">
              {t.fears.descLabel}
            </label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/60 p-4 text-sm text-[#493633]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#987D77] mb-1.5">
                {t.fears.triggersLabel}
              </label>
              <input
                type="text"
                value={triggers}
                onChange={(e) => setTriggers(e.target.value)}
                className="w-full rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/60 px-4 py-3 text-sm text-[#493633]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#987D77] mb-1.5">
                {t.fears.emotionLabel}
              </label>
              <input
                type="text"
                value={emotionalResponse}
                onChange={(e) => setEmotionalResponse(e.target.value)}
                className="w-full rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/60 px-4 py-3 text-sm text-[#493633]"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-[#987D77] mb-2">
              <span>{t.fears.intensityLabel}</span>
              <span className="font-semibold text-[#C98585] tabular-nums">{intensity} / 10</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
              className="w-full accent-[#C98585]"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-[#C98585] px-6 py-2.5 text-sm font-medium text-[#FFFAF7] hover:bg-[#b87474] cursor-pointer"
            >
              {t.fears.saveBtn}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-full border border-[#EADBD5] px-5 py-2.5 text-sm text-[#987D77] cursor-pointer"
            >
              {t.home.cancel}
            </button>
          </div>
        </form>
      )}

      {/* Visual Fear Profile + Gentle Recommendation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 rounded-3xl bg-[#FFFAF7] border border-[#EADBD5] p-6">
          <h2 className="font-serif-editorial text-lg font-semibold text-[#493633] mb-4">
            {t.fears.chartTitle}
          </h2>
          {categoryStats.length === 0 ? (
            <p className="text-sm text-[#987D77] py-6">{t.fears.empty}</p>
          ) : (
            <div className="space-y-3.5">
              {categoryStats.map((stat) => (
                <div key={stat.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#493633]">
                      {lang === 'vi' ? stat.vi : stat.en}
                    </span>
                    <span className="text-[#987D77] tabular-nums">
                      {stat.avg}/10 · {stat.count}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[#F7EEE9] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#C98585]"
                      style={{ width: `${stat.avg * 10}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 rounded-3xl bg-[#E7BDB8]/30 border border-[#EADBD5] p-6 flex flex-col justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-[#987D77]">
              {t.fears.recommendationTitle}
            </p>
            <h3 className="font-serif-editorial text-xl font-semibold text-[#493633] mt-2">
              {topFear
                ? lang === 'vi'
                  ? `Bắt đầu dịu dàng với "${topFear.vi}"`
                  : `Start gently with "${topFear.en}"`
                : lang === 'vi'
                  ? 'Quan sát mà không tự phán xét'
                  : 'Observe without self-judgment'}
            </h3>
            <p className="text-sm text-[#493633]/85 mt-2 leading-relaxed">
              {topFear
                ? lang === 'vi'
                  ? 'Hãy chọn một thử thách cấp độ Nhẹ nhàng (5 phút) trong nhóm này ở mục Thử Thách để làm quen từ từ.'
                  : 'Try one 5-minute Tiny challenge in this area inside Challenges so your nervous system builds safety gradually.'
                : lang === 'vi'
                  ? 'Ghi lại những tình huống khiến bạn chần chừ để nhận gợi ý hành động vừa sức.'
                  : 'Log situations that make you hesitate to receive tailored, low-pressure action ideas.'}
            </p>
          </div>
          <p className="text-xs text-[#987D77] pt-3 border-t border-[#EADBD5]">
            {t.fears.gentleNotice}
          </p>
        </div>
      </div>

      {/* Fear Entries List */}
      <section className="space-y-4">
        {loading ? (
          <div className="h-24 rounded-3xl bg-[#FFFAF7] border border-[#EADBD5] animate-pulse" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fears.map((item) => {
              const cat = FEAR_CATEGORIES.find((c) => c.id === item.category);
              return (
                <div
                  key={item.id}
                  className={`rounded-3xl border p-6 flex flex-col justify-between gap-4 ${
                    item.isResolved
                      ? 'bg-[#F7EEE9]/60 border-[#EADBD5] opacity-80'
                      : 'bg-[#FFFAF7] border-[#EADBD5]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-[#987D77] mb-2">
                      <span>{cat ? (lang === 'vi' ? cat.vi : cat.en) : item.category}</span>
                      <span className="font-semibold text-[#C98585] tabular-nums">
                        {item.intensity}/10
                      </span>
                    </div>
                    <h3 className="font-serif-editorial text-xl font-semibold text-[#493633]">
                      {item.title}
                    </h3>
                    <p className="text-sm text-[#493633]/85 mt-2 leading-relaxed">
                      {item.description}
                    </p>
                    {item.triggers && (
                      <p className="text-xs text-[#987D77] mt-3">
                        {t.fears.triggersLabel}: {item.triggers}
                      </p>
                    )}
                    {item.emotionalResponse && (
                      <p className="text-xs text-[#987D77] mt-1">
                        {t.fears.emotionLabel}: {item.emotionalResponse}
                      </p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-[#EADBD5] flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => toggleResolved(item)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[#C98585] hover:underline cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {item.isResolved ? t.fears.reopen : t.fears.markResolved}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteFear(item.id)}
                      className="inline-flex items-center gap-1 text-xs text-[#987D77] hover:text-[#493633] cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t.fears.deleteBtn}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

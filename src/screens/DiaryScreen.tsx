import React, { useEffect, useState } from 'react';
import { ImagePlus, Lock, Plus, Search, Trash2 } from 'lucide-react';
import { DIARY_PROMPTS, getT } from '../i18n/translations';
import { apiRequest } from '../lib/api';
import type { DiaryEntry, Language } from '../types/brave';

export const DiaryScreen: React.FC<{ lang: Language }> = ({ lang }) => {
  const t = getT(lang);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('hopeful');
  const [promptUsed, setPromptUsed] = useState('');
  const [lessonLearned, setLessonLearned] = useState('');
  const [imageData, setImageData] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    apiRequest<{ entries: DiaryEntry[] }>('/api/diary').then((d) =>
      setEntries(d.entries)
    );
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setImageData(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      const res = await apiRequest<{ entry: DiaryEntry }>('/api/diary', {
        method: 'POST',
        body: JSON.stringify({
          title,
          content,
          mood,
          promptUsed: promptUsed || null,
          lessonLearned: lessonLearned || null,
          imageData,
        }),
      });
      setEntries((prev) => [res.entry, ...prev]);
      setTitle('');
      setContent('');
      setPromptUsed('');
      setLessonLearned('');
      setImageData(null);
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    await apiRequest(`/api/diary/${id}`, { method: 'DELETE' });
    setEntries((prev) => prev.filter((x) => x.id !== id));
  };

  const filtered = entries.filter((e) => {
    const q = search.toLowerCase();
    return (
      e.title.toLowerCase().includes(q) ||
      e.content.toLowerCase().includes(q) ||
      (e.lessonLearned || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#EADBD5]">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs text-[#987D77] mb-1">
            <Lock className="w-3.5 h-3.5 text-[#C98585]" />
            <span>{lang === 'vi' ? 'Riêng tư tuyệt đối' : 'Private by default'}</span>
          </div>
          <h1 className="font-serif-editorial text-3xl font-semibold text-[#493633]">
            {t.diary.title}
          </h1>
          <p className="text-sm text-[#987D77] mt-1 max-w-2xl">{t.diary.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#C98585] hover:bg-[#b87474] px-5 py-2.5 min-h-[44px] text-sm font-medium text-[#FFFAF7] whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t.diary.newBtn}</span>
        </button>
      </div>

      {/* Editorial Header Banner */}
      {!showForm && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-5 rounded-3xl overflow-hidden border border-[#EADBD5] bg-[#E7BDB8]/30 aspect-[4/3]">
            {!imgFailed ? (
              <img
                src="/src/assets/images/diary_journal_desk_1794589219693.jpg"
                alt="Linen journal and pen on sunlit travertine"
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center p-6 text-center font-serif-editorial italic text-[#493633]">
                {t.coreQuote}
              </div>
            )}
          </div>
          <div className="lg:col-span-7 rounded-3xl bg-[#FFFAF7] border border-[#EADBD5] p-6 flex flex-col justify-between">
            <div>
              <p className="text-xs font-medium text-[#987D77] mb-3">
                {t.diary.promptsTitle}
              </p>
              <div className="space-y-2">
                {DIARY_PROMPTS.map((p) => {
                  const text = lang === 'vi' ? p.vi : p.en;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setPromptUsed(text);
                        setShowForm(true);
                      }}
                      className="w-full text-left rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/50 hover:bg-[#E7BDB8]/30 px-4 py-2.5 text-sm text-[#493633] transition-colors cursor-pointer"
                    >
                      {text}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSave}
          className="rounded-3xl bg-[#FFFAF7] border border-[#EADBD5] p-6 sm:p-8 space-y-5"
        >
          {promptUsed && (
            <div className="rounded-2xl bg-[#F7EEE9] border border-[#EADBD5] px-4 py-3 text-xs text-[#987D77]">
              {promptUsed}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#987D77] mb-1.5">
                {t.diary.entryTitle}
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.diary.entryTitlePh}
                className="w-full rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/60 px-4 py-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#987D77] mb-1.5">
                {t.diary.moodLabel}
              </label>
              <select
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                className="w-full rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/60 px-4 py-3 text-sm"
              >
                {Object.entries(t.diary.moods).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#987D77] mb-1.5">
              {t.diary.contentLabel}
            </label>
            <textarea
              rows={5}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/60 p-4 text-sm leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#987D77] mb-1.5">
              {t.diary.lessonLabel}
            </label>
            <input
              type="text"
              value={lessonLearned}
              onChange={(e) => setLessonLearned(e.target.value)}
              className="w-full rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/60 px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="inline-flex items-center gap-2 rounded-full border border-[#EADBD5] bg-[#F7EEE9]/70 px-4 py-2 text-xs font-medium text-[#493633] cursor-pointer">
              <ImagePlus className="w-4 h-4 text-[#C98585]" />
              <span>{t.diary.photoLabel}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
            {imageData && (
              <img
                src={imageData}
                alt="Preview"
                className="mt-3 h-32 w-auto rounded-2xl border border-[#EADBD5] object-cover"
              />
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-[#C98585] px-6 py-2.5 text-sm font-medium text-[#FFFAF7] hover:bg-[#b87474] cursor-pointer"
            >
              {t.diary.saveBtn}
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

      {/* Search & Entries */}
      <div className="space-y-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-[#987D77] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.diary.searchPlaceholder}
            className="w-full rounded-full border border-[#EADBD5] bg-[#FFFAF7] pl-10 pr-4 py-2.5 text-sm"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-3xl bg-[#FFFAF7] border border-[#EADBD5] p-8 text-center">
            <p className="text-sm text-[#987D77]">{t.diary.empty}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filtered.map((entry) => {
              const moodLabel =
                t.diary.moods[entry.mood as keyof typeof t.diary.moods] || entry.mood;
              return (
                <article
                  key={entry.id}
                  className="rounded-3xl bg-[#FFFAF7] border border-[#EADBD5] p-6 flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-[#987D77] mb-2">
                      <span>
                        {moodLabel} · {new Date(entry.createdAt).toLocaleDateString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDelete(entry.id)}
                        aria-label="Delete"
                        className="text-[#987D77] hover:text-[#493633] p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <h3 className="font-serif-editorial text-xl font-semibold text-[#493633]">
                      {entry.title}
                    </h3>
                    <p className="text-sm text-[#493633]/85 mt-2 whitespace-pre-line leading-relaxed">
                      {entry.content}
                    </p>
                    {entry.imageData && (
                      <img
                        src={entry.imageData}
                        alt={entry.title}
                        className="mt-4 rounded-2xl border border-[#EADBD5] max-h-52 w-full object-cover"
                      />
                    )}
                    {entry.lessonLearned && (
                      <p className="mt-4 pt-3 border-t border-[#EADBD5] text-xs text-[#987D77]">
                        {lang === 'vi' ? 'Bài học: ' : 'Lesson: '}
                        {entry.lessonLearned}
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

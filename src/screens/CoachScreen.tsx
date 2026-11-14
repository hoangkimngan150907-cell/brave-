import React, { useEffect, useRef, useState } from 'react';
import { Check, Flame, RotateCcw, Send, ShieldAlert } from 'lucide-react';
import { getT } from '../i18n/translations';
import { apiRequest } from '../lib/api';
import type { CoachMessage, Language, SuggestedChallenge } from '../types/brave';

export const CoachScreen: React.FC<{ lang: Language }> = ({ lang }) => {
  const t = getT(lang);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [acceptedIds, setAcceptedIds] = useState<number[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<{ messages: CoachMessage[] }>('/api/coach/messages');
      setMessages(data.messages);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const sendMessage = async (textToSend?: string) => {
    const content = (textToSend ?? input).trim();
    if (!content || sending) return;

    if (!textToSend) setInput('');
    setSending(true);
    try {
      const res = await apiRequest<{
        userMessage: CoachMessage;
        assistantMessage: CoachMessage;
      }>('/api/coach/chat', {
        method: 'POST',
        body: JSON.stringify({ message: content, language: lang }),
      });
      setMessages((prev) => [...prev, res.userMessage, res.assistantMessage]);
    } finally {
      setSending(false);
    }
  };

  const handleClear = async () => {
    await apiRequest('/api/coach/messages', { method: 'DELETE' });
    setMessages([]);
  };

  const acceptSuggestedChallenge = async (
    msgId: number,
    ch: SuggestedChallenge
  ) => {
    await apiRequest('/api/challenges/assign', {
      method: 'POST',
      body: JSON.stringify({
        customTitle: ch.title,
        customDescription: ch.description,
        customCategory: ch.category,
        customDifficulty: ch.difficulty,
      }),
    });
    setAcceptedIds((prev) => [...prev, msgId]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#EADBD5]">
        <div>
          <h1 className="font-serif-editorial text-3xl font-semibold text-[#493633]">
            {t.coach.title}
          </h1>
          <p className="text-sm text-[#987D77] mt-1 max-w-2xl">{t.coach.subtitle}</p>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-2 rounded-full border border-[#EADBD5] bg-[#FFFAF7] px-4 py-2 text-xs font-medium text-[#987D77] hover:text-[#493633] self-start sm:self-auto cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.coach.clearBtn}</span>
          </button>
        )}
      </div>

      {/* Chat Container */}
      <div className="rounded-3xl bg-[#FFFAF7] border border-[#EADBD5] overflow-hidden flex flex-col min-h-[480px] max-h-[68vh]">
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-5">
          {loading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-16 w-2/3 bg-[#F7EEE9] rounded-2xl" />
            </div>
          ) : messages.length === 0 ? (
            <div className="space-y-6 py-4">
              <div className="rounded-2xl bg-[#F7EEE9] border border-[#EADBD5] p-5 max-w-xl">
                <p className="font-serif-editorial text-lg text-[#493633]">
                  {lang === 'vi'
                    ? 'Chào bạn, mình là Brave Coach.'
                    : 'Hello, I am Brave Coach.'}
                </p>
                <p className="text-sm text-[#493633]/85 mt-2 leading-relaxed">
                  {lang === 'vi'
                    ? 'Hãy kể cho mình nghe một tình huống gần đây khiến bạn hơi lo lắng hoặc chần chừ. Chúng ta sẽ cùng tìm một bước nhỏ vừa sức nhất cho bạn.'
                    : 'Tell me about a situation that feels intimidating or something you have been putting off. Together we will shape one small, manageable next step.'}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-[#987D77] mb-2.5">
                  {t.coach.startersLabel}
                </p>
                <div className="flex flex-col gap-2 max-w-xl">
                  {t.coach.starters.map((starter, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => sendMessage(starter)}
                      className="text-left rounded-2xl border border-[#EADBD5] bg-[#FFFAF7] hover:bg-[#E7BDB8]/25 px-4 py-3 text-sm text-[#493633] transition-colors cursor-pointer"
                    >
                      “{starter}”
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${
                  m.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[88%] sm:max-w-[75%] rounded-3xl px-5 py-3.5 text-sm leading-relaxed whitespace-pre-line ${
                    m.role === 'user'
                      ? 'bg-[#C98585] text-[#FFFAF7]'
                      : 'bg-[#F7EEE9] text-[#493633] border border-[#EADBD5]'
                  }`}
                >
                  {m.content}
                </div>

                {m.role === 'assistant' && m.suggestedChallenge && (
                  <div className="mt-2.5 max-w-[88%] sm:max-w-[75%] rounded-2xl border border-[#EADBD5] bg-[#FFFAF7] p-4 space-y-2.5">
                    <div className="flex items-center justify-between text-xs text-[#987D77] tabular-nums">
                      <span className="inline-flex items-center gap-1.5 text-[#C98585] font-medium">
                        <Flame className="w-3.5 h-3.5" />
                        {lang === 'vi' ? 'Gợi ý hành động nhỏ' : 'Suggested micro-challenge'}
                      </span>
                      <span>
                        {m.suggestedChallenge.estimatedMinutes} {t.onboarding.minutes} · +
                        {m.suggestedChallenge.rewardPoints} pts
                      </span>
                    </div>
                    <p className="font-serif-editorial text-base font-semibold text-[#493633]">
                      {m.suggestedChallenge.title}
                    </p>
                    <p className="text-xs text-[#987D77] leading-relaxed">
                      {m.suggestedChallenge.description}
                    </p>
                    {acceptedIds.includes(m.id) ? (
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#C98585]">
                        <Check className="w-4 h-4" />
                        <span>{t.coach.acceptedToast}</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          acceptSuggestedChallenge(m.id, m.suggestedChallenge!)
                        }
                        className="rounded-full bg-[#C98585] hover:bg-[#b87474] px-4 py-2 text-xs font-medium text-[#FFFAF7] cursor-pointer"
                      >
                        {t.coach.acceptChallenge}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}

          {sending && (
            <div className="text-xs text-[#987D77] italic">{t.coach.thinking}</div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="border-t border-[#EADBD5] bg-[#FFFAF7] p-3 sm:p-4 flex items-center gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.coach.placeholder}
            className="flex-1 rounded-full border border-[#EADBD5] bg-[#F7EEE9]/60 px-5 py-3 text-sm text-[#493633] focus:outline-none focus:border-[#C98585]"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#C98585] hover:bg-[#b87474] px-5 py-3 min-h-[44px] text-sm font-medium text-[#FFFAF7] disabled:opacity-50 cursor-pointer shrink-0"
          >
            <span className="hidden sm:inline">{t.coach.sendBtn}</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      <div className="flex items-start gap-2.5 text-xs text-[#987D77] leading-relaxed">
        <ShieldAlert className="w-4 h-4 text-[#C98585] shrink-0 mt-0.5" />
        <span>{t.coach.disclaimer}</span>
      </div>
    </div>
  );
};

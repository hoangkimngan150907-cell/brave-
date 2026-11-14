import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Calendar,
  CalendarPlus,
  Check,
  Clock,
  Pause,
  Play,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { ReminderSettingsCard } from '../components/ReminderSettingsCard';
import { PROCRASTINATION_TRIGGERS, getT } from '../i18n/translations';
import { apiRequest } from '../lib/api';
import { downloadTaskICS } from '../lib/reminders';
import type { FocusTask, Language, UserProgress } from '../types/brave';

interface PlannerScreenProps {
  lang: Language;
  onProgressUpdated: (p: UserProgress) => void;
}

function getLocalDateStr(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const PlannerScreen: React.FC<PlannerScreenProps> = ({
  lang,
  onProgressUpdated,
}) => {
  const t = getT(lang);
  const todayStr = useMemo(() => getLocalDateStr(0), []);

  const [tasks, setTasks] = useState<FocusTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'pending' | 'done'>('day');

  // Add Task Form
  const [title, setTitle] = useState('');
  const [scheduledDate, setScheduledDate] = useState(todayStr);
  const [scheduledTime, setScheduledTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [priority, setPriority] = useState<'must_do' | 'important' | 'nice_to_have'>('must_do');
  const [trigger, setTrigger] = useState('');
  const [tinyFirstStep, setTinyFirstStep] = useState('');
  const [saving, setSaving] = useState(false);

  // Unstick helper drawer per task & Phone reminder panel
  const [unstickTaskId, setUnstickTaskId] = useState<number | null>(null);
  const [showReminderPanel, setShowReminderPanel] = useState(false);

  // Active Anti-Procrastination Sprint Timer
  const [activeTimerTask, setActiveTimerTask] = useState<FocusTask | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<{ tasks: FocusTask[] }>('/api/tasks');
      setTasks(data.tasks);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    if (!timerRunning) return;
    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [timerRunning]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const dateStr = getLocalDateStr(i);
      const d = new Date(`${dateStr}T12:00:00`);
      const weekday = new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : 'en-US', {
        weekday: 'short',
      }).format(d);
      const dayNum = d.getDate();
      const pendingCount = tasks.filter(
        (item) => item.scheduledDate === dateStr && item.status !== 'done'
      ).length;
      return { dateStr, weekday, dayNum, pendingCount };
    });
  }, [tasks, lang]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await apiRequest<{ task: FocusTask }>('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          scheduledDate,
          scheduledTime: scheduledTime || undefined,
          durationMinutes,
          priority,
          procrastinationTrigger: trigger || undefined,
          tinyFirstStep: tinyFirstStep.trim() || undefined,
        }),
      });
      setTasks((prev) => [...prev, res.task]);
      setSelectedDate(res.task.scheduledDate);
      setViewMode('day');
      setTitle('');
      setScheduledTime('');
      setTrigger('');
      setTinyFirstStep('');
    } finally {
      setSaving(false);
    }
  };

  const toggleTaskStatus = async (task: FocusTask) => {
    const nextStatus = task.status === 'done' ? 'todo' : 'done';
    const res = await apiRequest<{ task: FocusTask; progress: UserProgress | null }>(
      `/api/tasks/${task.id}`,
      {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus }),
      }
    );
    setTasks((prev) => prev.map((item) => (item.id === task.id ? res.task : item)));
    if (res.progress) onProgressUpdated(res.progress);
  };

  const updateTaskTrigger = async (taskId: number, nextTrigger: string) => {
    const res = await apiRequest<{ task: FocusTask }>(`/api/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({ procrastinationTrigger: nextTrigger }),
    });
    setTasks((prev) => prev.map((item) => (item.id === taskId ? res.task : item)));
  };

  const deleteTask = async (taskId: number) => {
    await apiRequest(`/api/tasks/${taskId}`, { method: 'DELETE' });
    setTasks((prev) => prev.filter((item) => item.id !== taskId));
    if (activeTimerTask?.id === taskId) {
      setActiveTimerTask(null);
      setTimerRunning(false);
    }
  };

  const startFocusSprint = (task: FocusTask, minutes: number) => {
    setActiveTimerTask(task);
    setSecondsLeft(minutes * 60);
    setElapsedSeconds(0);
    setTimerRunning(true);
  };

  const saveFocusAndStop = async (markCompleted: boolean) => {
    if (!activeTimerTask) return;
    setTimerRunning(false);
    const res = await apiRequest<{ task: FocusTask; progress: UserProgress | null }>(
      `/api/tasks/${activeTimerTask.id}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          focusSecondsDelta: Math.max(elapsedSeconds, 10),
          status: markCompleted ? 'done' : 'in_progress',
        }),
      }
    );
    setTasks((prev) =>
      prev.map((item) => (item.id === activeTimerTask.id ? res.task : item))
    );
    if (res.progress) onProgressUpdated(res.progress);
    setActiveTimerTask(null);
    setElapsedSeconds(0);
    setSecondsLeft(0);
  };

  const filteredTasks = useMemo(() => {
    const sorted = [...tasks].sort((a, b) => {
      if (a.scheduledDate !== b.scheduledDate) {
        return a.scheduledDate.localeCompare(b.scheduledDate);
      }
      const timeA = a.scheduledTime || '99:99';
      const timeB = b.scheduledTime || '99:99';
      if (timeA !== timeB) return timeA.localeCompare(timeB);
      const pWeight = { must_do: 0, important: 1, nice_to_have: 2 };
      return pWeight[a.priority] - pWeight[b.priority];
    });

    if (viewMode === 'day') {
      return sorted.filter((item) => item.scheduledDate === selectedDate);
    }
    if (viewMode === 'week') {
      const endStr = getLocalDateStr(6);
      return sorted.filter(
        (item) =>
          item.scheduledDate >= todayStr &&
          item.scheduledDate <= endStr &&
          item.status !== 'done'
      );
    }
    if (viewMode === 'pending') {
      return sorted.filter((item) => item.status !== 'done');
    }
    return sorted.filter((item) => item.status === 'done');
  }, [tasks, viewMode, selectedDate, todayStr]);

  const todayDoneCount = tasks.filter(
    (item) => item.scheduledDate === todayStr && item.status === 'done'
  ).length;
  const todayTotalCount = tasks.filter((item) => item.scheduledDate === todayStr).length;

  return (
    <div className="space-y-8">
      {/* Header & Live Sprint Banner */}
      <div className="pb-6 border-b border-[#EADBD5] flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif-editorial text-3xl font-semibold text-[#493633]">
            {t.planner.title}
          </h1>
          <p className="text-sm text-[#987D77] mt-1 max-w-2xl">
            {t.planner.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <button
            type="button"
            onClick={() => setShowReminderPanel((v) => !v)}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 min-h-[42px] text-xs font-medium transition-colors cursor-pointer ${
              showReminderPanel
                ? 'border-[#C98585] bg-[#C98585] text-[#FFFAF7]'
                : 'border-[#EADBD5] bg-[#FFFAF7] text-[#493633] hover:bg-[#E7BDB8]/30'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>
              {lang === 'vi' ? 'Nhắc nhở điện thoại' : 'Phone reminders'}
            </span>
          </button>

          <div className="text-left md:text-right">
            <p className="text-xs text-[#987D77]">
              {lang === 'vi' ? 'Tiến độ hôm nay' : "Today's completion"}
            </p>
            <p className="font-serif-editorial text-2xl font-semibold text-[#C98585] tabular-nums">
              {todayDoneCount} / {todayTotalCount}
            </p>
          </div>
        </div>
      </div>

      {showReminderPanel && (
        <ReminderSettingsCard lang={lang} compact />
      )}

      {/* Live 5-Minute / 25-Minute Anti-Procrastination Timer */}
      <section className="rounded-3xl bg-[#FFFAF7] border border-[#EADBD5] p-6 sm:p-7">
        {activeTimerTask ? (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-[#C98585]">
                {lang === 'vi' ? 'Đang chạy phiên chống trì hoãn' : 'Active focus sprint'}
              </p>
              <h2 className="font-serif-editorial text-2xl font-semibold text-[#493633]">
                {activeTimerTask.title}
              </h2>
              {activeTimerTask.tinyFirstStep && (
                <p className="text-xs text-[#987D77]">
                  {lang === 'vi' ? 'Bước mở màn:' : 'Micro-step:'}{' '}
                  {activeTimerTask.tinyFirstStep}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-3xl font-semibold text-[#493633] tabular-nums min-w-[96px]">
                {formatTimer(secondsLeft)}
              </span>
              <button
                type="button"
                onClick={() => setTimerRunning((r) => !r)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#EADBD5] bg-[#F7EEE9] px-4 py-2.5 min-h-[44px] text-xs font-medium text-[#493633] cursor-pointer"
              >
                {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>
                  {timerRunning
                    ? lang === 'vi'
                      ? 'Tạm dừng'
                      : 'Pause'
                    : lang === 'vi'
                      ? 'Tiếp tục'
                      : 'Resume'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => saveFocusAndStop(false)}
                className="rounded-full border border-[#C98585] px-4 py-2.5 min-h-[44px] text-xs font-medium text-[#493633] hover:bg-[#E7BDB8]/30 cursor-pointer"
              >
                {t.planner.stopTimerBtn}
              </button>
              <button
                type="button"
                onClick={() => saveFocusAndStop(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#C98585] hover:bg-[#b87474] px-5 py-2.5 min-h-[44px] text-xs font-medium text-[#FFFAF7] cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{t.planner.markDone}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-[#C98585]">
                {t.planner.focusBannerTitle}
              </p>
              <p className="text-sm text-[#493633]/85 leading-relaxed max-w-2xl">
                {t.planner.focusBannerDesc}
              </p>
            </div>
            {tasks.find((item) => item.status !== 'done') && (
              <button
                type="button"
                onClick={() => {
                  const nextTask = tasks.find((item) => item.status !== 'done');
                  if (nextTask) startFocusSprint(nextTask, 5);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-[#C98585] hover:bg-[#b87474] px-5 py-2.5 min-h-[44px] text-xs font-medium text-[#FFFAF7] whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>
                  {lang === 'vi' ? 'Bấm chạy 5 phút việc đầu tiên' : 'Start 5-min opener'}
                </span>
              </button>
            )}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Schedule Calendar + Task List */}
        <div className="lg:col-span-7 space-y-6">
          {/* 7-Day Horizontal Date Strip */}
          <div className="rounded-3xl bg-[#FFFAF7] border border-[#EADBD5] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 text-xs font-medium text-[#987D77]">
                <Calendar className="w-4 h-4 text-[#C98585]" />
                <span>
                  {lang === 'vi' ? 'Lịch trình theo ngày' : 'Schedule by date'}
                </span>
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setScheduledDate(e.target.value);
                  setViewMode('day');
                }}
                className="rounded-xl border border-[#EADBD5] bg-[#F7EEE9]/60 px-3 py-1.5 text-xs text-[#493633] tabular-nums"
              />
            </div>

            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {weekDays.map((day) => {
                const active = viewMode === 'day' && selectedDate === day.dateStr;
                return (
                  <button
                    key={day.dateStr}
                    type="button"
                    onClick={() => {
                      setSelectedDate(day.dateStr);
                      setScheduledDate(day.dateStr);
                      setViewMode('day');
                    }}
                    className={`rounded-2xl py-2.5 px-1 flex flex-col items-center justify-center min-h-[60px] border transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#C98585] border-[#C98585] text-[#FFFAF7]'
                        : 'bg-[#F7EEE9]/60 border-[#EADBD5] text-[#493633] hover:bg-[#E7BDB8]/30'
                    }`}
                  >
                    <span
                      className={`text-[10px] uppercase ${
                        active ? 'text-[#FFFAF7]/85' : 'text-[#987D77]'
                      }`}
                    >
                      {day.weekday}
                    </span>
                    <span className="text-sm font-semibold tabular-nums mt-0.5">
                      {day.dayNum}
                    </span>
                    <span
                      className={`text-[10px] tabular-nums mt-0.5 ${
                        active ? 'text-[#FFFAF7]' : 'text-[#C98585]'
                      }`}
                    >
                      {day.pendingCount > 0 ? `${day.pendingCount}` : '·'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* View Filter Tabs */}
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[#EADBD5]">
              {(['day', 'week', 'pending', 'done'] as const).map((tabKey) => (
                <button
                  key={tabKey}
                  type="button"
                  onClick={() => setViewMode(tabKey)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    viewMode === tabKey
                      ? 'bg-[#493633] text-[#FFFAF7]'
                      : 'text-[#987D77] hover:text-[#493633]'
                  }`}
                >
                  {t.planner.tabs[tabKey]}
                </button>
              ))}
            </div>
          </div>

          {/* Task Rows */}
          {loading ? (
            <div className="h-40 rounded-3xl bg-[#FFFAF7] border border-[#EADBD5] animate-pulse" />
          ) : filteredTasks.length === 0 ? (
            <div className="rounded-3xl bg-[#FFFAF7] border border-[#EADBD5] p-8 text-center">
              <p className="text-sm text-[#987D77] leading-relaxed">
                {t.planner.emptyDay}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => {
                const isDone = task.status === 'done';
                const triggerInfo = PROCRASTINATION_TRIGGERS.find(
                  (tr) => tr.id === task.procrastinationTrigger
                );
                const isUnstickOpen = unstickTaskId === task.id;
                const spentMinutes = Math.floor((task.focusSecondsSpent || 0) / 60);

                return (
                  <div
                    key={task.id}
                    className={`rounded-3xl bg-[#FFFAF7] border p-5 transition-colors space-y-3 ${
                      isDone ? 'border-[#EADBD5] opacity-75' : 'border-[#EADBD5]'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <button
                        type="button"
                        onClick={() => toggleTaskStatus(task)}
                        aria-label={isDone ? t.planner.reopenTask : t.planner.markDone}
                        className={`mt-0.5 w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                          isDone
                            ? 'bg-[#C98585] border-[#C98585] text-[#FFFAF7]'
                            : 'border-[#C98585] bg-[#FFFAF7] hover:bg-[#E7BDB8]/35'
                        }`}
                      >
                        {isDone && <Check className="w-3.5 h-3.5" />}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#987D77] tabular-nums">
                          <span>{task.scheduledDate}</span>
                          {task.scheduledTime && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-semibold text-[#493633]">
                                {task.scheduledTime}
                              </span>
                            </>
                          )}
                          <span aria-hidden="true">·</span>
                          <span>
                            {task.durationMinutes} {t.onboarding.minutes}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={
                              task.priority === 'must_do'
                                ? 'text-[#C98585] font-semibold'
                                : ''
                            }
                          >
                            {t.planner.priorities[task.priority]}
                          </span>
                          {spentMinutes > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>
                                {lang === 'vi'
                                  ? `Đã tập trung ${spentMinutes}p`
                                  : `${spentMinutes}m focused`}
                              </span>
                            </>
                          )}
                        </div>

                        <h3
                          className={`text-base font-medium mt-1 ${
                            isDone ? 'line-through text-[#987D77]' : 'text-[#493633]'
                          }`}
                        >
                          {task.title}
                        </h3>

                        {task.tinyFirstStep && (
                          <p className="text-xs text-[#987D77] mt-1">
                            {lang === 'vi' ? 'Bước 2 phút:' : '2-min opener:'}{' '}
                            {task.tinyFirstStep}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => deleteTask(task.id)}
                        className="p-2 text-[#987D77] hover:text-[#493633] cursor-pointer shrink-0"
                        aria-label="Delete task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {!isDone && (
                      <div className="pt-2 border-t border-[#EADBD5] flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => startFocusSprint(task, 5)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#C98585] hover:bg-[#b87474] px-3.5 py-1.5 text-xs font-medium text-[#FFFAF7] cursor-pointer"
                        >
                          <Play className="w-3 h-3" />
                          <span>{t.planner.start5MinBtn}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            startFocusSprint(task, task.durationMinutes || 25)
                          }
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#EADBD5] bg-[#F7EEE9] px-3.5 py-1.5 text-xs font-medium text-[#493633] cursor-pointer"
                        >
                          <Clock className="w-3 h-3 text-[#C98585]" />
                          <span>
                            {lang === 'vi'
                              ? `Tập trung ${task.durationMinutes}p`
                              : `${task.durationMinutes}-min focus`}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadTaskICS(task, lang)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#EADBD5] bg-[#FFFAF7] hover:bg-[#E7BDB8]/25 px-3 py-1.5 text-xs font-medium text-[#493633] cursor-pointer"
                          title={
                            lang === 'vi'
                              ? 'Thêm vào Lịch điện thoại với báo thức trước 15 phút'
                              : 'Add to phone calendar with 15-min alarm'
                          }
                        >
                          <CalendarPlus className="w-3.5 h-3.5 text-[#C98585]" />
                          <span>{lang === 'vi' ? 'Nhắc lịch' : 'Calendar'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setUnstickTaskId(isUnstickOpen ? null : task.id)
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#C98585] hover:underline cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{t.planner.unstickBtn}</span>
                        </button>
                      </div>
                    )}

                    {isUnstickOpen && !isDone && (
                      <div className="rounded-2xl bg-[#F7EEE9] border border-[#EADBD5] p-4 space-y-3">
                        <p className="text-xs font-medium text-[#493633]">
                          {lang === 'vi'
                            ? 'Vì sao bạn đang ngại bắt đầu việc này?'
                            : 'What is making you delay this task?'}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {PROCRASTINATION_TRIGGERS.map((tr) => {
                            const selected = task.procrastinationTrigger === tr.id;
                            return (
                              <button
                                key={tr.id}
                                type="button"
                                onClick={() => updateTaskTrigger(task.id, tr.id)}
                                className={`rounded-full border px-3 py-1.5 text-xs transition-colors cursor-pointer ${
                                  selected
                                    ? 'bg-[#C98585] border-[#C98585] text-[#FFFAF7]'
                                    : 'bg-[#FFFAF7] border-[#EADBD5] text-[#493633]'
                                }`}
                              >
                                {lang === 'vi' ? tr.vi : tr.en}
                              </button>
                            );
                          })}
                        </div>
                        {triggerInfo && (
                          <p className="text-xs text-[#493633]/90 leading-relaxed pt-1 border-t border-[#EADBD5]">
                            <span className="font-semibold text-[#C98585]">
                              {t.planner.handbookTipPrefix}{' '}
                            </span>
                            {lang === 'vi' ? triggerInfo.tipVi : triggerInfo.tipEn}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Add Scheduled Task Form */}
        <form
          onSubmit={handleCreateTask}
          className="lg:col-span-5 rounded-3xl bg-[#FFFAF7] border border-[#EADBD5] p-6 sm:p-7 space-y-4 lg:sticky lg:top-24"
        >
          <h2 className="font-serif-editorial text-xl font-semibold text-[#493633]">
            {t.planner.addFormTitle}
          </h2>

          <div>
            <label className="block text-xs font-medium text-[#987D77] mb-1.5">
              {t.planner.taskTitleLabel}
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.planner.taskTitlePh}
              className="w-full rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/60 px-4 py-3 text-sm text-[#493633]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#987D77] mb-1.5">
                {t.planner.dateLabel}
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/60 px-3 py-2.5 text-sm text-[#493633] tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#987D77] mb-1.5">
                {t.planner.timeLabel}
              </label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/60 px-3 py-2.5 text-sm text-[#493633] tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#987D77] mb-1.5">
                {t.planner.priorityLabel}
              </label>
              <select
                value={priority}
                onChange={(e) =>
                  setPriority(
                    e.target.value as 'must_do' | 'important' | 'nice_to_have'
                  )
                }
                className="w-full rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/60 px-3 py-2.5 text-sm text-[#493633]"
              >
                <option value="must_do">{t.planner.priorities.must_do}</option>
                <option value="important">{t.planner.priorities.important}</option>
                <option value="nice_to_have">
                  {t.planner.priorities.nice_to_have}
                </option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#987D77] mb-1.5">
                {t.planner.durationLabel}
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/60 px-3 py-2.5 text-sm text-[#493633] tabular-nums"
              >
                {[10, 15, 25, 45, 60, 90].map((m) => (
                  <option key={m} value={m}>
                    {m} {t.onboarding.minutes}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#987D77] mb-1.5">
              {t.planner.firstStepLabel}
            </label>
            <input
              type="text"
              value={tinyFirstStep}
              onChange={(e) => setTinyFirstStep(e.target.value)}
              placeholder={t.planner.firstStepPh}
              className="w-full rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/60 px-4 py-2.5 text-sm text-[#493633]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#987D77] mb-1.5">
              {t.planner.triggerLabel}
            </label>
            <select
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
              className="w-full rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/60 px-3 py-2.5 text-sm text-[#493633]"
            >
              <option value="">
                {lang === 'vi' ? 'Không có / Chưa rõ' : 'None / Not sure'}
              </option>
              {PROCRASTINATION_TRIGGERS.map((tr) => (
                <option key={tr.id} value={tr.id}>
                  {lang === 'vi' ? tr.vi : tr.en}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#C98585] hover:bg-[#b87474] px-6 py-3 min-h-[46px] text-sm font-medium text-[#FFFAF7] cursor-pointer disabled:opacity-60"
          >
            <Plus className="w-4 h-4" />
            <span>{t.planner.addSubmitBtn}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

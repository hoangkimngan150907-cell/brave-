import React, { useEffect, useState } from 'react';
import {
  Bell,
  BellOff,
  BellRing,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Smartphone,
} from 'lucide-react';
import {
  checkCurrentDeviceSubscribed,
  disableDevicePush,
  downloadDailyReminderICS,
  enableDevicePush,
  fetchPushStatus,
  isIOSDevice,
  isPushSupported,
  isStandaloneMode,
  triggerTestNotification,
  updatePushSchedule,
} from '../lib/reminders';
import type { Language } from '../types/brave';

interface ReminderSettingsCardProps {
  lang: Language;
  initialTime?: string;
  compact?: boolean;
}

export const ReminderSettingsCard: React.FC<ReminderSettingsCardProps> = ({
  lang,
  initialTime = '20:00',
  compact = false,
}) => {
  const [supported] = useState(() => isPushSupported());
  const [isIOS] = useState(() => isIOSDevice());
  const [isStandalone] = useState(() => isStandaloneMode());
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionsCount, setSubscriptionsCount] = useState(0);
  const [reminderTime, setReminderTime] = useState(initialTime || '20:00');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [deviceSub, serverStatus] = await Promise.all([
          checkCurrentDeviceSubscribed(),
          fetchPushStatus(),
        ]);
        if (!mounted) return;
        setIsSubscribed(deviceSub);
        setSubscriptionsCount(serverStatus.subscriptionsCount);
        if (serverStatus.reminderTime) {
          setReminderTime(serverStatus.reminderTime);
        }
      } catch {
        // Ignore silent status load failures
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const handleEnable = async () => {
    setErrorMsg(null);
    setStatusMsg(null);
    setLoading(true);
    try {
      await enableDevicePush(reminderTime);
      setIsSubscribed(true);
      setSubscriptionsCount((c) => Math.max(1, c));
      setStatusMsg(
        lang === 'vi'
          ? `Đã bật thông báo trên thiết bị này lúc ${reminderTime} hằng ngày và trước các việc có hẹn giờ.`
          : `Device notifications enabled daily at ${reminderTime} and before scheduled tasks.`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'PERMISSION_DENIED') {
        setErrorMsg(
          lang === 'vi'
            ? 'Trình duyệt đang chặn quyền Thông báo. Hãy vào Cài đặt trang web → Thông báo → Cho phép rồi bấm thử lại.'
            : 'Notifications are blocked in your browser. Enable Notifications in site settings and try again.'
        );
      } else if (isIOS && !isStandalone) {
        setErrorMsg(
          lang === 'vi'
            ? 'Trên iPhone/iPad, bạn cần bấm Chia sẻ → "Thêm vào MH chính" và mở BRAVE từ màn hình chính để bật Push, hoặc dùng nút "Thêm vào Lịch iPhone (.ics)" bên dưới.'
            : 'On iPhone/iPad, first Add BRAVE to Home Screen to enable Web Push, or tap "Add to Phone Calendar (.ics)" below.'
        );
      } else {
        setErrorMsg(
          lang === 'vi'
            ? 'Thiết bị hoặc trình duyệt này chưa hỗ trợ Web Push trực tiếp. Bạn có thể dùng nút "Thêm vào Lịch điện thoại (.ics)" bên dưới để nhận chuông nhắc chắc chắn 100%.'
            : 'Web Push is not supported in this browser. Use "Add to Phone Calendar (.ics)" below for guaranteed native alerts.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    setErrorMsg(null);
    setStatusMsg(null);
    setLoading(true);
    try {
      await disableDevicePush();
      setIsSubscribed(false);
      setSubscriptionsCount((c) => Math.max(0, c - 1));
      setStatusMsg(
        lang === 'vi'
          ? 'Đã tắt thông báo đẩy trên thiết bị này.'
          : 'Push notifications turned off on this device.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTimeChange = async (nextTime: string) => {
    setReminderTime(nextTime);
    setErrorMsg(null);
    try {
      await updatePushSchedule(nextTime);
      setStatusMsg(
        lang === 'vi'
          ? `Đã lưu giờ nhắc hằng ngày: ${nextTime}`
          : `Daily reminder time saved: ${nextTime}`
      );
    } catch {
      // Ignore if unsubscribed
    }
  };

  const handleTest = async () => {
    setErrorMsg(null);
    setStatusMsg(null);
    setLoading(true);
    try {
      await triggerTestNotification(lang);
      setStatusMsg(
        lang === 'vi'
          ? 'Đã gửi thông báo thử! Kiểm tra thanh thông báo của điện thoại/máy tính nhé.'
          : 'Test notification sent! Check your device notification center.'
      );
    } catch {
      setErrorMsg(
        lang === 'vi'
          ? 'Hãy bấm "Bật thông báo trên thiết bị này" trước khi gửi thử.'
          : 'Please enable device notifications first before sending a test.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`rounded-3xl bg-[#FFFAF7] border border-[#EADBD5] ${
        compact ? 'p-5 space-y-4' : 'p-6 space-y-4'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-serif-editorial text-lg font-semibold text-[#493633] flex items-center gap-2">
            <BellRing className="w-4 h-4 text-[#C98585] shrink-0" />
            <span>
              {lang === 'vi'
                ? 'Nhắc nhở qua thông báo điện thoại'
                : 'Phone & Browser Reminders'}
            </span>
          </h3>
          <p className="text-xs text-[#987D77] mt-1 leading-relaxed">
            {lang === 'vi'
              ? 'Nhận thông báo đẩy kể cả khi đã đóng app, plus nhắc trước 15 phút với việc có hẹn giờ.'
              : 'Receive push reminders even when closed, plus 15-minute heads-up for timed tasks.'}
          </p>
        </div>

        <span
          className={`self-start sm:self-center text-xs font-medium px-3 py-1 rounded-full border whitespace-nowrap shrink-0 ${
            isSubscribed
              ? 'border-[#C98585] bg-[#E7BDB8]/35 text-[#493633]'
              : 'border-[#EADBD5] bg-[#F7EEE9] text-[#987D77]'
          }`}
        >
          {isSubscribed
            ? lang === 'vi'
              ? 'Đã bật trên máy này'
              : 'Active on this device'
            : subscriptionsCount > 0
              ? lang === 'vi'
                ? `Đã bật trên ${subscriptionsCount} thiết bị`
                : `Active on ${subscriptionsCount} device(s)`
              : lang === 'vi'
                ? 'Chưa bật trên máy này'
                : 'Not enabled here'}
        </span>
      </div>

      {/* iOS Safari hint when not yet installed to Home Screen */}
      {isIOS && !isStandalone && (
        <div className="rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/75 px-4 py-3 text-xs text-[#493633] flex items-start gap-2.5 leading-relaxed">
          <Smartphone className="w-4 h-4 text-[#C98585] shrink-0 mt-0.5" />
          <span>
            {lang === 'vi'
              ? 'Mẹo cho iPhone/iPad: Apple chỉ cho phép gửi Push Notification sau khi bạn bấm Chia sẻ → "Thêm vào MH chính" và mở từ biểu tượng app. Hoặc bấm nút Thêm vào Lịch (.ics) bên dưới để báo thức chạy ngay không cần cài.'
              : 'iPhone tip: iOS requires adding BRAVE to Home Screen to receive Web Push, or tap "Add to Calendar (.ics)" below for instant native alerts.'}
          </span>
        </div>
      )}

      {/* Time picker + Action buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <label className="inline-flex items-center gap-2 rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/60 px-3.5 py-2 text-xs text-[#493633] shrink-0">
          <Clock className="w-3.5 h-3.5 text-[#C98585]" />
          <span className="text-[#987D77]">
            {lang === 'vi' ? 'Giờ nhắc mỗi ngày:' : 'Daily time:'}
          </span>
          <input
            type="time"
            value={reminderTime}
            onChange={(e) => handleTimeChange(e.target.value)}
            className="bg-transparent font-semibold text-[#493633] tabular-nums focus:outline-none"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          {!isSubscribed ? (
            <button
              type="button"
              disabled={loading || (!supported && !(isIOS && !isStandalone))}
              onClick={handleEnable}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#C98585] hover:bg-[#b87474] px-4 py-2.5 min-h-[42px] text-xs font-medium text-[#FFFAF7] transition-colors cursor-pointer disabled:opacity-60"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>
                {loading
                  ? lang === 'vi'
                    ? 'Đang bật...'
                    : 'Enabling...'
                  : lang === 'vi'
                    ? 'Bật thông báo điện thoại'
                    : 'Enable phone notifications'}
              </span>
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={loading}
                onClick={handleTest}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#C98585] hover:bg-[#b87474] px-4 py-2.5 min-h-[42px] text-xs font-medium text-[#FFFAF7] transition-colors cursor-pointer disabled:opacity-60"
              >
                <BellRing className="w-3.5 h-3.5" />
                <span>
                  {lang === 'vi' ? 'Gửi thử thông báo ngay' : 'Send test notification'}
                </span>
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleDisable}
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#EADBD5] px-3.5 py-2.5 min-h-[42px] text-xs font-medium text-[#987D77] hover:text-[#493633] cursor-pointer"
              >
                <BellOff className="w-3.5 h-3.5" />
                <span>{lang === 'vi' ? 'Tắt' : 'Turn off'}</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => downloadDailyReminderICS(reminderTime, lang)}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#EADBD5] bg-[#FFFAF7] hover:bg-[#E7BDB8]/25 px-4 py-2.5 min-h-[42px] text-xs font-medium text-[#493633] transition-colors cursor-pointer"
          >
            <CalendarPlus className="w-3.5 h-3.5 text-[#C98585]" />
            <span>
              {lang === 'vi'
                ? 'Thêm nhắc hằng ngày vào Lịch (.ics)'
                : 'Add daily alarm to Calendar (.ics)'}
            </span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="rounded-2xl border border-[#EADBD5] bg-[#F7EEE9] px-4 py-2.5 text-xs text-[#493633] flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#C98585] shrink-0 mt-0.5" />
          <span>{statusMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-2xl border border-[#C98585]/50 bg-[#E7BDB8]/35 px-4 py-2.5 text-xs text-[#493633] leading-relaxed">
          {errorMsg}
        </div>
      )}
    </div>
  );
};

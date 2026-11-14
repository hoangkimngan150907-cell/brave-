import React, { useState } from 'react';
import { Check, Copy, Download, ExternalLink, Smartphone, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';
import type { Language } from '../types/brave';

export const PWAInstallButton: React.FC<{
  lang: Language;
  variant?: 'compact' | 'full';
}> = ({ lang, variant = 'compact' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== 'undefined' ? window.location.origin : '';

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback ignored if clipboard blocked
    }
  };

  const handleInstallClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (!accepted) {
        setShowGuide(true);
      }
      return;
    }
    setShowGuide(true);
  };

  if (isInstalled && variant === 'compact') {
    return null;
  }

  const installLabel = isIOS
    ? lang === 'vi'
      ? 'Thêm vào màn hình chính'
      : 'Add to Home Screen'
    : lang === 'vi'
      ? 'Cài đặt ứng dụng'
      : 'Install App';

  return (
    <>
      {variant === 'full' ? (
        <div className="space-y-2.5">
          {isInstalled ? (
            <div className="flex items-center gap-2 rounded-2xl border border-[#EADBD5] bg-[#F7EEE9] px-4 py-3 text-xs font-medium text-[#493633]">
              <Check className="w-4 h-4 text-[#C98585] shrink-0" />
              <span>
                {lang === 'vi'
                  ? 'BRAVE đã được cài đặt dưới dạng ứng dụng trên thiết bị này.'
                  : 'BRAVE is installed as an app on this device.'}
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-full bg-[#C98585] hover:bg-[#b87474] px-5 py-3 text-sm font-medium text-[#FFFAF7] transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>{installLabel}</span>
            </button>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex-1 min-h-[42px] inline-flex items-center justify-center gap-2 rounded-full border border-[#EADBD5] bg-[#FFFAF7] hover:bg-[#E7BDB8]/25 px-4 py-2 text-xs font-medium text-[#493633] transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#C98585]" />
                  <span>
                    {lang === 'vi' ? 'Đã sao chép link!' : 'Link copied!'}
                  </span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#C98585]" />
                  <span>
                    {lang === 'vi'
                      ? 'Sao chép link gửi nhóm'
                      : 'Copy share link'}
                  </span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowGuide(true)}
              className="min-h-[42px] inline-flex items-center justify-center gap-2 rounded-full border border-[#EADBD5] bg-[#FFFAF7] hover:bg-[#F7EEE9] px-4 py-2 text-xs font-medium text-[#987D77] hover:text-[#493633] transition-colors cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5 text-[#C98585]" />
              <span>
                {lang === 'vi' ? 'Hướng dẫn cài app' : 'Install guide'}
              </span>
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleInstallClick}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-[#EADBD5] bg-[#FFFAF7] text-[#493633] hover:bg-[#E7BDB8]/30 transition-colors whitespace-nowrap shrink-0 cursor-pointer px-3.5 py-2 text-xs font-medium min-h-[40px]"
        >
          <Download className="w-3.5 h-3.5 text-[#C98585]" />
          <span>{installLabel}</span>
        </button>
      )}

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#493633]/40 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-3xl bg-[#FFFAF7] border border-[#EADBD5] p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-serif-editorial text-xl font-semibold text-[#493633]">
                  {lang === 'vi'
                    ? 'Cài đặt BRAVE về điện thoại & máy tính'
                    : 'Install BRAVE on Phone & Desktop'}
                </h3>
                <p className="text-xs text-[#987D77] mt-1">
                  {lang === 'vi'
                    ? 'Dùng trực tiếp trên web hoặc cài làm app độc lập miễn phí.'
                    : 'Use on the web or install as a standalone app.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Close"
                className="p-2 rounded-full text-[#987D77] hover:bg-[#F7EEE9] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {shareUrl && (
              <div className="rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/70 p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-[#987D77]">
                    {lang === 'vi' ? 'Link truy cập hiện tại' : 'Current app URL'}
                  </p>
                  <p className="text-xs text-[#493633] truncate font-medium">
                    {shareUrl}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-[#FFFAF7] border border-[#EADBD5] px-3 py-1.5 text-xs font-medium text-[#493633] hover:bg-[#E7BDB8]/30 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#C98585]" />
                      <span>{lang === 'vi' ? 'Đã chép' : 'Copied'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#C98585]" />
                      <span>{lang === 'vi' ? 'Chép link' : 'Copy'}</span>
                    </>
                  )}
                </button>
              </div>
            )}

            <div className="space-y-3 text-xs text-[#493633]/90 leading-relaxed">
              <div className="rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/45 p-3.5 space-y-1">
                <p className="font-semibold text-[#493633] flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-[#C98585]" />
                  <span>
                    {lang === 'vi'
                      ? 'Nếu bạn mở link từ Zalo / Messenger'
                      : 'Opened from Zalo / Messenger?'}
                  </span>
                </p>
                <p className="text-[#987D77]">
                  {lang === 'vi'
                    ? 'Hãy bấm dấu ⋯ ở góc trên và chọn "Mở bằng trình duyệt" (Chrome trên Android hoặc Safari trên iPhone) để hiện nút cài đặt.'
                    : 'Tap ⋯ in the corner and choose "Open in Browser" (Chrome on Android or Safari on iPhone).'}
                </p>
              </div>

              <div className="space-y-2 pl-1">
                <p>
                  <strong className="text-[#493633]">Android (Chrome / Edge):</strong>{' '}
                  {lang === 'vi'
                    ? 'Bấm nút ⋮ ở góc trên phải → "Cài đặt ứng dụng" hoặc "Thêm vào màn hình chính".'
                    : 'Tap ⋮ top-right → "Install app" or "Add to Home screen".'}
                </p>
                <p>
                  <strong className="text-[#493633]">iPhone / iPad (Safari):</strong>{' '}
                  {lang === 'vi'
                    ? 'Bấm biểu tượng Chia sẻ (ô vuông mũi tên lên) ở thanh dưới → chọn "Thêm vào MH chính".'
                    : 'Tap the Share icon in Safari → choose "Add to Home Screen".'}
                </p>
                <p>
                  <strong className="text-[#493633]">
                    {lang === 'vi' ? 'Máy tính (Chrome / Edge):' : 'Desktop (Chrome / Edge):'}
                  </strong>{' '}
                  {lang === 'vi'
                    ? 'Bấm biểu tượng Cài đặt (màn hình có mũi tên) ở bên phải thanh địa chỉ.'
                    : 'Click the Install icon on the right side of the address bar.'}
                </p>
              </div>
            </div>

            {isInstallable && (
              <button
                type="button"
                onClick={async () => {
                  const ok = await install();
                  if (ok) setShowGuide(false);
                }}
                className="w-full min-h-[44px] rounded-full bg-[#C98585] py-2.5 text-sm font-medium text-[#FFFAF7] hover:bg-[#b87474] transition-colors cursor-pointer"
              >
                {lang === 'vi' ? 'Cài đặt ngay' : 'Install now'}
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className={`w-full min-h-[44px] rounded-full py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                isInstallable
                  ? 'border border-[#EADBD5] text-[#987D77] hover:bg-[#F7EEE9]'
                  : 'bg-[#C98585] text-[#FFFAF7] hover:bg-[#b87474]'
              }`}
            >
              {lang === 'vi' ? 'Đã hiểu' : 'Got it'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC<{ lang: Language }> = ({ lang }) => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-5 left-4 z-50 flex items-center gap-2 rounded-full bg-[#493633] px-4 py-2 text-xs font-medium text-[#FFFAF7] shadow-lg">
      <WifiOff className="w-3.5 h-3.5 text-[#E7BDB8]" />
      <span>
        {lang === 'vi'
          ? 'Đang ngoại tuyến — hiển thị dữ liệu đã lưu'
          : 'Offline — showing cached data'}
      </span>
    </div>
  );
};

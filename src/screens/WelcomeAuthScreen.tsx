import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { getT } from '../i18n/translations';
import { auth, googleAuthProvider } from '../lib/firebase';
import type {
  Language,
  UserPreferences,
  UserProfile,
  UserProgress,
} from '../types/brave';
import { PWAInstallButton } from '../components/PWAComponents';

interface WelcomeAuthScreenProps {
  lang: Language;
  onChangeLang: (lang: Language) => void;
  onAuthSuccess: (payload: {
    user: UserProfile;
    preferences: UserPreferences;
    progress: UserProgress;
  }) => void;
}

export const WelcomeAuthScreen: React.FC<WelcomeAuthScreenProps> = ({
  lang,
  onChangeLang,
  onAuthSuccess,
}) => {
  const t = getT(lang);
  const [mode, setMode] = useState<'signup' | 'login' | 'reset'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [resetStep, setResetStep] = useState<'request' | 'verify'>('request');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setInfoMsg(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setErrorMsg(
          lang === 'vi'
            ? 'Bạn đã đóng cửa sổ đăng nhập Google.'
            : 'Google sign-in popup was closed.'
        );
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Google sign-in failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg(
        lang === 'vi'
          ? 'Vui lòng nhập địa chỉ email hợp lệ.'
          : 'Please enter a valid email address.'
      );
      return;
    }

    if (mode !== 'reset' && password.length < 6) {
      setErrorMsg(
        lang === 'vi'
          ? 'Mật khẩu cần ít nhất 6 ký tự.'
          : 'Password must be at least 6 characters.'
      );
      return;
    }

    if (mode === 'reset' && resetStep === 'verify' && !resetCode.trim()) {
      setErrorMsg(
        lang === 'vi'
          ? 'Vui lòng nhập mã xác nhận 6 số.'
          : 'Please enter the 6-digit verification code.'
      );
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            email: cleanEmail,
            password,
            fullName: fullName.trim(),
            preferredLanguage: lang,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (data.error === 'EMAIL_EXISTS') {
            throw new Error(
              lang === 'vi'
                ? 'Email này đã có tài khoản. Hãy chuyển sang tab Đăng nhập.'
                : 'This email is already registered. Please switch to Log In.'
            );
          }
          throw new Error(data.error || 'Could not create account.');
        }
        onAuthSuccess(data);
      } else if (mode === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email: cleanEmail, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (data.error === 'INVALID_CREDENTIALS') {
            throw new Error(
              lang === 'vi'
                ? 'Email hoặc mật khẩu chưa đúng. Nếu bạn chưa có tài khoản, hãy chọn tab Đăng ký.'
                : 'Invalid email or password. Switch to Sign Up if you are new.'
            );
          }
          throw new Error(data.error || 'Login failed.');
        }
        onAuthSuccess(data);
      } else if (resetStep === 'request') {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email: cleanEmail }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (data.error === 'ACCOUNT_NOT_FOUND') {
            throw new Error(
              lang === 'vi'
                ? 'Không tìm thấy tài khoản email này (hoặc tài khoản dùng Google Sign-In).'
                : 'No email/password account found for this address.'
            );
          }
          throw new Error(data.error || 'Could not start password reset.');
        }
        setResetStep('verify');
        setInfoMsg(
          lang === 'vi'
            ? `Mã xác nhận đặt lại mật khẩu của bạn là: ${data.resetCode} (có hiệu lực 15 phút).`
            : `Your password reset verification code is: ${data.resetCode} (valid for 15 minutes).`
        );
      } else {
        if (newPassword.length < 6) {
          throw new Error(
            lang === 'vi'
              ? 'Mật khẩu mới cần ít nhất 6 ký tự.'
              : 'New password must be at least 6 characters.'
          );
        }
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            email: cleanEmail,
            code: resetCode.trim(),
            newPassword,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(
            data.error === 'INVALID_RESET_CODE'
              ? lang === 'vi'
                ? 'Mã xác nhận không đúng hoặc đã hết hạn.'
                : 'Invalid or expired reset code.'
              : data.error || 'Failed to reset password.'
          );
        }
        setMode('login');
        setResetStep('request');
        setResetCode('');
        setNewPassword('');
        setInfoMsg(
          lang === 'vi'
            ? 'Đã đổi mật khẩu thành công! Bạn có thể đăng nhập ngay.'
            : 'Password updated! You can now log in.'
        );
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7EEE9] text-[#493633] flex flex-col">
      {/* Top 3-zone header */}
      <header className="border-b border-[#EADBD5] bg-[#F7EEE9]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
          <span className="font-serif-editorial text-2xl font-semibold tracking-tight text-[#493633] whitespace-nowrap shrink-0">
            BRAVE
          </span>

          <nav className="hidden md:flex items-center gap-6 text-sm text-[#987D77]">
            <a href="#philosophy" className="hover:text-[#493633] transition-colors whitespace-nowrap shrink-0">
              {lang === 'vi' ? 'Triết lý' : 'Philosophy'}
            </a>
            <a href="#loop" className="hover:text-[#493633] transition-colors whitespace-nowrap shrink-0">
              {lang === 'vi' ? 'Hành trình' : 'The Loop'}
            </a>
            <a href="#auth-panel" className="hover:text-[#493633] transition-colors whitespace-nowrap shrink-0">
              {lang === 'vi' ? 'Bắt đầu' : 'Get Started'}
            </a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <PWAInstallButton lang={lang} variant="compact" />
            <div className="inline-flex items-center rounded-full border border-[#EADBD5] bg-[#FFFAF7] p-0.5">
              <button
                type="button"
                onClick={() => onChangeLang('vi')}
                className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors cursor-pointer ${
                  lang === 'vi'
                    ? 'bg-[#C98585] text-[#FFFAF7]'
                    : 'text-[#987D77] hover:text-[#493633]'
                }`}
              >
                VI
              </button>
              <button
                type="button"
                onClick={() => onChangeLang('en')}
                className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors cursor-pointer ${
                  lang === 'en'
                    ? 'bg-[#C98585] text-[#FFFAF7]'
                    : 'text-[#987D77] hover:text-[#493633]'
                }`}
              >
                EN
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Split Editorial Hero + Real Auth Card */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          {/* Editorial Story & Visual */}
          <div className="lg:col-span-7 flex flex-col justify-between gap-8">
            <div className="space-y-5">
              <p className="text-xs font-medium tracking-wide text-[#987D77]">
                {t.auth.heroEyebrow}
              </p>
              <h1 className="font-serif-editorial text-4xl sm:text-5xl font-semibold leading-[1.12] text-[#493633] max-w-xl [text-wrap:balance]">
                {t.auth.heroTitle}
              </h1>
              <p className="text-base sm:text-lg text-[#493633]/85 leading-relaxed max-w-xl">
                {t.auth.heroSubtitle}
              </p>
            </div>

            <div className="relative rounded-3xl overflow-hidden border border-[#EADBD5] bg-[#E7BDB8]/35 aspect-[16/9]">
              {!heroImgFailed ? (
                <img
                  src="/src/assets/images/hero_courage_editorial_1794589219154.jpg"
                  alt="Warm sunlit architectural archway representing calm courage"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-8 bg-gradient-to-br from-[#E7BDB8]/50 to-[#F7EEE9]">
                  <p className="font-serif-editorial text-xl text-[#493633] text-center max-w-md">
                    “{t.coreQuote}”
                  </p>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 bg-gradient-to-t from-[#493633]/80 via-[#493633]/35 to-transparent">
                <p className="font-serif-editorial italic text-sm sm:text-base text-[#FFFAF7] max-w-lg">
                  “{t.coreQuote}”
                </p>
              </div>
            </div>
          </div>

          {/* Real Authentication Panel */}
          <div id="auth-panel" className="lg:col-span-5 flex flex-col">
            <div className="rounded-3xl bg-[#FFFAF7] border border-[#EADBD5] p-6 sm:p-8 shadow-sm flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1 p-1 rounded-full bg-[#F7EEE9] border border-[#EADBD5] mb-6">
                  {(['signup', 'login', 'reset'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => {
                        setMode(tab);
                        setResetStep('request');
                        setErrorMsg(null);
                        setInfoMsg(null);
                      }}
                      className={`flex-1 py-2 px-3 rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                        mode === tab
                          ? 'bg-[#C98585] text-[#FFFAF7]'
                          : 'text-[#987D77] hover:text-[#493633]'
                      }`}
                    >
                      {tab === 'login'
                        ? t.auth.tabLogin
                        : tab === 'signup'
                          ? t.auth.tabSignup
                          : t.auth.tabReset}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleGoogleSignIn}
                  className="w-full min-h-[46px] rounded-full border border-[#EADBD5] bg-[#FFFAF7] hover:bg-[#F7EEE9] text-[#493633] font-medium text-sm flex items-center justify-center gap-3 transition-colors cursor-pointer disabled:opacity-60"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.91 6.72-4.91Z"
                    />
                  </svg>
                  <span>{t.auth.googleBtn}</span>
                </button>

                <div className="my-5 flex items-center gap-3 text-xs text-[#987D77]">
                  <div className="h-px flex-1 bg-[#EADBD5]" />
                  <span>{t.auth.orDivider}</span>
                  <div className="h-px flex-1 bg-[#EADBD5]" />
                </div>

                <form onSubmit={handleEmailSubmit} noValidate className="space-y-4">
                  {mode === 'signup' && (
                    <div>
                      <label className="block text-xs font-medium text-[#987D77] mb-1.5">
                        {t.auth.fullNameLabel}
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/50 px-4 py-3 text-sm text-[#493633] focus:outline-none focus:border-[#C98585]"
                        placeholder={lang === 'vi' ? 'Minh Anh (không bắt buộc)' : 'Alex Nguyen (optional)'}
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-[#987D77] mb-1.5">
                      {t.auth.emailLabel}
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/50 px-4 py-3 text-sm text-[#493633] focus:outline-none focus:border-[#C98585]"
                      placeholder="you@example.com"
                    />
                  </div>

                  {mode !== 'reset' && (
                    <div>
                      <label className="block text-xs font-medium text-[#987D77] mb-1.5">
                        {t.auth.passwordLabel}
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/50 px-4 py-3 text-sm text-[#493633] focus:outline-none focus:border-[#C98585]"
                        placeholder={lang === 'vi' ? 'Ít nhất 6 ký tự' : 'At least 6 characters'}
                      />
                    </div>
                  )}

                  {mode === 'reset' && resetStep === 'verify' && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-[#987D77] mb-1.5">
                          {lang === 'vi' ? 'Mã xác nhận (6 số)' : '6-digit reset code'}
                        </label>
                        <input
                          type="text"
                          required
                          value={resetCode}
                          onChange={(e) => setResetCode(e.target.value)}
                          className="w-full rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/50 px-4 py-3 text-sm text-[#493633]"
                          placeholder="123456"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#987D77] mb-1.5">
                          {lang === 'vi' ? 'Mật khẩu mới' : 'New password'}
                        </label>
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full rounded-2xl border border-[#EADBD5] bg-[#F7EEE9]/50 px-4 py-3 text-sm text-[#493633]"
                          placeholder="••••••••"
                        />
                      </div>
                    </>
                  )}

                  {errorMsg && (
                    <div className="rounded-2xl border border-[#C98585]/50 bg-[#E7BDB8]/35 px-4 py-3 text-xs text-[#493633] leading-relaxed">
                      {errorMsg}
                    </div>
                  )}

                  {infoMsg && (
                    <div className="rounded-2xl border border-[#EADBD5] bg-[#F7EEE9] px-4 py-3 text-xs text-[#493633] flex items-start gap-2 leading-relaxed">
                      <CheckCircle2 className="w-4 h-4 text-[#C98585] shrink-0 mt-0.5" />
                      <span>{infoMsg}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full min-h-[48px] rounded-full bg-[#C98585] hover:bg-[#b87474] text-[#FFFAF7] font-medium text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
                  >
                    <span>
                      {loading
                        ? lang === 'vi'
                          ? 'Đang xử lý...'
                          : 'Processing...'
                        : mode === 'login'
                          ? t.auth.submitLogin
                          : mode === 'signup'
                            ? t.auth.submitSignup
                            : resetStep === 'request'
                              ? t.auth.submitReset
                              : lang === 'vi'
                                ? 'Xác nhận đổi mật khẩu'
                                : 'Confirm new password'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>

              <div className="mt-6 pt-5 border-t border-[#EADBD5] flex items-start gap-2.5 text-xs text-[#987D77] leading-relaxed">
                <ShieldCheck className="w-4 h-4 text-[#C98585] shrink-0 mt-0.5" />
                <span>{t.auth.safetyNote}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Philosophy & Behavioral Loop Sections */}
        <section id="philosophy" className="mt-12 pt-10 border-t border-[#EADBD5]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {t.auth.pillars.map((pillar, i) => (
              <div
                key={i}
                className="rounded-3xl bg-[#FFFAF7] border border-[#EADBD5] p-6 space-y-2"
              >
                <p className="text-xs font-medium text-[#987D77] tabular-nums">
                  0{i + 1}.
                </p>
                <h2 className="font-serif-editorial text-xl font-semibold text-[#493633]">
                  {pillar.title}
                </h2>
                <p className="text-sm text-[#987D77] leading-relaxed">{pillar.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="loop" className="mt-10 rounded-3xl bg-[#FFFAF7] border border-[#EADBD5] p-6 sm:p-8">
          <p className="text-xs font-medium text-[#987D77] mb-3">{t.auth.loopTitle}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {t.auth.loopSteps.map((step, idx) => (
              <div key={step} className="pt-3 border-t border-[#EADBD5]">
                <span className="text-xs text-[#C98585] font-semibold tabular-nums">
                  0{idx + 1}
                </span>
                <p className="font-serif-editorial text-lg font-medium text-[#493633] mt-1">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

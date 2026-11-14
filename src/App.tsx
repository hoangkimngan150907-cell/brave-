import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { AppShell } from './components/AppShell';
import { OfflineIndicator } from './components/PWAComponents';
import { apiRequest } from './lib/api';
import { auth } from './lib/firebase';
import { ChallengesScreen } from './screens/ChallengesScreen';
import { CoachScreen } from './screens/CoachScreen';
import { CommunityScreen } from './screens/CommunityScreen';
import { DiaryScreen } from './screens/DiaryScreen';
import { FearMapScreen } from './screens/FearMapScreen';
import { HomeScreen } from './screens/HomeScreen';
import { JourneyScreen } from './screens/JourneyScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { PlannerScreen } from './screens/PlannerScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { WelcomeAuthScreen } from './screens/WelcomeAuthScreen';
import type {
  Language,
  ScreenId,
  UserPreferences,
  UserProfile,
  UserProgress,
} from './types/brave';

export default function App() {
  const [lang, setLang] = useState<Language>(() => {
    const saved =
      typeof window !== 'undefined' ? window.localStorage.getItem('brave_lang') : null;
    return saved === 'en' ? 'en' : 'vi';
  });

  const [authChecked, setAuthChecked] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [activeScreen, setActiveScreen] = useState<ScreenId>('home');

  const handleChangeLang = (nextLang: Language) => {
    setLang(nextLang);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('brave_lang', nextLang);
    }
    if (userProfile) {
      apiRequest('/api/me/profile', {
        method: 'PUT',
        body: JSON.stringify({ preferredLanguage: nextLang }),
      }).catch(() => {});
    }
  };

  const handleLoggedOut = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {});
    await signOut(auth).catch(() => {});
    setUserProfile(null);
    setPreferences(null);
    setProgress(null);
    setActiveScreen('home');
  };

  useEffect(() => {
    let active = true;
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      try {
        const data = await apiRequest<{
          user: UserProfile;
          preferences: UserPreferences;
          progress: UserProgress;
        }>('/api/me');
        if (!active) return;
        setUserProfile(data.user);
        setPreferences(data.preferences);
        setProgress(data.progress);
      } catch {
        if (!active) return;
        if (!fbUser) {
          setUserProfile(null);
          setPreferences(null);
          setProgress(null);
        }
      } finally {
        if (active) setAuthChecked(true);
      }
    });
    return () => {
      active = false;
      unsub();
    };
  }, []);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#F7EEE9] flex flex-col items-center justify-center p-6 text-center">
        <span className="font-serif-editorial text-3xl font-semibold text-[#493633] tracking-tight">
          BRAVE
        </span>
        <p className="mt-2 text-xs text-[#987D77]">
          {lang === 'vi' ? 'Đang chuẩn bị không gian của bạn...' : 'Preparing your space...'}
        </p>
      </div>
    );
  }

  if (!userProfile || !preferences || !progress) {
    return (
      <>
        <WelcomeAuthScreen
          lang={lang}
          onChangeLang={handleChangeLang}
          onAuthSuccess={({ user, preferences: p, progress: pr }) => {
            setUserProfile(user);
            setPreferences(p);
            setProgress(pr);
            setActiveScreen('home');
          }}
        />
        <OfflineIndicator lang={lang} />
      </>
    );
  }

  if (!userProfile.onboardingCompleted) {
    return (
      <>
        <OnboardingScreen
          lang={lang}
          onChangeLang={handleChangeLang}
          user={userProfile}
          onComplete={({ user, preferences: prefs, progress: prog }) => {
            setUserProfile(user);
            setPreferences(prefs);
            setProgress(prog);
            setActiveScreen('home');
          }}
        />
        <OfflineIndicator lang={lang} />
      </>
    );
  }

  return (
    <>
      <AppShell
        lang={lang}
        onChangeLang={handleChangeLang}
        activeScreen={activeScreen}
        onNavigate={setActiveScreen}
        user={userProfile}
      >
        {activeScreen === 'home' && (
          <HomeScreen
            lang={lang}
            user={userProfile}
            progress={progress}
            onProgressUpdated={setProgress}
            onNavigate={setActiveScreen}
          />
        )}
        {activeScreen === 'planner' && (
          <PlannerScreen lang={lang} onProgressUpdated={setProgress} />
        )}
        {activeScreen === 'fears' && <FearMapScreen lang={lang} />}
        {activeScreen === 'coach' && <CoachScreen lang={lang} />}
        {activeScreen === 'challenges' && (
          <ChallengesScreen lang={lang} onProgressUpdated={setProgress} />
        )}
        {activeScreen === 'diary' && <DiaryScreen lang={lang} />}
        {activeScreen === 'journey' && (
          <JourneyScreen lang={lang} progress={progress} />
        )}
        {activeScreen === 'community' && <CommunityScreen lang={lang} />}
        {activeScreen === 'profile' && (
          <ProfileScreen
            lang={lang}
            onChangeLang={handleChangeLang}
            user={userProfile}
            preferences={preferences}
            progress={progress}
            onLoggedOut={handleLoggedOut}
            onUpdated={({ user, preferences: p, progress: pr }) => {
              if (user) setUserProfile(user);
              if (p) setPreferences(p);
              if (pr) setProgress(pr);
            }}
          />
        )}
      </AppShell>
      <OfflineIndicator lang={lang} />
    </>
  );
}

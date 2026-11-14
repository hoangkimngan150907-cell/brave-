import React from 'react';
import {
  BookOpen,
  CalendarCheck2,
  Compass,
  Flame,
  Home,
  MessageCircleHeart,
  Mountain,
  User,
  Users,
} from 'lucide-react';
import { getT } from '../i18n/translations';
import type { Language, ScreenId, UserProfile } from '../types/brave';
import { PWAInstallButton } from './PWAComponents';

interface AppShellProps {
  lang: Language;
  onChangeLang: (lang: Language) => void;
  activeScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  user: UserProfile | null;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  lang,
  onChangeLang,
  activeScreen,
  onNavigate,
  user,
  children,
}) => {
  const t = getT(lang);

  const desktopNav: { id: ScreenId; label: string }[] = [
    { id: 'home', label: t.nav.home },
    { id: 'planner', label: t.nav.planner },
    { id: 'challenges', label: t.nav.challenges },
    { id: 'coach', label: t.nav.coach },
    { id: 'fears', label: t.nav.fears },
    { id: 'diary', label: t.nav.diary },
    { id: 'journey', label: t.nav.journey },
    { id: 'community', label: t.nav.community },
  ];

  const mobileTabs: {
    id: ScreenId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'home', label: t.nav.home, icon: Home },
    { id: 'planner', label: t.nav.planner, icon: CalendarCheck2 },
    { id: 'challenges', label: t.nav.challenges, icon: Flame },
    { id: 'coach', label: t.nav.coach, icon: MessageCircleHeart },
    { id: 'journey', label: t.nav.journey, icon: Mountain },
  ];

  return (
    <div className="min-h-screen bg-[#F7EEE9] text-[#493633] flex flex-col">
      {/* 3-Zone Top Navigation Contract */}
      <header className="sticky top-0 z-30 bg-[#F7EEE9]/90 backdrop-blur-md border-b border-[#EADBD5]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4 sm:gap-6">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="font-serif-editorial text-xl sm:text-2xl font-semibold tracking-tight text-[#493633] whitespace-nowrap shrink-0 cursor-pointer"
          >
            BRAVE
          </button>

          {/* Zone 2: Clean single-line text nav links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-4 xl:gap-5">
            {desktopNav.map((item) => {
              const isActive = activeScreen === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`text-sm font-medium transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 cursor-pointer ${
                    isActive
                      ? 'text-[#493633] border-[#C98585]'
                      : 'text-[#987D77] border-transparent hover:text-[#493633]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Language Switcher [VI]/[EN] + Profile Trigger */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:block">
              <PWAInstallButton lang={lang} variant="compact" />
            </div>

            <div
              className="inline-flex items-center rounded-full border border-[#EADBD5] bg-[#FFFAF7] p-0.5"
              role="group"
              aria-label="Language switch"
            >
              <button
                type="button"
                onClick={() => onChangeLang('vi')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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
                className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  lang === 'en'
                    ? 'bg-[#C98585] text-[#FFFAF7]'
                    : 'text-[#987D77] hover:text-[#493633]'
                }`}
              >
                EN
              </button>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('fears')}
              className={`lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-full border transition-colors cursor-pointer ${
                activeScreen === 'fears'
                  ? 'border-[#C98585] bg-[#E7BDB8]/40 text-[#493633]'
                  : 'border-[#EADBD5] bg-[#FFFAF7] text-[#987D77]'
              }`}
              title={t.nav.fears}
              aria-label={t.nav.fears}
            >
              <Compass className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('diary')}
              className={`lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-full border transition-colors cursor-pointer ${
                activeScreen === 'diary'
                  ? 'border-[#C98585] bg-[#E7BDB8]/40 text-[#493633]'
                  : 'border-[#EADBD5] bg-[#FFFAF7] text-[#987D77]'
              }`}
              title={t.nav.diary}
              aria-label={t.nav.diary}
            >
              <BookOpen className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('community')}
              className={`lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-full border transition-colors cursor-pointer ${
                activeScreen === 'community'
                  ? 'border-[#C98585] bg-[#E7BDB8]/40 text-[#493633]'
                  : 'border-[#EADBD5] bg-[#FFFAF7] text-[#987D77]'
              }`}
              title={t.nav.community}
              aria-label={t.nav.community}
            >
              <Users className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('profile')}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 min-h-[40px] text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeScreen === 'profile'
                  ? 'border-[#C98585] bg-[#C98585] text-[#FFFAF7]'
                  : 'border-[#EADBD5] bg-[#FFFAF7] text-[#493633] hover:bg-[#E7BDB8]/30'
              }`}
              aria-label={t.nav.profile}
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline max-w-[100px] truncate">
                {user?.fullName || t.nav.profile}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-24 lg:pb-12">
        {children}
      </main>

      {/* Mobile Bottom Navigation (5 primary tabs, <=15% height cap) */}
      <nav
        aria-label="Mobile navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#FFFAF7]/95 backdrop-blur-md border-t border-[#EADBD5]"
      >
        <div className="grid grid-cols-5 items-center h-16 px-1">
          {mobileTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeScreen === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onNavigate(tab.id)}
                className={`flex flex-col items-center justify-center min-h-[44px] py-1 transition-colors cursor-pointer ${
                  isActive ? 'text-[#C98585]' : 'text-[#987D77]'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium tracking-tight mt-0.5 truncate max-w-[68px]">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

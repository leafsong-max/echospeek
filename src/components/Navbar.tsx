import React from 'react';
import {
  Mic,
  BookOpen,
  BookmarkCheck,
  BarChart3,
  Flame,
  Settings as SettingsIcon,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { UserStats } from '../types';

interface NavbarProps {
  currentTab: 'practice' | 'library' | 'weakness' | 'stats';
  onSelectTab: (tab: 'practice' | 'library' | 'weakness' | 'stats') => void;
  stats: UserStats;
  todayCount: number;
  onOpenSettings: () => void;
  onOpenCustomModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  stats,
  todayCount,
  onOpenSettings,
  onOpenCustomModal,
}) => {
  const goalProgress = Math.min(100, Math.round((todayCount / stats.dailyGoal) * 100));

  return (
    <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onSelectTab('practice')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-sky-500 to-emerald-400 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Mic className="w-5 h-5 text-sky-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-sky-200 to-indigo-200 bg-clip-text text-transparent">
                  EchoSpeak
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded">
                  AI Coach
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                실시간 발음 교정 &amp; 섀도잉 트레이너
              </p>
            </div>
          </div>

          {/* Gamification / Daily stats pills */}
          <div className="hidden md:flex items-center gap-3">
            {/* Streak */}
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold cursor-pointer hover:bg-amber-500/20 transition"
              title="연속 학습 일수"
              onClick={() => onSelectTab('stats')}
            >
              <Flame className="w-4 h-4 text-amber-400 fill-amber-400 animate-bounce" />
              <span>{stats.currentStreak}일 연속 학습</span>
            </div>

            {/* Daily Goal */}
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs cursor-pointer hover:border-slate-700 transition"
              title="오늘의 목표 진행률"
              onClick={() => onSelectTab('stats')}
            >
              <span className="text-slate-400">오늘 목표:</span>
              <span className="font-bold text-sky-400">
                {todayCount} / {stats.dailyGoal}
              </span>
              <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-500"
                  style={{ width: `${goalProgress}%` }}
                />
              </div>
            </div>

            {/* Level & XP */}
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold cursor-pointer hover:bg-indigo-500/20 transition"
              title="현재 레벨 및 경험치"
              onClick={() => onSelectTab('stats')}
            >
              <Trophy className="w-3.5 h-3.5 text-indigo-400" />
              <span>Lv. {stats.level}</span>
              <span className="text-indigo-400/70 font-normal">({stats.xp} XP)</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenCustomModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">AI 문장 생성</span>
              <span className="sm:hidden">문장추가</span>
            </button>

            <button
              onClick={onOpenSettings}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              aria-label="설정"
              title="발음 속도 및 앱 설정"
            >
              <SettingsIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-t border-slate-800/80 -mb-px overflow-x-auto no-scrollbar">
          <button
            onClick={() => onSelectTab('practice')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap cursor-pointer ${
              currentTab === 'practice'
                ? 'border-sky-400 text-sky-400 bg-sky-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>섀도잉 연습</span>
          </button>

          <button
            onClick={() => onSelectTab('library')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap cursor-pointer ${
              currentTab === 'library'
                ? 'border-sky-400 text-sky-400 bg-sky-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>문장 도서관</span>
          </button>

          <button
            onClick={() => onSelectTab('weakness')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap cursor-pointer ${
              currentTab === 'weakness'
                ? 'border-sky-400 text-sky-400 bg-sky-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <BookmarkCheck className="w-4 h-4" />
            <span>오답 &amp; 취약점 노트</span>
            {stats.bookmarkedIds.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-bold">
                {stats.bookmarkedIds.length}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectTab('stats')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap cursor-pointer ${
              currentTab === 'stats'
                ? 'border-sky-400 text-sky-400 bg-sky-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>학습 통계 &amp; 성장</span>
          </button>
        </div>
      </div>
    </header>
  );
};

import React from 'react';
import { X, Volume2, Globe, Target, Sparkles, Sliders, Lock, Shield } from 'lucide-react';
import { Settings, UserStats } from '../types';
import { clearStoredPasscode, getStoredPasscode, saveSettings, saveStats } from '../utils/storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onUpdateSettings: (settings: Settings) => void;
  stats: UserStats;
  onUpdateStats: (stats: UserStats) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  stats,
  onUpdateStats,
}) => {
  if (!isOpen) return null;

  const handleSpeedChange = (rate: number) => {
    const updated = { ...settings, speechRate: rate };
    saveSettings(updated);
    onUpdateSettings(updated);
  };

  const handleAccentChange = (accent: string) => {
    const updated = { ...settings, accent };
    saveSettings(updated);
    onUpdateSettings(updated);
  };

  const handleGoalChange = (dailyGoal: number) => {
    const updatedStats = { ...stats, dailyGoal };
    saveStats(updatedStats);
    onUpdateStats(updatedStats);
  };

  const handleToggleKorean = () => {
    const updated = { ...settings, showKorean: !settings.showKorean };
    saveSettings(updated);
    onUpdateSettings(updated);
  };

  const handleToggleIpa = () => {
    const updated = { ...settings, showIpa: !settings.showIpa };
    saveSettings(updated);
    onUpdateSettings(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-sky-400" />
            <span>학습 환경 설정</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            원어민 음성 재생 속도 및 일일 학습 목표를 맞춤 설정하세요.
          </p>
        </div>

        <div className="space-y-5">
          {/* Daily Goal */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-400" />
                <span>일일 학습 목표 문장 수</span>
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400">{stats.dailyGoal}개</span>
            </div>
            <div className="grid grid-cols-4 gap-2 pt-1">
              {[5, 10, 15, 20].map((goal) => (
                <button
                  key={goal}
                  onClick={() => handleGoalChange(goal)}
                  className={`py-2 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                    stats.dailyGoal === goal
                      ? 'bg-emerald-500 text-white border-emerald-400 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {goal}문장
                </button>
              ))}
            </div>
          </div>

          {/* Voice Accent */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-xs font-bold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-400" />
              <span>원어민 음성 발음 억양 (Accent)</span>
            </span>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => handleAccentChange('en-US')}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition cursor-pointer border text-left ${
                  settings.accent === 'en-US'
                    ? 'bg-sky-500 text-white border-sky-400'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                🇺🇸 미국식 영어 (Standard US)
              </button>
              <button
                onClick={() => handleAccentChange('en-GB')}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition cursor-pointer border text-left ${
                  settings.accent === 'en-GB'
                    ? 'bg-sky-500 text-white border-sky-400'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                🇬🇧 영국식 영어 (British RP)
              </button>
            </div>
          </div>

          {/* Default Playback Rate */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-xs font-bold text-white flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-purple-400" />
              <span>기본 발음 재생 속도</span>
            </span>
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                { rate: 0.7, label: '0.7x (느리게)' },
                { rate: 0.85, label: '0.85x (추천)' },
                { rate: 1.0, label: '1.0x (원어민)' },
              ].map((item) => (
                <button
                  key={item.rate}
                  onClick={() => handleSpeedChange(item.rate)}
                  className={`py-2 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                    settings.speechRate === item.rate
                      ? 'bg-purple-600 text-white border-purple-500'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Display toggles */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">기본 한글 해석 표시</span>
                <span className="text-[11px] text-slate-400">
                  처음 문장이 나타날 때 한글 뜻을 바로 보여줍니다.
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.showKorean}
                onChange={handleToggleKorean}
                className="w-5 h-5 rounded accent-sky-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <div>
                <span className="text-xs font-bold text-white block">국제 음성 기호 (IPA) 표시</span>
                <span className="text-[11px] text-slate-400">
                  영어 발음 기호를 문장 하단에 항상 함께 표시합니다.
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.showIpa}
                onChange={handleToggleIpa}
                className="w-5 h-5 rounded accent-sky-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Passcode Security Management */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                <span>나와 친구만 쓰기 위한 비밀번호 잠금</span>
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                보안 활성화
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Vercel 환경변수(<code>APP_PASSCODE</code>)에 설정한 비밀번호로 외부 접근을 원천 차단합니다. 비밀번호를 알고 있는 나와 친구만 접속할 수 있습니다.
            </p>
            <button
              type="button"
              onClick={() => {
                clearStoredPasscode();
                window.location.reload();
              }}
              className="py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-rose-300 border border-slate-800 hover:border-slate-700 transition cursor-pointer flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>지금 앱 잠그기 (비밀번호 테스트)</span>
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition cursor-pointer"
        >
          설정 저장 및 닫기
        </button>
      </div>
    </div>
  );
};

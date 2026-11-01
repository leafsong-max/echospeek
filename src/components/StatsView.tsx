import React, { useState } from 'react';
import {
  Flame,
  Award,
  Clock,
  CheckCircle2,
  TrendingUp,
  Calendar,
  BarChart2,
  FileDown,
  FileUp,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Headphones,
} from 'lucide-react';
import { DailyRecord, PronunciationResult, Sentence, UserStats } from '../types';
import {
  exportUserData,
  importUserData,
  loadDailyRecords,
  resetUserData,
} from '../utils/storage';

interface StatsViewProps {
  stats: UserStats;
  sentences: Sentence[];
  onSelectSentence: (sentence: Sentence) => void;
  onGoToPractice: () => void;
  onRefresh: () => void;
}

export const StatsView: React.FC<StatsViewProps> = ({
  stats,
  sentences,
  onSelectSentence,
  onGoToPractice,
  onRefresh,
}) => {
  const dailyRecords = loadDailyRecords();
  const [historyFilter, setHistoryFilter] = useState<'all' | 'high' | 'low'>('all');

  // Last 7 days dates array
  const last7Days: { dateStr: string; label: string; record?: DailyRecord }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const label = `${d.getMonth() + 1}/${d.getDate()} (${dayNames[d.getDay()]})`;
    last7Days.push({
      dateStr,
      label,
      record: dailyRecords[dateStr],
    });
  }

  // Today's record
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
  const todayRecord = dailyRecords[todayStr] || {
    date: todayStr,
    sentenceCount: 0,
    averageScore: 0,
    speakingSeconds: 0,
    scores: [],
  };

  // Format speaking time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}초`;
    return `${mins}분 ${secs}초`;
  };

  // Export JSON backup
  const handleExport = () => {
    const dataStr = exportUserData();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `echospeak_backup_${todayStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON backup
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text && importUserData(text)) {
        alert('성공적으로 데이터를 복원했습니다.');
        onRefresh();
      } else {
        alert('데이터 파일 형식이 올바르지 않습니다.');
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (confirm('모든 학습 데이터와 통계를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      resetUserData();
      onRefresh();
    }
  };

  // Filter history
  const filteredHistory = stats.history.filter((h) => {
    if (historyFilter === 'high') return h.overallScore >= 85;
    if (historyFilter === 'low') return h.overallScore < 75;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">
      {/* Top Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Streak */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-xs font-semibold">연속 학습 일수</span>
            <Flame className="w-5 h-5 fill-amber-400 animate-bounce" />
          </div>
          <div className="my-2">
            <div className="text-3xl font-extrabold text-white font-mono">
              {stats.currentStreak}
              <span className="text-sm font-normal text-amber-300 ml-1">일 연속</span>
            </div>
          </div>
          <span className="text-[11px] text-slate-400">
            최장 기록: <strong className="text-slate-300">{stats.longestStreak}일</strong>
          </span>
        </div>

        {/* Today's Count vs Goal */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-sky-400">
            <span className="text-xs font-semibold">오늘 학습한 문장</span>
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="my-2">
            <div className="text-3xl font-extrabold text-white font-mono">
              {todayRecord.sentenceCount}
              <span className="text-sm font-normal text-slate-400 ml-1">/ {stats.dailyGoal}개</span>
            </div>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-400 to-emerald-400 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.round((todayRecord.sentenceCount / stats.dailyGoal) * 100))}%`,
              }}
            />
          </div>
        </div>

        {/* Mastered Sentences */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-xs font-semibold">완전 정복 (90점 이상)</span>
            <Award className="w-5 h-5" />
          </div>
          <div className="my-2">
            <div className="text-3xl font-extrabold text-emerald-400 font-mono">
              {stats.totalMastered}
              <span className="text-sm font-normal text-slate-400 ml-1">회 달성</span>
            </div>
          </div>
          <span className="text-[11px] text-slate-400">
            총 시도: <strong className="text-slate-300">{stats.totalPracticed}회</strong>
          </span>
        </div>

        {/* Speaking Time */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-purple-400">
            <span className="text-xs font-semibold">총 말하기 연습 시간</span>
            <Clock className="w-5 h-5" />
          </div>
          <div className="my-2">
            <div className="text-3xl font-extrabold text-white font-mono">
              {formatTime(stats.totalSpeakingSeconds)}
            </div>
          </div>
          <span className="text-[11px] text-slate-400">
            오늘 시간: <strong className="text-slate-300">{formatTime(todayRecord.speakingSeconds)}</strong>
          </span>
        </div>
      </div>

      {/* 7-Day Activity & Pronunciation Score Trend */}
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-sky-400" />
              <span>최근 7일 학습량 및 발음 점수 성장 추이</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              매일 꾸준한 섀도잉 연습을 통해 발음 정확도와 유창성이 향상되는 것을 확인하세요.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-sky-500" />
              <span className="text-slate-300">문장 수</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
              <span className="text-slate-300">평균 점수(점)</span>
            </div>
          </div>
        </div>

        {/* 7-Day Chart Visual */}
        <div className="grid grid-cols-7 gap-2 pt-6 pb-2">
          {last7Days.map((day, idx) => {
            const count = day.record?.sentenceCount || 0;
            const avg = day.record?.averageScore || 0;
            // Height calculation
            const barHeightPct = Math.min(100, Math.max(12, (count / (stats.dailyGoal * 1.5)) * 100));

            return (
              <div key={idx} className="flex flex-col items-center justify-end h-44 gap-2 group">
                {/* Score Pill Tooltip */}
                <div className="text-[11px] font-mono font-bold text-emerald-400 transition-opacity">
                  {avg > 0 ? `${avg}점` : '-'}
                </div>

                {/* Bar */}
                <div className="w-full max-w-[48px] bg-slate-950 rounded-xl p-1 flex flex-col justify-end h-28 border border-slate-800 group-hover:border-slate-700 transition">
                  <div
                    className={`w-full rounded-lg transition-all duration-500 ${
                      count > 0
                        ? 'bg-gradient-to-t from-sky-600 to-sky-400 group-hover:from-sky-500 group-hover:to-sky-300'
                        : 'bg-slate-800/40'
                    }`}
                    style={{ height: `${count > 0 ? barHeightPct : 8}%` }}
                  />
                </div>

                {/* Count Badge */}
                <span className="text-xs font-bold text-white font-mono">{count}개</span>

                {/* Day Label */}
                <span className="text-[11px] text-slate-400 whitespace-nowrap text-center">
                  {day.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Topic-Based Learning Progress (기초 회화, 비즈니스, 여행, 토익/토플 시험) */}
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-sky-400" />
              <span>주제별 학습 진행률 &amp; 발음 실력 분석</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              기초 회화, 비즈니스, 여행, 토익/토플 시험 등 각 분야별 연습량과 발음 숙련도 현황입니다.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            {
              key: 'basic',
              title: '기초 회화',
              icon: '💬',
              desc: '일상 대화, 카페 주문, 스몰토크',
              badge: '필수 기초',
            },
            {
              key: 'business',
              title: '비즈니스 실전 영어',
              icon: '💼',
              desc: '미팅, 프레젠테이션, 일정 협상',
              badge: '직장인 필수',
            },
            {
              key: 'travel',
              title: '여행 & 공항 영어',
              icon: '✈️',
              desc: '공항, 호텔, 길찾기, 식당',
              badge: '해외 여행',
            },
            {
              key: 'exam',
              title: '시험 대비 (토익/토플/OPIc)',
              icon: '🎓',
              desc: '토스 Part 2/3/5, 토플 독립형, 오픽 롤플레이',
              badge: '스피킹 시험',
            },
            {
              key: 'korean_focus',
              title: '한국인 발음 취약점 정복',
              icon: '🔥',
              desc: 'R vs L, F vs P, TH 치간음, 연음',
              badge: '음성학 집중',
            },
            {
              key: 'idiom',
              title: '이디엄 & 원어민 슬랭',
              icon: '💡',
              desc: '자연스러운 구어체와 관용구',
              badge: '원어민 뉘앙스',
            },
          ].map((cat) => {
            const progress = stats.categoryMastery?.[cat.key] || {
              totalAttempts: 0,
              totalScore: 0,
              avgScore: 0,
              masteredCount: 0,
            };
            const catSentences = sentences.filter((s) => s.category === cat.key);
            const totalInCat = catSentences.length;

            return (
              <div
                key={cat.key}
                className="p-4 rounded-2xl bg-slate-950 border border-slate-800/90 flex flex-col justify-between gap-3 hover:border-slate-700 transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xl">{cat.icon}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {cat.badge}
                    </span>
                  </div>
                  <h4 className="font-bold text-white text-sm">{cat.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">{cat.desc}</p>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-400">발음 평균 점수</span>
                    <span className="text-lg font-bold font-mono text-white">
                      {progress.avgScore > 0 ? (
                        <span
                          className={
                            progress.avgScore >= 85
                              ? 'text-emerald-400'
                              : progress.avgScore >= 70
                              ? 'text-sky-400'
                              : 'text-amber-400'
                          }
                        >
                          {progress.avgScore}점
                        </span>
                      ) : (
                        <span className="text-slate-500 font-normal text-xs">학습 전</span>
                      )}
                    </span>
                  </div>

                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, progress.avgScore)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      연습: <strong className="text-slate-200">{progress.totalAttempts}회</strong>
                    </span>
                    <span>
                      90점 마스터: <strong className="text-emerald-400">{progress.masteredCount}개</strong>
                    </span>
                    <span>총 {totalInCat}문장</span>
                  </div>
                </div>

                {catSentences.length > 0 && (
                  <button
                    onClick={() => {
                      onSelectSentence(catSentences[0]);
                      onGoToPractice();
                    }}
                    className="w-full py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-sky-400 text-xs font-semibold border border-slate-800 hover:border-slate-700 transition flex items-center justify-center gap-1 cursor-pointer mt-1"
                  >
                    <span>이 주제 연습하기</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Korean Learner Phoneme Mastery Breakdown */}
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <span>한국인 핵심 취약 발음별 정복도</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            한국어 모국어 화자가 가장 어려워하는 음소와 연음 패턴에 대한 숙련도 분석입니다.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(stats.phonemeMastery).map(([phoneme, data]) => {
            const avg = data.totalAttempts > 0 ? data.avgScore : 0;
            const levelBadge =
              avg >= 90
                ? { text: '마스터', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' }
                : avg >= 75
                ? { text: '우수', color: 'text-sky-400 border-sky-500/30 bg-sky-500/10' }
                : avg >= 60
                ? { text: '발전 중', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' }
                : { text: '집중 연습 필요', color: 'text-rose-400 border-rose-500/30 bg-rose-500/10' };

            return (
              <div
                key={phoneme}
                className="p-4 rounded-2xl bg-slate-950 border border-slate-800/90 flex flex-col justify-between gap-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">{phoneme}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${levelBadge.color}`}>
                    {data.totalAttempts > 0 ? levelBadge.text : '미시도'}
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-slate-400">평균 점수</span>
                  <span className="text-xl font-extrabold font-mono text-white">
                    {avg > 0 ? `${avg}점` : '-'}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        avg >= 90 ? 'bg-emerald-500' : avg >= 75 ? 'bg-sky-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${avg}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>연습 횟수: {data.totalAttempts}회</span>
                    <span>{avg >= 90 ? '100% 목표 달성' : `${100 - avg}점 남음`}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Practice Attempts History Log */}
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-sky-400" />
              <span>최근 발음 연습 기록 히스토리</span>
            </h3>
            <p className="text-xs text-slate-400">
              최근 연습한 문장과 AI 피드백을 다시 확인하고 바로 재도전할 수 있습니다.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setHistoryFilter('all')}
              className={`px-3 py-1 rounded-lg transition ${
                historyFilter === 'all' ? 'bg-sky-500 text-white font-bold' : 'text-slate-400'
              }`}
            >
              전체 ({stats.history.length})
            </button>
            <button
              onClick={() => setHistoryFilter('high')}
              className={`px-3 py-1 rounded-lg transition ${
                historyFilter === 'high' ? 'bg-emerald-500 text-white font-bold' : 'text-slate-400'
              }`}
            >
              우수(85점 이상)
            </button>
            <button
              onClick={() => setHistoryFilter('low')}
              className={`px-3 py-1 rounded-lg transition ${
                historyFilter === 'low' ? 'bg-rose-500 text-white font-bold' : 'text-slate-400'
              }`}
            >
              보완(75점 미만)
            </button>
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs bg-slate-950/40 rounded-2xl border border-slate-800/80">
            아직 기록이 없습니다. 문장을 따라 말하며 첫 번째 발음 기록을 만들어보세요!
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHistory.slice(0, 15).map((item) => {
              const matchedSentence = sentences.find((s) => s.id === item.sentenceId);
              const dateFormatted = new Date(item.timestamp).toLocaleString('ko-KR', {
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500 font-mono">{dateFormatted}</span>
                      <span
                        className={`text-xs font-mono font-extrabold px-2 py-0.5 rounded-full border ${
                          item.overallScore >= 90
                            ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'
                            : item.overallScore >= 75
                            ? 'text-sky-400 border-sky-500/40 bg-sky-500/10'
                            : 'text-rose-400 border-rose-500/40 bg-rose-500/10'
                        }`}
                      >
                        {item.overallScore}점
                      </span>
                    </div>

                    <h4 className="text-sm sm:text-base font-bold text-white">{item.sentenceText}</h4>

                    <p className="text-xs text-sky-400/90 font-mono italic">
                      "{item.userTranscript}"
                    </p>

                    <p className="text-[11px] text-slate-400 line-clamp-1">💡 {item.coachFeedback}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {matchedSentence && (
                      <button
                        onClick={() => {
                          onSelectSentence(matchedSentence);
                          onGoToPractice();
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
                        <span>다시 연습</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Data Management & Personal Ownership */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-white">개인 학습 데이터 백업 및 복원</h4>
          <p className="text-xs text-slate-400 mt-0.5">
            모든 학습 통계와 오답 노트는 브라우저 로컬 저장소에 안전하게 보관됩니다.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition cursor-pointer"
          >
            <FileDown className="w-4 h-4 text-sky-400" />
            <span>데이터 내보내기</span>
          </button>

          <label className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition cursor-pointer">
            <FileUp className="w-4 h-4 text-emerald-400" />
            <span>데이터 가져오기</span>
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>

          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 text-xs font-semibold transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>데이터 초기화</span>
          </button>
        </div>
      </div>
    </div>
  );
};

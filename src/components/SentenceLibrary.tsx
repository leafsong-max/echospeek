import React, { useState } from 'react';
import {
  Search,
  Volume2,
  Bookmark,
  Sparkles,
  Play,
  Trash2,
  Flame,
  CheckCircle2,
  Filter,
  GraduationCap,
  Briefcase,
  Plane,
  MessageCircle,
  Lightbulb,
  Award,
} from 'lucide-react';
import { Sentence, Settings, UserStats } from '../types';
import { speakEnglish, stopSpeaking } from '../utils/speechUtils';
import { deleteCustomSentence, toggleBookmarkSentence } from '../utils/storage';

interface SentenceLibraryProps {
  sentences: Sentence[];
  onSelectSentence: (sentence: Sentence) => void;
  onRefreshSentences: () => void;
  stats: UserStats;
  onStatsUpdate: (stats: UserStats) => void;
  settings: Settings;
  onOpenCustomModal: () => void;
}

export const SentenceLibrary: React.FC<SentenceLibraryProps> = ({
  sentences,
  onSelectSentence,
  onRefreshSentences,
  stats,
  onStatsUpdate,
  settings,
  onOpenCustomModal,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubTopic, setSelectedSubTopic] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [playingId, setPlayingId] = useState<string | null>(null);

  const categories = [
    { id: 'all', label: '전체 문장', icon: '🌟' },
    { id: 'basic', label: '기초 회화', icon: '💬', badge: '필수 회화' },
    { id: 'business', label: '비즈니스 실전', icon: '💼', badge: '회의 & 협상' },
    { id: 'travel', label: '여행 & 공항', icon: '✈️', badge: '해외 여행' },
    { id: 'exam', label: '시험 대비 (토익/토플/OPIc)', icon: '🎓', badge: '스피킹 시험' },
    { id: 'korean_focus', label: '한국인 발음 정복', icon: '🔥', badge: '취약음소' },
    { id: 'idiom', label: '이디엄 & 원어민 표현', icon: '💡', badge: '구어체' },
    { id: 'custom', label: '나만의 문장', icon: '✏️', badge: 'AI/직접등록' },
  ];

  // Extract available subtopics for the selected category
  const relevantSentences = sentences.filter((s) => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'custom') return !!s.isCustom;
    return s.category === selectedCategory;
  });

  const availableSubTopics = Array.from(
    new Set(relevantSentences.map((s) => s.subTopic).filter(Boolean))
  ) as string[];

  // Filtering
  const filteredSentences = relevantSentences.filter((s) => {
    if (selectedSubTopic !== 'all' && s.subTopic !== selectedSubTopic) {
      return false;
    }

    if (selectedDifficulty !== 'all' && s.difficulty !== selectedDifficulty) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText =
        s.sentence.toLowerCase().includes(q) ||
        s.translation.toLowerCase().includes(q) ||
        s.phonemeFocus.toLowerCase().includes(q) ||
        (s.subTopic && s.subTopic.toLowerCase().includes(q)) ||
        (s.tags && s.tags.some((t) => t.toLowerCase().includes(q)));
      if (!matchText) return false;
    }

    return true;
  });

  const handlePlayAudio = (s: Sentence, e: React.MouseEvent) => {
    e.stopPropagation();
    if (playingId === s.id) {
      stopSpeaking();
      setPlayingId(null);
      return;
    }

    setPlayingId(s.id);
    speakEnglish(s.sentence, {
      rate: settings.speechRate || 0.85,
      lang: settings.accent || 'en-US',
      onEnd: () => setPlayingId(null),
    });
  };

  const handleToggleBookmark = (s: Sentence, e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = toggleBookmarkSentence(s.id);
    onStatsUpdate({
      ...stats,
      bookmarkedIds: newState
        ? [...stats.bookmarkedIds, s.id]
        : stats.bookmarkedIds.filter((id) => id !== s.id),
    });
  };

  const handleDelete = (s: Sentence, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('이 커스텀 문장을 삭제하시겠습니까?')) {
      deleteCustomSentence(s.id);
      onRefreshSentences();
    }
  };

  // Category stats summary
  const currentCategoryMastery = selectedCategory !== 'all' ? stats.categoryMastery?.[selectedCategory] : null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-indigo-950/70 via-slate-900 to-sky-950/70 p-6 rounded-3xl border border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <span>주제별 문장 도서관</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
              총 {sentences.length}개 문장
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            기초 회화, 비즈니스, 해외 여행, 토익/토플 스피킹 시험 대비, 취약 발음 정복 등 테마별로 학습하세요.
          </p>
        </div>

        <button
          onClick={onOpenCustomModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition cursor-pointer self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4" />
          <span>AI 맞춤 문장 자동 생성하기</span>
        </button>
      </div>

      {/* Main Categories Navigation Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                setSelectedSubTopic('all');
              }}
              className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 border transition cursor-pointer text-center relative ${
                isSelected
                  ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-500/20 font-bold'
                  : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <span className="text-xl">{cat.icon}</span>
              <span className="text-xs leading-tight">{cat.label}</span>
              {cat.badge && (
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-full border ${
                    isSelected
                      ? 'bg-white/20 text-white border-white/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {cat.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Category Progress Stats Banner (if category has been practiced) */}
      {currentCategoryMastery && currentCategoryMastery.totalAttempts > 0 && (
        <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-sky-400" />
            <span className="font-bold text-white">이 주제 학습 데이터 기록:</span>
            <span className="text-slate-300">
              총 {currentCategoryMastery.totalAttempts}회 연습 / 평균 {currentCategoryMastery.avgScore}점
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-400 font-semibold">
              90점 이상 마스터: {currentCategoryMastery.masteredCount}회
            </span>
          </div>
        </div>
      )}

      {/* Subtopic pills if available */}
      {availableSubTopics.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <span className="text-xs text-slate-400 font-semibold whitespace-nowrap pl-1">
            상세 코스:
          </span>
          <button
            onClick={() => setSelectedSubTopic('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer border ${
              selectedSubTopic === 'all'
                ? 'bg-sky-600 text-white border-sky-500'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            전체 ({relevantSentences.length})
          </button>
          {availableSubTopics.map((topic) => (
            <button
              key={topic}
              onClick={() => setSelectedSubTopic(topic)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer border ${
                selectedSubTopic === topic
                  ? 'bg-sky-600 text-white border-sky-500'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              {topic}
            </button>
          ))}
        </div>
      )}

      {/* Search & Level Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="문장, 한글 번역, 시험 파트(토익/토플/오픽), 발음 포인트 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            <option value="all">모든 난이도</option>
            <option value="Beginner">초급 (Beginner - A1/A2)</option>
            <option value="Intermediate">중급 (Intermediate - B1/B2)</option>
            <option value="Advanced">고급 (Advanced - C1)</option>
          </select>
        </div>
      </div>

      {/* Sentences List Grid */}
      {filteredSentences.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800 space-y-3">
          <p className="text-slate-400 text-sm">해당 조건에 맞는 문장이 없습니다.</p>
          <button
            onClick={() => {
              setSelectedCategory('all');
              setSelectedSubTopic('all');
              setSelectedDifficulty('all');
              setSearchQuery('');
            }}
            className="text-xs text-sky-400 hover:underline cursor-pointer"
          >
            필터 초기화
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSentences.map((s) => {
            const isBookmarked = stats.bookmarkedIds.includes(s.id);
            const isPlaying = playingId === s.id;

            return (
              <div
                key={s.id}
                onClick={() => onSelectSentence(s)}
                className="group p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-sky-500/50 transition cursor-pointer flex flex-col justify-between gap-4 shadow-sm hover:shadow-lg"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        {s.categoryName}
                      </span>
                      {s.subTopic && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-300 border border-sky-500/20">
                          {s.subTopic}
                        </span>
                      )}
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                        {s.difficulty}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1">
                        <Flame className="w-3 h-3 text-amber-400" />
                        {s.phonemeFocus}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleToggleBookmark(s, e)}
                        className={`p-1.5 rounded-lg border transition ${
                          isBookmarked
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : 'text-slate-500 border-transparent hover:text-slate-300'
                        }`}
                        title={isBookmarked ? '북마크 해제' : '오답노트에 보관'}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-rose-400' : ''}`} />
                      </button>

                      {s.isCustom && (
                        <button
                          onClick={(e) => handleDelete(s, e)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                          title="문장 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* English Sentence */}
                  <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-sky-300 transition leading-snug">
                    {s.sentence}
                  </h3>

                  {/* Korean Translation */}
                  <p className="text-xs sm:text-sm text-slate-400">{s.translation}</p>

                  {/* Pronunciation Tip Preview */}
                  <p className="text-[11px] text-amber-300/80 bg-amber-500/5 p-2 rounded-xl border border-amber-500/15 line-clamp-2">
                    💡 {s.pronunciationTip}
                  </p>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs">
                  <button
                    onClick={(e) => handlePlayAudio(s, e)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition ${
                      isPlaying
                        ? 'bg-sky-500 text-white border-sky-400'
                        : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>{isPlaying ? '재생 중' : '발음 듣기'}</span>
                  </button>

                  <div className="flex items-center gap-1 text-sky-400 font-semibold group-hover:translate-x-1 transition-transform">
                    <span>따라 말하며 교정하기</span>
                    <Play className="w-3 h-3 fill-sky-400" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

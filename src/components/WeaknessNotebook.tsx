import React, { useState } from 'react';
import {
  BookmarkCheck,
  RotateCcw,
  Volume2,
  Trash2,
  CheckCircle2,
  Flame,
  Award,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Sentence, Settings, UserStats } from '../types';
import { speakEnglish, stopSpeaking } from '../utils/speechUtils';
import { toggleBookmarkSentence } from '../utils/storage';

interface WeaknessNotebookProps {
  sentences: Sentence[];
  onSelectSentence: (sentence: Sentence) => void;
  stats: UserStats;
  onStatsUpdate: (stats: UserStats) => void;
  settings: Settings;
  onGoToPractice: () => void;
}

export const WeaknessNotebook: React.FC<WeaknessNotebookProps> = ({
  sentences,
  onSelectSentence,
  stats,
  onStatsUpdate,
  settings,
  onGoToPractice,
}) => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [selectedPhoneme, setSelectedPhoneme] = useState<string>('all');

  // Bookmarked sentences
  const bookmarkedSentences = sentences.filter((s) => stats.bookmarkedIds.includes(s.id));

  // Phonemes list from bookmarks
  const phonemes = Array.from(new Set(bookmarkedSentences.map((s) => s.phonemeFocus))).filter(Boolean);

  const filtered = bookmarkedSentences.filter((s) => {
    if (selectedPhoneme !== 'all' && s.phonemeFocus !== selectedPhoneme) return false;
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

  const handleRemove = (s: Sentence, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleBookmarkSentence(s.id);
    onStatsUpdate({
      ...stats,
      bookmarkedIds: stats.bookmarkedIds.filter((id) => id !== s.id),
    });
  };

  const handlePractice = (s: Sentence) => {
    onSelectSentence(s);
    onGoToPractice();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-rose-950/60 via-slate-900 to-indigo-950/60 p-6 rounded-3xl border border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BookmarkCheck className="w-6 h-6 text-rose-400" />
            <h2 className="text-xl sm:text-2xl font-bold text-white">나의 발음 취약점 &amp; 오답 노트</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            발음 점수가 낮았거나 다시 복습하고 싶은 문장들이 모여있습니다. 취약한 음소를 집중적으로 훈련해보세요.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-900/80 rounded-2xl border border-slate-800 text-center">
            <span className="text-[11px] text-slate-400 block">집중 복습 문장</span>
            <span className="text-xl font-bold text-rose-400 font-mono">
              {bookmarkedSentences.length}
              <span className="text-xs text-slate-400 font-normal">개</span>
            </span>
          </div>

          <div className="p-3 bg-slate-900/80 rounded-2xl border border-slate-800 text-center">
            <span className="text-[11px] text-slate-400 block">완전 정복 누적</span>
            <span className="text-xl font-bold text-emerald-400 font-mono">
              {stats.totalMastered}
              <span className="text-xs text-slate-400 font-normal">개</span>
            </span>
          </div>
        </div>
      </div>

      {/* Phoneme filter pills */}
      {phonemes.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setSelectedPhoneme('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer border ${
              selectedPhoneme === 'all'
                ? 'bg-rose-500 text-white border-rose-400'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            전체 ({bookmarkedSentences.length})
          </button>
          {phonemes.map((ph) => (
            <button
              key={ph}
              onClick={() => setSelectedPhoneme(ph)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer border ${
                selectedPhoneme === ph
                  ? 'bg-rose-500 text-white border-rose-400'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              {ph}
            </button>
          ))}
        </div>
      )}

      {/* Bookmarked Sentences Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-slate-800 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">오답 노트가 비어있습니다!</h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              연습 중 어려운 문장의 북마크 아이콘을 누르면 이곳에 모아두고 집중 반복할 수 있습니다.
            </p>
          </div>
          <button
            onClick={onGoToPractice}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition shadow-lg shadow-sky-500/20 cursor-pointer"
          >
            <span>섀도잉 연습하러 가기</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((s) => {
            const isPlaying = playingId === s.id;
            return (
              <div
                key={s.id}
                onClick={() => handlePractice(s)}
                className="p-5 rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-rose-500/50 transition cursor-pointer flex flex-col justify-between gap-4 group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1">
                      <Flame className="w-3 h-3 text-amber-400" />
                      {s.phonemeFocus}
                    </span>

                    <button
                      onClick={(e) => handleRemove(s, e)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-slate-800 transition"
                      title="취약점 정복 완료 (노트에서 제거)"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-rose-300 transition leading-snug">
                    {s.sentence}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-400">{s.translation}</p>

                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs">
                    <span className="font-bold text-amber-300 block mb-0.5">교정 팁:</span>
                    <p className="text-[11px] text-amber-100/90 leading-relaxed font-normal">
                      {s.pronunciationTip}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
                  <button
                    onClick={(e) => handlePlayAudio(s, e)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition ${
                      isPlaying
                        ? 'bg-rose-500 text-white border-rose-400'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                    }`}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>{isPlaying ? '재생 중' : '발음 듣기'}</span>
                  </button>

                  <button
                    onClick={() => handlePractice(s)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-md shadow-rose-600/30 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>재도전하기</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

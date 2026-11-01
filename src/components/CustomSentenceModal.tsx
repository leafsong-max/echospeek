import React, { useState } from 'react';
import { X, Sparkles, Plus, Check, Loader2, BookOpen } from 'lucide-react';
import { Sentence } from '../types';
import { getStoredPasscode, saveCustomSentence } from '../utils/storage';

interface CustomSentenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdded: (sentence: Sentence) => void;
}

export const CustomSentenceModal: React.FC<CustomSentenceModalProps> = ({
  isOpen,
  onClose,
  onAdded,
}) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'manual'>('ai');

  // AI Generator state
  const [aiTopic, setAiTopic] = useState('');
  const [aiLevel, setAiLevel] = useState('Intermediate');
  const [aiPhoneme, setAiPhoneme] = useState('General natural rhythm and linking');
  const [aiCategory, setAiCategory] = useState<'basic' | 'business' | 'travel' | 'exam' | 'custom'>('exam');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSentences, setGeneratedSentences] = useState<Sentence[]>([]);
  const [addedIds, setAddedIds] = useState<string[]>([]);

  // Manual input state
  const [manualSentence, setManualSentence] = useState('');
  const [manualTranslation, setManualTranslation] = useState('');
  const [manualCategory, setManualCategory] = useState<'basic' | 'business' | 'travel' | 'exam' | 'custom'>('basic');
  const [manualPhoneme, setManualPhoneme] = useState('R/L Distinction');
  const [manualDifficulty, setManualDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [manualTip, setManualTip] = useState('');

  if (!isOpen) return null;

  const presets = [
    { label: '🎓 토익스피킹 Part 2 사진 묘사', topic: '토익스피킹 Part 2 사무실 및 거리 사진 묘사 템플릿', cat: 'exam' as const },
    { label: '🎓 토익스피킹 Part 5 해결책 제안', topic: '토익스피킹 Part 5 고객 불만 및 해결책 제시', cat: 'exam' as const },
    { label: '🎓 토플 독립형 스피킹 논리', topic: '토플 스피킹 독립형 학생 자립심과 경험의 중요성 논리 전개', cat: 'exam' as const },
    { label: '🎓 OPIc 11번 문의 롤플레이', topic: 'OPIc 11번 롤플레이 호텔 및 공연 티켓 문의 질문', cat: 'exam' as const },
    { label: '💼 비즈니스 회의 오프닝 & 일정', topic: '비즈니스 프로젝트 킥오프 회의 및 마일스톤 일정 협상', cat: 'business' as const },
    { label: '✈️ 해외여행 입국심사 & 호텔', topic: '해외여행 공항 입국심사 및 호텔 룸서비스 요청', cat: 'travel' as const },
    { label: '💬 기초 일상 대화 & 카페 주문', topic: '카페에서 커스텀 음료 주문 및 친구와 주말 약속 잡기', cat: 'basic' as const },
  ];

  const handleGenerateAI = async () => {
    if (!aiTopic.trim()) {
      alert('연습하고 싶은 상황이나 주제를 입력해주세요.');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch('/api/generate-sentences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-passcode': getStoredPasscode(),
        },
        body: JSON.stringify({
          topic: aiTopic,
          level: aiLevel,
          phonemeFocus: aiPhoneme,
          count: 4,
        }),
      });

      if (!res.ok) throw new Error('Generation failed');
      const data = await res.json();

      const catNameMap: Record<string, string> = {
        exam: '시험 대비 (토익/토플/OPIc)',
        business: '비즈니스 실전',
        travel: '여행 영어',
        basic: '기초 회화',
        custom: 'AI 생성 맞춤 문장',
      };

      const mapped: Sentence[] = (data.sentences || []).map((s: any, idx: number) => ({
        id: `ai-gen-${Date.now()}-${idx}`,
        sentence: s.sentence,
        translation: s.translation,
        ipa: s.ipa || '',
        category: aiCategory,
        categoryName: catNameMap[aiCategory] || 'AI 맞춤 문장',
        subTopic: s.situationContext || aiTopic,
        difficulty: s.difficulty || 'Intermediate',
        phonemeFocus: s.phonemeFocus || 'General',
        pronunciationTip: s.pronunciationTip || '강세와 연음에 유의하여 따라 말해보세요.',
        situationContext: s.situationContext || aiTopic,
        isCustom: true,
      }));

      setGeneratedSentences(mapped);
    } catch (e: any) {
      alert('문장 생성에 실패했습니다: ' + e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddSentence = (s: Sentence) => {
    saveCustomSentence(s);
    setAddedIds((prev) => [...prev, s.id]);
    onAdded(s);
  };

  const handleAddManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSentence.trim() || !manualTranslation.trim()) {
      alert('문장과 번역을 모두 입력해주세요.');
      return;
    }

    const catNameMap: Record<string, string> = {
      exam: '시험 대비 (토익/토플/OPIc)',
      business: '비즈니스 실전',
      travel: '여행 영어',
      basic: '기초 회화',
      custom: '나만의 문장',
    };

    const newS: Sentence = {
      id: `custom-manual-${Date.now()}`,
      sentence: manualSentence.trim(),
      translation: manualTranslation.trim(),
      ipa: '',
      category: manualCategory,
      categoryName: catNameMap[manualCategory] || '나만의 문장',
      subTopic: '직접 등록 문장',
      difficulty: manualDifficulty,
      phonemeFocus: manualPhoneme,
      pronunciationTip: manualTip.trim() || '단어의 강세와 연음을 살려 자연스럽게 발음해보세요.',
      isCustom: true,
    };

    saveCustomSentence(newS);
    onAdded(newS);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-sky-400" />
            <span>새로운 섀도잉 문장 추가하기</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Gemini AI로 원하는 상황별 영어 문장을 자동 생성하거나, 직접 문장을 등록해보세요.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-800 mb-6">
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'ai'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>AI 맞춤 문장 자동 생성</span>
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'manual'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>직접 문장 입력 등록</span>
          </button>
        </div>

        {/* AI Generator Tab */}
        {activeTab === 'ai' && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  원하는 상황 / 대화 주제
                </label>
                <span className="text-[11px] text-slate-400">아래 추천 주제를 클릭해보세요</span>
              </div>
              <input
                type="text"
                placeholder="예: 토익스피킹 Part 2 사진 묘사, 공항에서 짐 분실했을 때, 비즈니스 미팅"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 mb-2"
              />

              {/* Preset Chips */}
              <div className="flex flex-wrap gap-1.5">
                {presets.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setAiTopic(p.topic);
                      setAiCategory(p.cat);
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">주제 분류</label>
                <select
                  value={aiCategory}
                  onChange={(e) => setAiCategory(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  <option value="exam">🎓 시험 대비 (토익/토플)</option>
                  <option value="business">💼 비즈니스 영어</option>
                  <option value="travel">✈️ 여행 &amp; 공항</option>
                  <option value="basic">💬 기초 회화</option>
                  <option value="custom">✏️ 나만의 문장</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">난이도</label>
                <select
                  value={aiLevel}
                  onChange={(e) => setAiLevel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  <option value="Beginner">초급 (A1-A2) - 짧고 직관적인 문장</option>
                  <option value="Intermediate">중급 (B1-B2) - 자연스러운 일상 구어체</option>
                  <option value="Advanced">고급 (C1) - 이디엄 및 전문 비즈니스</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  취약 음소 집중 훈련
                </label>
                <select
                  value={aiPhoneme}
                  onChange={(e) => setAiPhoneme(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  <option value="General natural rhythm and linking">자연스러운 리듬 &amp; 연음</option>
                  <option value="R vs L distinction">R vs L 발음 대조 정복</option>
                  <option value="F vs P and V vs B sounds">F vs P / V vs B 마찰음</option>
                  <option value="TH sounds [θ] and [ð]">TH 치간음 ([θ], [ð])</option>
                  <option value="Flap T sound">플랩 T ([ɾ] 소리)</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleGenerateAI}
              disabled={isGenerating}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI 맞춤 문장 생성 중...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>맞춤 문장 4개 생성하기</span>
                </>
              )}
            </button>

            {/* Generated results list */}
            {generatedSentences.length > 0 && (
              <div className="mt-6 space-y-3 pt-4 border-t border-slate-800">
                <span className="text-xs font-bold text-sky-400 block">
                  생성된 문장 ({generatedSentences.length}개)
                </span>
                {generatedSentences.map((s) => {
                  const isAdded = addedIds.includes(s.id);
                  return (
                    <div
                      key={s.id}
                      className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            {s.phonemeFocus}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white">{s.sentence}</h4>
                        <p className="text-xs text-slate-400">{s.translation}</p>
                        <p className="text-[11px] text-amber-300/80">💡 {s.pronunciationTip}</p>
                      </div>

                      <button
                        onClick={() => handleAddSentence(s)}
                        disabled={isAdded}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition flex items-center gap-1 ${
                          isAdded
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-sky-600 hover:bg-sky-500 text-white cursor-pointer shadow-md'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>추가됨</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>내 서재에 추가</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Manual Input Tab */}
        {activeTab === 'manual' && (
          <form onSubmit={handleAddManual} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                영어 문장 (English Sentence)
              </label>
              <input
                type="text"
                placeholder="예: I would appreciate it if you could review this proposal."
                value={manualSentence}
                onChange={(e) => setManualSentence(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                한글 번역 (Korean Translation)
              </label>
              <input
                type="text"
                placeholder="예: 이 제안서를 검토해 주시면 대단히 감사하겠습니다."
                value={manualTranslation}
                onChange={(e) => setManualTranslation(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">주제 분류</label>
                <select
                  value={manualCategory}
                  onChange={(e) => setManualCategory(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  <option value="exam">🎓 시험 대비 (토익/토플)</option>
                  <option value="business">💼 비즈니스 영어</option>
                  <option value="travel">✈️ 여행 &amp; 공항</option>
                  <option value="basic">💬 기초 회화</option>
                  <option value="custom">✏️ 나만의 문장</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">난이도</label>
                <select
                  value={manualDifficulty}
                  onChange={(e) => setManualDifficulty(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  <option value="Beginner">초급</option>
                  <option value="Intermediate">중급</option>
                  <option value="Advanced">고급</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  발음 포인트 태그
                </label>
                <input
                  type="text"
                  placeholder="예: R vs L, 연음, 플랩 T"
                  value={manualPhoneme}
                  onChange={(e) => setManualPhoneme(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                발음 주의사항 / 메모 (선택)
              </label>
              <textarea
                rows={2}
                placeholder="예: appreciate의 강세는 2음절 pre에 두고, would appreciate는 [우더프리시에이트]로 연음"
                value={manualTip}
                onChange={(e) => setManualTip(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-sm shadow-lg shadow-sky-500/30 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>문장 등록하고 완료</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

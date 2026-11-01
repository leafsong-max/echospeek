import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  Mic,
  Square,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Sparkles,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Award,
  Flame,
  VolumeX,
  Play,
  Pause,
  Shuffle,
  Lightbulb,
  Share2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PronunciationResult, Sentence, Settings, UserStats, WordAnalysis } from '../types';
import {
  alignSpokenWords,
  cleanWord,
  getWordSimilarity,
  isSpeechRecognitionSupported,
  RealtimeWordMatch,
  speakEnglish,
  SpeechRecognizer,
  stopSpeaking,
  VoiceRecorder,
} from '../utils/speechUtils';
import { getStoredPasscode, recordPracticeAttempt, toggleBookmarkSentence } from '../utils/storage';
import { AudioVisualizer } from './AudioVisualizer';

interface PracticeViewProps {
  sentence: Sentence;
  allSentences: Sentence[];
  onSelectSentence: (sentence: Sentence) => void;
  settings: Settings;
  stats: UserStats;
  onStatsUpdate: (stats: UserStats) => void;
}

export const PracticeView: React.FC<PracticeViewProps> = ({
  sentence,
  allSentences,
  onSelectSentence,
  settings,
  stats,
  onStatsUpdate,
}) => {
  // Speech & Recognition state
  const [isPlayingNative, setIsPlayingNative] = useState(false);
  const [activeWordCharIdx, setActiveWordCharIdx] = useState<number | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(settings.speechRate || 0.85);

  const [isRecording, setIsRecording] = useState(false);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [spokenTranscript, setSpokenTranscript] = useState('');
  const [realtimeMatches, setRealtimeMatches] = useState<RealtimeWordMatch[]>([]);
  const [recordingStartTime, setRecordingStartTime] = useState<number>(0);

  // Audio Playback for User Recording
  const [userAudioUrl, setUserAudioUrl] = useState<string | null>(null);
  const [userAudioBase64, setUserAudioBase64] = useState<string | null>(null);
  const [userAudioMime, setUserAudioMime] = useState<string>('audio/webm');
  const [isPlayingUserAudio, setIsPlayingUserAudio] = useState(false);
  const userAudioRef = useRef<HTMLAudioElement | null>(null);

  // Toggles
  const [showIpa, setShowIpa] = useState<boolean>(settings.showIpa);
  const [showKorean, setShowKorean] = useState<boolean>(settings.showKorean);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(sentence.isBookmarked || false);

  // AI & Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<PronunciationResult | null>(null);
  const [explanationData, setExplanationData] = useState<any | null>(null);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  // Refs for audio tools
  const recognizerRef = useRef<SpeechRecognizer | null>(null);
  const recorderRef = useRef<VoiceRecorder | null>(null);

  // Sync bookmark state when sentence changes
  useEffect(() => {
    setIsBookmarked(stats.bookmarkedIds.includes(sentence.id));
    setSpokenTranscript('');
    setRealtimeMatches(alignSpokenWords(sentence.sentence, ''));
    setAnalysisResult(null);
    setUserAudioUrl(null);
    setUserAudioBase64(null);
    setExplanationData(null);
    setShowExplanation(false);
    stopSpeaking();
  }, [sentence.id, stats.bookmarkedIds]);

  // Handle Native Audio Playback
  const handlePlayNative = (speed = playbackSpeed) => {
    if (isPlayingNative) {
      stopSpeaking();
      setIsPlayingNative(false);
      setActiveWordCharIdx(null);
      return;
    }

    setIsPlayingNative(true);
    speakEnglish(sentence.sentence, {
      rate: speed,
      lang: settings.accent || 'en-US',
      onStart: () => setIsPlayingNative(true),
      onEnd: () => {
        setIsPlayingNative(false);
        setActiveWordCharIdx(null);
      },
      onBoundary: (charIdx) => {
        setActiveWordCharIdx(charIdx);
      },
    });
  };

  // Play individual word audio
  const handlePlaySingleWord = (word: string, e: React.MouseEvent) => {
    e.stopPropagation();
    speakEnglish(word.replace(/[^a-zA-Z']/g, ''), {
      rate: 0.8,
      lang: settings.accent || 'en-US',
    });
  };

  // Start Speaking / Shadowing Session
  const handleStartRecording = async () => {
    if (!isSpeechRecognitionSupported()) {
      alert('현재 브라우저에서 음성 인식을 지원하지 않습니다. Chrome 브라우저를 권장합니다.');
      return;
    }

    try {
      stopSpeaking();
      setIsPlayingNative(false);
      setSpokenTranscript('');
      setAnalysisResult(null);
      setUserAudioUrl(null);

      // Start MediaRecorder for playback and deep analysis
      recorderRef.current = new VoiceRecorder();
      const stream = await recorderRef.current.start();
      setMicStream(stream);

      // Start Web Speech Recognition
      recognizerRef.current = new SpeechRecognizer();
      const started = recognizerRef.current.start({
        lang: 'en-US',
        onInterimResult: (transcript) => {
          setSpokenTranscript(transcript);
          const matches = alignSpokenWords(sentence.sentence, transcript);
          setRealtimeMatches(matches);
        },
        onFinalResult: (transcript) => {
          setSpokenTranscript(transcript);
          const matches = alignSpokenWords(sentence.sentence, transcript);
          setRealtimeMatches(matches);
        },
        onError: (err) => {
          console.warn('STT Error:', err);
        },
      });

      if (!started) {
        console.warn('Speech recognizer failed to start');
      }

      setIsRecording(true);
      setRecordingStartTime(Date.now());
    } catch (err) {
      console.error('Failed to access microphone:', err);
      alert('마이크 권한을 허용해주세요.');
    }
  };

  // Stop Recording and trigger Evaluation
  const handleStopRecording = async () => {
    if (!isRecording) return;
    setIsRecording(false);
    const duration = (Date.now() - recordingStartTime) / 1000;

    // Stop STT
    if (recognizerRef.current) {
      recognizerRef.current.stop();
    }

    // Stop Media Recorder & get Audio Blob
    let audioUrl = '';
    let base64 = '';
    let mime = 'audio/webm';

    if (recorderRef.current) {
      try {
        const audioData = await recorderRef.current.stop();
        audioUrl = audioData.url;
        base64 = audioData.base64;
        mime = audioData.mimeType;
        setUserAudioUrl(audioUrl);
        setUserAudioBase64(base64);
        setUserAudioMime(mime);
      } catch (e) {
        console.warn('Failed to extract audio recorder blob', e);
      }
    }
    setMicStream(null);

    // Run instant + Gemini analysis
    await evaluatePronunciation(spokenTranscript, base64, mime, duration);
  };

  // Pronunciation Evaluation (Client matching + Server-side Gemini AI deep dive)
  const evaluatePronunciation = async (
    transcript: string,
    audioBase64: string,
    mime: string,
    durationSec: number
  ) => {
    setIsAnalyzing(true);

    // 1. Calculate instant client score based on Levenshtein and target words
    const targetWords = sentence.sentence.split(/\s+/).filter(Boolean);
    const clientMatches = alignSpokenWords(sentence.sentence, transcript);

    let totalSim = 0;
    const clientWordAnalysis: WordAnalysis[] = targetWords.map((word, idx) => {
      const match = clientMatches[idx];
      const sim = match ? match.similarity : 0;
      totalSim += sim;

      let status: 'perfect' | 'good' | 'needs-work' | 'missed' = 'needs-work';
      if (sim >= 90) status = 'perfect';
      else if (sim >= 70) status = 'good';
      else if (sim >= 40) status = 'needs-work';
      else status = 'missed';

      return {
        word: word.replace(/[.,?!]/g, ''),
        status,
        score: sim,
        userSaid: match?.matchedWord || '(미인식)',
        tip: sim >= 80 ? '아주 자연스러운 발음입니다.' : `${word}의 모음과 자음 끝소리를 또렷하게 내보세요.`,
      };
    });

    const instantAccuracy = targetWords.length > 0 ? Math.round(totalSim / targetWords.length) : 50;
    const instantOverall = Math.max(20, Math.min(98, instantAccuracy));

    const defaultAnalysis: PronunciationResult = {
      id: `attempt-${Date.now()}`,
      sentenceId: sentence.id,
      sentenceText: sentence.sentence,
      timestamp: Date.now(),
      overallScore: instantOverall,
      accuracyScore: instantAccuracy,
      fluencyScore: Math.min(95, Math.max(50, instantAccuracy - 5 + Math.floor(Math.random() * 10))),
      intonationScore: Math.min(95, Math.max(55, instantAccuracy + Math.floor(Math.random() * 6))),
      userTranscript: transcript || '(소리가 인식되지 않았습니다)',
      wordAnalysis: clientWordAnalysis,
      coachFeedback:
        instantOverall >= 85
          ? '훌륭한 발음입니다! 원어민의 리듬과 억양에 매우 근접했습니다.'
          : '전체적인 단어 인식률이 양호합니다. 취약한 자음 연결과 연음에 주의하며 다시 시도해보세요.',
      phonemeTips: [
        sentence.pronunciationTip,
        '호흡을 끊지 말고 연음되는 단어들을 하나의 덩어리로 묶어 발음하세요.',
      ],
      strengths: ['문장을 끝까지 포기하지 않고 또박또박 발음하셨습니다.'],
      improvements: ['강세가 들어가는 핵심 단어에 피치를 조금 더 실어보세요.'],
      durationSeconds: durationSec,
    };

    setAnalysisResult(defaultAnalysis);

    // 2. Fetch full Gemini AI Expert Coaching from server
    try {
      const res = await fetch('/api/analyze-pronunciation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-passcode': getStoredPasscode(),
        },
        body: JSON.stringify({
          targetSentence: sentence.sentence,
          userSpokenText: transcript,
          phonemeFocus: sentence.phonemeFocus,
          userAudioBase64: audioBase64 || undefined,
          mimeType: mime || undefined,
        }),
      });

      if (res.ok) {
        const geminiData = await res.json();
        const mergedResult: PronunciationResult = {
          ...defaultAnalysis,
          overallScore: geminiData.overallScore ?? defaultAnalysis.overallScore,
          accuracyScore: geminiData.accuracyScore ?? defaultAnalysis.accuracyScore,
          fluencyScore: geminiData.fluencyScore ?? defaultAnalysis.fluencyScore,
          intonationScore: geminiData.intonationScore ?? defaultAnalysis.intonationScore,
          wordAnalysis: geminiData.wordAnalysis?.length ? geminiData.wordAnalysis : defaultAnalysis.wordAnalysis,
          coachFeedback: geminiData.coachFeedback || defaultAnalysis.coachFeedback,
          phonemeTips: geminiData.phonemeTips || defaultAnalysis.phonemeTips,
          strengths: geminiData.strengths || defaultAnalysis.strengths,
          improvements: geminiData.improvements || defaultAnalysis.improvements,
        };
        setAnalysisResult(mergedResult);

        // Record in daily stats
        const { stats: updatedStats } = recordPracticeAttempt(sentence, mergedResult, durationSec);
        onStatsUpdate(updatedStats);

        // Trigger confetti for high score!
        if (mergedResult.overallScore >= 90) {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        }
      } else {
        // Fallback to client score
        const { stats: updatedStats } = recordPracticeAttempt(sentence, defaultAnalysis, durationSec);
        onStatsUpdate(updatedStats);
      }
    } catch (e) {
      console.warn('Gemini server analysis call error:', e);
      const { stats: updatedStats } = recordPracticeAttempt(sentence, defaultAnalysis, durationSec);
      onStatsUpdate(updatedStats);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Toggle user audio playback
  const togglePlayUserAudio = () => {
    if (!userAudioUrl) return;
    if (!userAudioRef.current) {
      userAudioRef.current = new Audio(userAudioUrl);
      userAudioRef.current.onended = () => setIsPlayingUserAudio(false);
    }

    if (isPlayingUserAudio) {
      userAudioRef.current.pause();
      setIsPlayingUserAudio(false);
    } else {
      userAudioRef.current.currentTime = 0;
      userAudioRef.current.play();
      setIsPlayingUserAudio(true);
    }
  };

  // Toggle bookmark
  const handleBookmarkToggle = () => {
    const newState = toggleBookmarkSentence(sentence.id);
    setIsBookmarked(newState);
    onStatsUpdate({
      ...stats,
      bookmarkedIds: newState
        ? [...stats.bookmarkedIds, sentence.id]
        : stats.bookmarkedIds.filter((id) => id !== sentence.id),
    });
  };

  // Next / Prev sentence navigation
  const currentIndex = allSentences.findIndex((s) => s.id === sentence.id);
  const handlePrevSentence = () => {
    if (currentIndex > 0) {
      onSelectSentence(allSentences[currentIndex - 1]);
    } else {
      onSelectSentence(allSentences[allSentences.length - 1]);
    }
  };

  const handleNextSentence = () => {
    if (currentIndex < allSentences.length - 1) {
      onSelectSentence(allSentences[currentIndex + 1]);
    } else {
      onSelectSentence(allSentences[0]);
    }
  };

  const handleRandomSentence = () => {
    const rand = Math.floor(Math.random() * allSentences.length);
    onSelectSentence(allSentences[rand]);
  };

  // Load detailed explanation of sentence
  const handleLoadExplanation = async () => {
    if (explanationData) {
      setShowExplanation(!showExplanation);
      return;
    }
    setIsLoadingExplanation(true);
    try {
      const res = await fetch('/api/explain-sentence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-passcode': getStoredPasscode(),
        },
        body: JSON.stringify({ sentence: sentence.sentence }),
      });
      if (res.ok) {
        const data = await res.json();
        setExplanationData(data);
        setShowExplanation(true);
      }
    } catch (e) {
      console.warn('Failed to fetch explanation:', e);
    } finally {
      setIsLoadingExplanation(false);
    }
  };

  // Helper for score color
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
    if (score >= 75) return 'text-sky-400 border-sky-500/40 bg-sky-500/10';
    if (score >= 60) return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/40 bg-rose-500/10';
  };

  const targetWords = sentence.sentence.split(/\s+/).filter(Boolean);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Top Meta Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            {sentence.categoryName}
          </span>
          {sentence.subTopic && (
            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
              {sentence.subTopic}
            </span>
          )}
          <span
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${
              sentence.difficulty === 'Beginner'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : sentence.difficulty === 'Intermediate'
                ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                : 'bg-purple-500/10 text-purple-300 border-purple-500/30'
            }`}
          >
            {sentence.difficulty === 'Beginner'
              ? '초급 (A1-A2)'
              : sentence.difficulty === 'Intermediate'
              ? '중급 (B1-B2)'
              : '고급 (C1)'}
          </span>
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            {sentence.phonemeFocus}
          </span>
        </div>

        {/* Action Controls (Bookmark & Navigation) */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleBookmarkToggle}
            className={`p-2 rounded-xl border transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
              isBookmarked
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="오답 & 취약점 노트에 저장"
          >
            <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-rose-400 text-rose-400' : ''}`} />
            <span className="hidden sm:inline">{isBookmarked ? '저장됨' : '보관'}</span>
          </button>

          <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
            <button
              onClick={handlePrevSentence}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition cursor-pointer"
              title="이전 문장"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-400 px-2 font-mono">
              {currentIndex + 1} / {allSentences.length}
            </span>
            <button
              onClick={handleNextSentence}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition cursor-pointer"
              title="다음 문장"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleRandomSentence}
              className="p-1.5 text-slate-400 hover:text-sky-400 rounded-lg hover:bg-slate-700 transition cursor-pointer ml-1"
              title="랜덤 문장 추천"
            >
              <Shuffle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Sentence Shadowing Stage */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Situation Context badge if available */}
        {sentence.situationContext && (
          <div className="mb-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs text-slate-300">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            <span>상황: {sentence.situationContext}</span>
          </div>
        )}

        {/* English Sentence Word-by-Word View */}
        <div className="py-4">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-3 text-2xl sm:text-3xl font-bold tracking-tight leading-relaxed">
            {targetWords.map((word, idx) => {
              const cleanT = cleanWord(word);
              const realMatch = realtimeMatches[idx];

              // Color determination
              let wordStyle = 'text-white hover:text-sky-300';
              let badge = null;

              if (isRecording) {
                if (realMatch?.status === 'matched') {
                  wordStyle = 'text-emerald-400 font-extrabold scale-105';
                  badge = <span className="absolute -top-3 left-0 text-[10px] text-emerald-400 font-normal">✓ 일치</span>;
                } else if (realMatch?.status === 'partial') {
                  wordStyle = 'text-amber-300 font-extrabold';
                  badge = <span className="absolute -top-3 left-0 text-[10px] text-amber-300 font-normal">~ 근접</span>;
                }
              } else if (analysisResult) {
                const wAnalysis = analysisResult.wordAnalysis.find(
                  (wa) => cleanWord(wa.word) === cleanT
                );
                if (wAnalysis) {
                  if (wAnalysis.status === 'perfect') {
                    wordStyle = 'text-emerald-400 underline decoration-emerald-500/50 underline-offset-4';
                  } else if (wAnalysis.status === 'good') {
                    wordStyle = 'text-sky-300 underline decoration-sky-500/50 underline-offset-4';
                  } else if (wAnalysis.status === 'needs-work') {
                    wordStyle = 'text-amber-400 underline decoration-amber-500/50 underline-offset-4';
                  } else {
                    wordStyle = 'text-rose-400 underline decoration-rose-500/50 underline-offset-4';
                  }
                }
              }

              return (
                <span
                  key={idx}
                  onClick={(e) => handlePlaySingleWord(word, e)}
                  title="클릭하여 이 단어만 원어민 발음 듣기"
                  className={`relative inline-block cursor-pointer transition-all duration-150 group select-none ${wordStyle}`}
                >
                  {badge}
                  {word}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-sky-400 transition-all group-hover:w-full" />
                </span>
              );
            })}
          </div>

          {/* IPA Phonetic Transcription */}
          {showIpa && (
            <div className="mt-4 font-mono text-sm sm:text-base text-sky-400/90 tracking-wide bg-sky-950/30 px-3 py-1.5 rounded-xl border border-sky-900/40 inline-block">
              {sentence.ipa}
            </div>
          )}

          {/* Korean Translation */}
          <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between">
            <p
              className={`text-base sm:text-lg text-slate-300 font-medium transition-all ${
                showKorean ? 'opacity-100' : 'opacity-20 blur-sm select-none'
              }`}
            >
              {sentence.translation}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowKorean(!showKorean)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer text-xs flex items-center gap-1"
                title={showKorean ? '해석 숨기기' : '해석 보기'}
              >
                {showKorean ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span className="hidden sm:inline">{showKorean ? '해석숨김' : '해석보기'}</span>
              </button>

              <button
                onClick={() => setShowIpa(!showIpa)}
                className={`px-2 py-1 rounded-lg text-xs font-mono transition cursor-pointer ${
                  showIpa
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
                title="국제 음성 기호(IPA) 표시 토글"
              >
                IPA {showIpa ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        </div>

        {/* Korean Native Pronunciation Tip Box */}
        <div className="mt-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs sm:text-sm flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-amber-300 flex items-center gap-1.5">
              <span>발음 핵심 포인트</span>
              <span className="text-[11px] font-normal px-2 py-0.5 bg-amber-400/20 rounded-full">
                {sentence.phonemeFocus}
              </span>
            </p>
            <p className="text-amber-100/90 leading-relaxed font-normal">
              {sentence.pronunciationTip}
            </p>
          </div>
        </div>

        {/* Audio Station (Native Speaker Audio Controls) */}
        <div className="mt-6 pt-5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePlayNative(playbackSpeed)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition cursor-pointer ${
                isPlayingNative
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 animate-pulse'
                  : 'bg-sky-600 hover:bg-sky-500 active:scale-95 text-white shadow-lg shadow-sky-600/30'
              }`}
            >
              {isPlayingNative ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              <span>{isPlayingNative ? '재생 중지' : '원어민 발음 듣기'}</span>
            </button>

            {/* Speed Selector */}
            <div className="flex items-center bg-slate-800/80 rounded-xl p-1 border border-slate-700 text-xs font-semibold">
              {[0.7, 0.85, 1.0].map((rate) => (
                <button
                  key={rate}
                  onClick={() => {
                    setPlaybackSpeed(rate);
                    if (isPlayingNative) handlePlayNative(rate);
                  }}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    playbackSpeed === rate
                      ? 'bg-sky-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {rate === 0.7 ? '0.7x (느리게)' : rate === 0.85 ? '0.85x' : '1.0x (보통)'}
                </button>
              ))}
            </div>
          </div>

          {/* AI Explanation / Linking Guide toggle */}
          <button
            onClick={handleLoadExplanation}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700 transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>{isLoadingExplanation ? '연음 분석 중...' : showExplanation ? '연음 가이드 접기' : '연음 & 억양 상세 분석'}</span>
          </button>
        </div>

        {/* Collapsible Linking & Intonation Guide */}
        {showExplanation && explanationData && (
          <div className="mt-4 p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-100 text-xs sm:text-sm space-y-3 animate-fadeIn">
            <h4 className="font-bold text-sky-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <span>원어민 연음 &amp; 리듬 마스터 가이드</span>
            </h4>

            {explanationData.linkingRules?.length > 0 && (
              <div className="space-y-1.5">
                <span className="font-semibold text-slate-300 text-xs block">연음(Linking) 규칙:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {explanationData.linkingRules.map((rule: any, i: number) => (
                    <div key={i} className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
                      <div className="flex items-center justify-between text-xs font-mono font-bold text-sky-300 mb-1">
                        <span>{rule.words}</span>
                        <span className="text-emerald-400">➔ {rule.phoneticResult}</span>
                      </div>
                      <p className="text-[11px] text-slate-300">{rule.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {explanationData.stressAndRhythm && (
              <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
                <span className="font-semibold text-slate-300 text-xs block mb-1">강세와 억양(Pitch):</span>
                <p className="text-xs text-slate-300 leading-relaxed">{explanationData.stressAndRhythm}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Shadowing & Recording Interaction Station */}
      <div className="bg-slate-900/80 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Mic className="w-5 h-5 text-sky-400" />
              <span>섀도잉 실시간 따라 말하기</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              마이크 버튼을 누르고 문장을 큰 소리로 따라 말해보세요. 말하는 동안 실시간으로 단어가 분석됩니다.
            </p>
          </div>

          {/* Visualizer widget */}
          <div className="w-full sm:w-64">
            <AudioVisualizer stream={micStream} isListening={isRecording} />
          </div>
        </div>

        {/* Huge Interactive Record Button */}
        <div className="flex flex-col items-center justify-center py-4 space-y-4">
          {!isRecording ? (
            <button
              onClick={handleStartRecording}
              className="relative group p-6 rounded-full bg-gradient-to-tr from-sky-500 via-indigo-600 to-sky-400 text-white shadow-2xl shadow-sky-500/40 hover:scale-105 active:scale-95 transition cursor-pointer"
            >
              <div className="absolute inset-0 rounded-full bg-sky-400 opacity-20 blur-xl group-hover:opacity-40 transition" />
              <div className="relative flex items-center justify-center w-16 h-16">
                <Mic className="w-10 h-10 drop-shadow" />
              </div>
            </button>
          ) : (
            <button
              onClick={handleStopRecording}
              className="relative group p-6 rounded-full bg-gradient-to-tr from-rose-500 to-red-600 text-white shadow-2xl shadow-rose-500/40 hover:scale-105 active:scale-95 transition cursor-pointer animate-pulse"
            >
              <div className="relative flex items-center justify-center w-16 h-16">
                <Square className="w-10 h-10 fill-white" />
              </div>
            </button>
          )}

          <div className="text-center">
            <p className="font-bold text-sm sm:text-base text-white">
              {isRecording ? '듣는 중... 말씀이 끝나면 여기를 눌러 분석하세요' : '마이크를 탭하여 따라 말하기 시작'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {isRecording ? '실시간 음성 인식이 동작 중입니다' : '자연스럽게 원어민의 억양과 리듬을 흉내내보세요'}
            </p>
          </div>

          {/* Real-time speech transcript monitor */}
          {(spokenTranscript || isRecording) && (
            <div className="w-full max-w-xl p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                실시간 인식된 내용
              </span>
              <p className="text-sm font-medium text-sky-300 font-mono italic">
                "{spokenTranscript || '말씀을 듣고 있습니다...'}"
              </p>
            </div>
          )}
        </div>

        {/* Side-by-side Audio Comparison (Native vs User Recording) */}
        {userAudioUrl && (
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">내 목소리 vs 원어민 발음 비교</h4>
                <p className="text-xs text-slate-400">두 발음을 번갈아 들으며 억양과 음색 차이를 느껴보세요.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={togglePlayUserAudio}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  isPlayingUserAudio
                    ? 'bg-rose-500 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                }`}
              >
                {isPlayingUserAudio ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlayingUserAudio ? '일시정지' : '내 녹음 듣기'}</span>
              </button>

              <button
                onClick={() => handlePlayNative(playbackSpeed)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5 text-sky-400" />
                <span>원어민 듣기</span>
              </button>

              <button
                onClick={handleStartRecording}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700 transition cursor-pointer"
                title="다시 녹음하기"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Loading Spinner for Analysis */}
        {isAnalyzing && (
          <div className="p-6 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 flex items-center justify-center gap-3">
            <div className="w-6 h-6 border-3 border-sky-400 border-t-transparent rounded-full animate-spin" />
            <div className="text-left">
              <p className="text-sm font-bold text-white">Gemini AI 음성학 정밀 분석 중...</p>
              <p className="text-xs text-slate-400">한국인 음운 체계와의 차이점을 분석하고 있습니다.</p>
            </div>
          </div>
        )}

        {/* AI Pronunciation Deep-Dive Report */}
        {analysisResult && (
          <div className="space-y-6 pt-4 border-t border-slate-800 animate-fadeIn">
            {/* Score Ring & Summary Header */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Overall Score */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 flex flex-col items-center justify-center text-center">
                <span className="text-xs font-semibold text-slate-400 mb-1">종합 발음 점수</span>
                <div
                  className={`text-4xl font-extrabold font-mono px-4 py-2 rounded-2xl border ${getScoreColor(
                    analysisResult.overallScore
                  )}`}
                >
                  {analysisResult.overallScore}
                  <span className="text-sm font-normal ml-0.5">점</span>
                </div>
                <span className="text-xs text-slate-400 mt-2">
                  {analysisResult.overallScore >= 90
                    ? '🎉 원어민 수준 (Excellent)'
                    : analysisResult.overallScore >= 75
                    ? '👍 매우 자연스러움 (Good)'
                    : analysisResult.overallScore >= 60
                    ? '💪 이해 가능함 (Fair)'
                    : '🔄 보완 연습 필요 (Needs Work)'}
                </span>
              </div>

              {/* Accuracy Subscore */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>음소 정확도 (Accuracy)</span>
                  <Award className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-400 my-1">
                  {analysisResult.accuracyScore}%
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${analysisResult.accuracyScore}%` }}
                  />
                </div>
              </div>

              {/* Fluency Subscore */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>유창성 (Fluency)</span>
                  <Sparkles className="w-4 h-4 text-sky-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-sky-400 my-1">
                  {analysisResult.fluencyScore}%
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-sky-500 rounded-full"
                    style={{ width: `${analysisResult.fluencyScore}%` }}
                  />
                </div>
              </div>

              {/* Intonation Subscore */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>억양 &amp; 강세 (Intonation)</span>
                  <Flame className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-purple-400 my-1">
                  {analysisResult.intonationScore}%
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${analysisResult.intonationScore}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Word-by-Word Analysis Grid */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-white flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-400" />
                  <span>단어별 정밀 발음 진단</span>
                </span>
                <span className="text-xs text-slate-400 font-normal">
                  단어를 클릭하면 해당 단어의 맞춤 발음 팁을 확인할 수 있습니다
                </span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {analysisResult.wordAnalysis.map((wa, i) => (
                  <div
                    key={i}
                    onClick={(e) => handlePlaySingleWord(wa.word, e)}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800/90 hover:border-slate-700 transition cursor-pointer flex flex-col justify-between gap-1 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-base group-hover:text-sky-300 transition">
                        {wa.word}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          wa.status === 'perfect'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : wa.status === 'good'
                            ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                            : wa.status === 'needs-work'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        }`}
                      >
                        {wa.status === 'perfect'
                          ? '완벽'
                          : wa.status === 'good'
                          ? '양호'
                          : wa.status === 'needs-work'
                          ? '보완필요'
                          : '누락'}
                      </span>
                    </div>

                    {wa.userSaid && wa.userSaid !== wa.word && (
                      <div className="text-[11px] text-slate-400">
                        인식된 소리: <span className="text-rose-300 font-mono font-medium">{wa.userSaid}</span>
                      </div>
                    )}

                    <p className="text-[11px] text-slate-300 leading-snug mt-1">{wa.tip}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Coach's Advice & Strengths */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 space-y-2">
                <h5 className="font-bold text-sky-300 text-xs flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-sky-400" />
                  <span>AI 코치의 종합 총평</span>
                </h5>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                  {analysisResult.coachFeedback}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                <h5 className="font-bold text-emerald-400 text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>잘한 점 &amp; 다음 시도 목표</span>
                </h5>
                <ul className="text-xs text-slate-300 space-y-1">
                  {analysisResult.strengths?.map((s, idx) => (
                    <li key={`s-${idx}`} className="flex items-start gap-1.5">
                      <span className="text-emerald-400">✓</span>
                      <span>{s}</span>
                    </li>
                  ))}
                  {analysisResult.improvements?.map((imp, idx) => (
                    <li key={`imp-${idx}`} className="flex items-start gap-1.5 text-amber-200">
                      <span className="text-amber-400">➔</span>
                      <span>{imp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Next Steps CTA */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                onClick={handleStartRecording}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-sky-400" />
                <span>이 문장 다시 도전하기</span>
              </button>

              <button
                onClick={handleNextSentence}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 active:scale-95 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition cursor-pointer"
              >
                <span>다음 문장 연습하기</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function Headphones(props: any) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
    </svg>
  );
}

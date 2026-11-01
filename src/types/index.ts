export interface WordAnalysis {
  word: string;
  status: 'perfect' | 'good' | 'needs-work' | 'missed';
  score: number;
  userSaid?: string;
  ipaTarget?: string;
  ipaHeard?: string;
  tip: string;
}

export type SentenceCategory =
  | 'basic'
  | 'business'
  | 'travel'
  | 'exam'
  | 'korean_focus'
  | 'idiom'
  | 'custom';

export interface Sentence {
  id: string;
  sentence: string;
  translation: string;
  ipa: string;
  category: SentenceCategory;
  categoryName: string;
  subTopic?: string; // e.g. "토익스피킹 Part 2", "토플 독립형", "비즈니스 미팅", "공항/입국"
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  phonemeFocus: string;
  pronunciationTip: string;
  situationContext?: string;
  isCustom?: boolean;
  isBookmarked?: boolean;
  tags?: string[];
}

export interface PronunciationResult {
  id: string;
  sentenceId: string;
  sentenceText: string;
  timestamp: number;
  overallScore: number;
  accuracyScore: number;
  fluencyScore: number;
  intonationScore: number;
  userTranscript: string;
  wordAnalysis: WordAnalysis[];
  coachFeedback: string;
  phonemeTips: string[];
  strengths: string[];
  improvements: string[];
  audioBlobUrl?: string;
  durationSeconds: number;
}

export interface DailyRecord {
  date: string; // YYYY-MM-DD
  sentenceCount: number;
  averageScore: number;
  speakingSeconds: number;
  scores: number[];
}

export interface CategoryProgress {
  totalAttempts: number;
  totalScore: number;
  avgScore: number;
  masteredCount: number;
}

export interface UserStats {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  dailyGoal: number; // default 10
  totalPracticed: number;
  totalMastered: number; // score >= 90
  totalSpeakingSeconds: number;
  xp: number;
  level: number;
  phonemeMastery: Record<string, { totalAttempts: number; totalScore: number; avgScore: number }>;
  categoryMastery: Record<string, CategoryProgress>;
  bookmarkedIds: string[];
  history: PronunciationResult[];
}

export interface Settings {
  speechRate: number; // 0.7, 0.85, 1.0
  accent: string; // 'en-US' | 'en-GB'
  autoAdvance: boolean;
  soundEffects: boolean;
  showIpa: boolean;
  showKorean: boolean;
}

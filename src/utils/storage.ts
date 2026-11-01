import { DailyRecord, PronunciationResult, Sentence, Settings, UserStats } from '../types';
import { DEFAULT_SENTENCES } from '../data/defaultSentences';

const STORAGE_KEYS = {
  STATS: 'echospeak_user_stats_v1',
  DAILY: 'echospeak_daily_records_v1',
  SENTENCES: 'echospeak_custom_sentences_v1',
  SETTINGS: 'echospeak_settings_v1',
  PASSCODE: 'echospeak_app_passcode_v1',
};

export function getStoredPasscode(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.PASSCODE) || '';
  } catch {
    return '';
  }
}

export function setStoredPasscode(code: string) {
  try {
    localStorage.setItem(STORAGE_KEYS.PASSCODE, code);
  } catch (e) {
    console.error('Failed to save passcode', e);
  }
}

export function clearStoredPasscode() {
  try {
    localStorage.removeItem(STORAGE_KEYS.PASSCODE);
  } catch (e) {
    console.error('Failed to clear passcode', e);
  }
}

const DEFAULT_SETTINGS: Settings = {
  speechRate: 0.85,
  accent: 'en-US',
  autoAdvance: false,
  soundEffects: true,
  showIpa: true,
  showKorean: true,
};

function getTodayStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings) {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings', e);
  }
}

export function loadCustomSentences(): Sentence[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SENTENCES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomSentence(sentence: Sentence) {
  try {
    const current = loadCustomSentences();
    const updated = [sentence, ...current.filter((s) => s.id !== sentence.id)];
    localStorage.setItem(STORAGE_KEYS.SENTENCES, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save custom sentence', e);
  }
}

export function deleteCustomSentence(sentenceId: string) {
  try {
    const current = loadCustomSentences();
    const updated = current.filter((s) => s.id !== sentenceId);
    localStorage.setItem(STORAGE_KEYS.SENTENCES, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to delete custom sentence', e);
  }
}

export function getAllSentences(): Sentence[] {
  const custom = loadCustomSentences();
  const bookmarked = loadStats().bookmarkedIds;
  const merged = [...DEFAULT_SENTENCES, ...custom];
  return merged.map((s) => ({
    ...s,
    isBookmarked: bookmarked.includes(s.id),
  }));
}

const INITIAL_CATEGORY_MASTERY = {
  basic: { totalAttempts: 0, totalScore: 0, avgScore: 0, masteredCount: 0 },
  business: { totalAttempts: 0, totalScore: 0, avgScore: 0, masteredCount: 0 },
  travel: { totalAttempts: 0, totalScore: 0, avgScore: 0, masteredCount: 0 },
  exam: { totalAttempts: 0, totalScore: 0, avgScore: 0, masteredCount: 0 },
  korean_focus: { totalAttempts: 0, totalScore: 0, avgScore: 0, masteredCount: 0 },
  idiom: { totalAttempts: 0, totalScore: 0, avgScore: 0, masteredCount: 0 },
  custom: { totalAttempts: 0, totalScore: 0, avgScore: 0, masteredCount: 0 },
};

const INITIAL_STATS: UserStats = {
  currentStreak: 1,
  longestStreak: 1,
  lastActiveDate: getTodayStr(),
  dailyGoal: 10,
  totalPracticed: 0,
  totalMastered: 0,
  totalSpeakingSeconds: 0,
  xp: 120,
  level: 1,
  phonemeMastery: {
    'R vs L': { totalAttempts: 0, totalScore: 0, avgScore: 0 },
    'F vs P': { totalAttempts: 0, totalScore: 0, avgScore: 0 },
    'V vs B': { totalAttempts: 0, totalScore: 0, avgScore: 0 },
    'TH [θ/ð]': { totalAttempts: 0, totalScore: 0, avgScore: 0 },
    'Flap T': { totalAttempts: 0, totalScore: 0, avgScore: 0 },
    '연음 Linking': { totalAttempts: 0, totalScore: 0, avgScore: 0 },
  },
  categoryMastery: INITIAL_CATEGORY_MASTERY,
  bookmarkedIds: [],
  history: [],
};

export function loadStats(): UserStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STATS);
    if (!raw) return INITIAL_STATS;
    const parsed = JSON.parse(raw);
    return {
      ...INITIAL_STATS,
      ...parsed,
      phonemeMastery: {
        ...INITIAL_STATS.phonemeMastery,
        ...(parsed.phonemeMastery || {}),
      },
      categoryMastery: {
        ...INITIAL_CATEGORY_MASTERY,
        ...(parsed.categoryMastery || {}),
      },
    };
  } catch {
    return INITIAL_STATS;
  }
}

export function saveStats(stats: UserStats) {
  try {
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
  } catch (e) {
    console.error('Failed to save stats', e);
  }
}

export function loadDailyRecords(): Record<string, DailyRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DAILY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function recordPracticeAttempt(
  sentence: Sentence,
  result: PronunciationResult,
  durationSec: number
): { stats: UserStats; xpGained: number; leveledUp: boolean } {
  const stats = loadStats();
  const today = getTodayStr();

  // Streak logic
  if (stats.lastActiveDate !== today) {
    const lastDate = new Date(stats.lastActiveDate);
    const currentDate = new Date(today);
    const diffDays = Math.round((currentDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));

    if (diffDays === 1) {
      stats.currentStreak += 1;
      stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
    } else if (diffDays > 1) {
      stats.currentStreak = 1;
    }
    stats.lastActiveDate = today;
  }

  // Update counts
  stats.totalPracticed += 1;
  stats.totalSpeakingSeconds += Math.max(1, Math.round(durationSec));
  if (result.overallScore >= 90) {
    stats.totalMastered += 1;
  }

  // Calculate XP
  let xpGained = 20; // base attempt XP
  if (result.overallScore >= 90) xpGained += 30; // mastery bonus
  else if (result.overallScore >= 80) xpGained += 15;

  const oldLevel = stats.level;
  stats.xp += xpGained;
  // Level formula: Level = floor(sqrt(XP / 50)) + 1
  stats.level = Math.floor(Math.sqrt(stats.xp / 50)) + 1;
  const leveledUp = stats.level > oldLevel;

  // Update Phoneme Mastery
  const phoneme = sentence.phonemeFocus || 'General';
  let matchedKey = Object.keys(stats.phonemeMastery).find((k) =>
    phoneme.toLowerCase().includes(k.toLowerCase().split(' ')[0])
  );
  if (!matchedKey) {
    matchedKey = phoneme;
  }

  if (!stats.phonemeMastery[matchedKey]) {
    stats.phonemeMastery[matchedKey] = { totalAttempts: 0, totalScore: 0, avgScore: 0 };
  }
  const pm = stats.phonemeMastery[matchedKey];
  pm.totalAttempts += 1;
  pm.totalScore += result.overallScore;
  pm.avgScore = Math.round(pm.totalScore / pm.totalAttempts);

  // Update Category Mastery
  const catKey = sentence.category || 'basic';
  if (!stats.categoryMastery[catKey]) {
    stats.categoryMastery[catKey] = { totalAttempts: 0, totalScore: 0, avgScore: 0, masteredCount: 0 };
  }
  const cm = stats.categoryMastery[catKey];
  cm.totalAttempts += 1;
  cm.totalScore += result.overallScore;
  cm.avgScore = Math.round(cm.totalScore / cm.totalAttempts);
  if (result.overallScore >= 90) {
    cm.masteredCount += 1;
  }

  // Auto-bookmark for review if score < 75
  if (result.overallScore < 75 && !stats.bookmarkedIds.includes(sentence.id)) {
    stats.bookmarkedIds.push(sentence.id);
  }

  // History (store latest 100 attempts, omit huge audio blobs to save localStorage)
  const historyItem = { ...result, audioBlobUrl: undefined };
  stats.history = [historyItem, ...stats.history.slice(0, 99)];

  saveStats(stats);

  // Update Daily Records
  const daily = loadDailyRecords();
  if (!daily[today]) {
    daily[today] = {
      date: today,
      sentenceCount: 0,
      averageScore: 0,
      speakingSeconds: 0,
      scores: [],
    };
  }

  daily[today].sentenceCount += 1;
  daily[today].speakingSeconds += Math.max(1, Math.round(durationSec));
  daily[today].scores.push(result.overallScore);
  daily[today].averageScore = Math.round(
    daily[today].scores.reduce((a, b) => a + b, 0) / daily[today].scores.length
  );

  try {
    localStorage.setItem(STORAGE_KEYS.DAILY, JSON.stringify(daily));
  } catch (e) {
    console.error('Failed to save daily record', e);
  }

  return { stats, xpGained, leveledUp };
}

export function toggleBookmarkSentence(sentenceId: string): boolean {
  const stats = loadStats();
  const index = stats.bookmarkedIds.indexOf(sentenceId);
  let isBookmarked = false;
  if (index >= 0) {
    stats.bookmarkedIds.splice(index, 1);
    isBookmarked = false;
  } else {
    stats.bookmarkedIds.push(sentenceId);
    isBookmarked = true;
  }
  saveStats(stats);
  return isBookmarked;
}

export function exportUserData(): string {
  return JSON.stringify({
    stats: loadStats(),
    daily: loadDailyRecords(),
    customSentences: loadCustomSentences(),
    settings: loadSettings(),
    exportedAt: new Date().toISOString(),
  }, null, 2);
}

export function importUserData(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    if (data.stats) localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(data.stats));
    if (data.daily) localStorage.setItem(STORAGE_KEYS.DAILY, JSON.stringify(data.daily));
    if (data.customSentences) localStorage.setItem(STORAGE_KEYS.SENTENCES, JSON.stringify(data.customSentences));
    if (data.settings) localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
    return true;
  } catch {
    return false;
  }
}

export function resetUserData() {
  localStorage.removeItem(STORAGE_KEYS.STATS);
  localStorage.removeItem(STORAGE_KEYS.DAILY);
  localStorage.removeItem(STORAGE_KEYS.SENTENCES);
  localStorage.removeItem(STORAGE_KEYS.SETTINGS);
}

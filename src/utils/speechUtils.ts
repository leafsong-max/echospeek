// Browser Speech Recognition, Speech Synthesis, MediaRecorder, and Phonetic Matching

export interface SpeechRecognitionOptions {
  lang?: string;
  onInterimResult?: (transcript: string) => void;
  onFinalResult?: (transcript: string) => void;
  onError?: (error: any) => void;
  onEnd?: () => void;
}

export function isSpeechRecognitionSupported(): boolean {
  return typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
}

export class SpeechRecognizer {
  private recognition: any = null;
  private isListening = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 3;
      }
    }
  }

  public start(options: SpeechRecognitionOptions): boolean {
    if (!this.recognition) return false;
    if (this.isListening) {
      this.stop();
    }

    this.recognition.lang = options.lang || 'en-US';

    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      if (interimTranscript && options.onInterimResult) {
        options.onInterimResult(interimTranscript);
      }
      if (finalTranscript && options.onFinalResult) {
        options.onFinalResult(finalTranscript.trim());
      }
    };

    this.recognition.onerror = (event: any) => {
      console.warn('SpeechRecognition error:', event.error);
      if (options.onError) {
        options.onError(event.error);
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (options.onEnd) {
        options.onEnd();
      }
    };

    try {
      this.recognition.start();
      this.isListening = true;
      return true;
    } catch (e) {
      console.error('Failed to start speech recognition', e);
      return false;
    }
  }

  public stop() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
      this.isListening = false;
    }
  }

  public getActive(): boolean {
    return this.isListening;
  }
}

// Speech Synthesis (Native Audio Player)
export interface SpeakOptions {
  rate?: number; // 0.5 to 1.5
  pitch?: number;
  voiceName?: string;
  lang?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onBoundary?: (charIndex: number) => void;
}

export function speakEnglish(text: string, options: SpeakOptions = {}): SpeechSynthesisUtterance | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return null;
  }

  window.speechSynthesis.cancel(); // Stop any active speech

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = options.rate ?? 0.9;
  utterance.pitch = options.pitch ?? 1.0;
  utterance.lang = options.lang || 'en-US';

  // Select optimal high quality voice if available
  const voices = window.speechSynthesis.getVoices();
  const englishVoices = voices.filter(
    (v) => v.lang.startsWith('en-') || v.lang.startsWith('en_')
  );

  let selectedVoice = null;
  if (options.voiceName) {
    selectedVoice = voices.find((v) => v.name === options.voiceName);
  }
  if (!selectedVoice) {
    // Prefer Google, Samantha, Daniel, Karen, or Natural voices
    selectedVoice =
      englishVoices.find(
        (v) =>
          v.name.includes('Google') ||
          v.name.includes('Natural') ||
          v.name.includes('Samantha') ||
          v.name.includes('Daniel')
      ) ||
      englishVoices.find((v) => v.lang === (options.lang || 'en-US')) ||
      englishVoices[0];
  }

  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }

  if (options.onStart) utterance.onstart = options.onStart;
  if (options.onEnd) utterance.onend = options.onEnd;
  if (options.onBoundary) {
    utterance.onboundary = (event) => {
      options.onBoundary!(event.charIndex);
    };
  }

  window.speechSynthesis.speak(utterance);
  return utterance;
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

// Media Audio Recording
export class VoiceRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  public async start(): Promise<MediaStream> {
    this.audioChunks = [];
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/mp4')
      ? 'audio/mp4'
      : 'audio/webm';

    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(100);
    return this.stream;
  }

  public stop(): Promise<{ blob: Blob; url: string; base64: string; mimeType: string }> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        return reject(new Error('MediaRecorder not initialized'));
      }

      this.mediaRecorder.onstop = async () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        const url = URL.createObjectURL(audioBlob);

        // Convert to base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Data = (reader.result as string).split(',')[1];
          // cleanup stream tracks
          if (this.stream) {
            this.stream.getTracks().forEach((track) => track.stop());
            this.stream = null;
          }
          resolve({ blob: audioBlob, url, base64: base64Data, mimeType });
        };
        reader.onerror = (err) => reject(err);
      };

      try {
        this.mediaRecorder.stop();
      } catch (e) {
        reject(e);
      }
    });
  }

  public cancel() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (e) {
        // ignore
      }
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    this.audioChunks = [];
  }
}

// Levenshtein and similarity calculation
export function cleanWord(w: string): string {
  return w.toLowerCase().replace(/[^a-z0-9']/g, '');
}

export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

export function getWordSimilarity(target: string, spoken: string): number {
  const cleanTarget = cleanWord(target);
  const cleanSpoken = cleanWord(spoken);

  if (!cleanTarget || !cleanSpoken) return 0;
  if (cleanTarget === cleanSpoken) return 100;

  const maxLen = Math.max(cleanTarget.length, cleanSpoken.length);
  const distance = levenshteinDistance(cleanTarget, cleanSpoken);
  const similarity = Math.max(0, Math.round((1 - distance / maxLen) * 100));
  return similarity;
}

// Real-time alignment between target sentence and current spoken words
export interface RealtimeWordMatch {
  targetWord: string;
  matchedWord?: string;
  status: 'matched' | 'partial' | 'pending' | 'missed';
  similarity: number;
}

export function alignSpokenWords(targetSentence: string, currentTranscript: string): RealtimeWordMatch[] {
  const targetWords = targetSentence.split(/\s+/).filter(Boolean);
  const spokenWords = currentTranscript.split(/\s+/).filter(Boolean);

  let spokenIndex = 0;
  const results: RealtimeWordMatch[] = [];

  for (let i = 0; i < targetWords.length; i++) {
    const targetWord = targetWords[i];
    const cleanT = cleanWord(targetWord);

    if (spokenIndex >= spokenWords.length) {
      results.push({
        targetWord,
        status: 'pending',
        similarity: 0,
      });
      continue;
    }

    // Look ahead in spoken words (window of 3) to find the best match
    let bestSim = 0;
    let bestIdx = -1;
    let bestSpoken = '';

    for (let look = 0; look < 3 && spokenIndex + look < spokenWords.length; look++) {
      const cand = spokenWords[spokenIndex + look];
      const sim = getWordSimilarity(cleanT, cand);
      if (sim > bestSim) {
        bestSim = sim;
        bestIdx = spokenIndex + look;
        bestSpoken = cand;
      }
    }

    if (bestSim >= 75 && bestIdx !== -1) {
      spokenIndex = bestIdx + 1;
      results.push({
        targetWord,
        matchedWord: bestSpoken,
        status: bestSim >= 90 ? 'matched' : 'partial',
        similarity: bestSim,
      });
    } else if (bestSim >= 45 && bestIdx !== -1) {
      spokenIndex = bestIdx + 1;
      results.push({
        targetWord,
        matchedWord: bestSpoken,
        status: 'partial',
        similarity: bestSim,
      });
    } else {
      results.push({
        targetWord,
        status: 'pending',
        similarity: 0,
      });
    }
  }

  return results;
}

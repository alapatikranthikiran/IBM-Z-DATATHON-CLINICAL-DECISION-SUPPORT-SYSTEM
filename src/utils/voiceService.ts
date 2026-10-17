// Clinical Audio & Voice Synthesis Utility
// Supports Gemini 3.8 Flash-Lite TTS with seamless browser speech synthesis fallback

let currentAudio: HTMLAudioElement | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;

export type GeminiVoice = 'Kore' | 'Fenrir' | 'Puck' | 'Zephyr' | 'Charon';

export interface VoiceOption {
  id: GeminiVoice;
  name: string;
  tone: string;
  gender: 'Female' | 'Male' | 'Neutral';
}

export const AVAILABLE_VOICES: VoiceOption[] = [
  { id: 'Kore', name: 'Kore', tone: 'Calm, authoritative clinical officer', gender: 'Female' },
  { id: 'Fenrir', name: 'Fenrir', tone: 'Deep, steady emergency triage director', gender: 'Male' },
  { id: 'Puck', name: 'Puck', tone: 'Clear, reassuring acute physician', gender: 'Neutral' },
  { id: 'Zephyr', name: 'Zephyr', tone: 'Fast, precise intensive care specialist', gender: 'Neutral' },
  { id: 'Charon', name: 'Charon', tone: 'Low resonance, deliberate protocol auditor', gender: 'Male' },
];

/**
 * Checks if the browser supports SpeechRecognition (Web Speech API)
 */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
}

/**
 * Stop any active audio or speech playback
 */
export function stopSpeaking(): void {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch (e) {
      // Ignore cleanup error
    }
    currentAudio = null;
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      // Ignore cleanup error
    }
    currentUtterance = null;
  }
}

/**
 * Synthesizes text to speech using Gemini 3.8 Flash-Lite TTS,
 * with graceful fallback to browser speech synthesis.
 */
export async function speakClinicalText(
  text: string,
  options?: {
    voice?: GeminiVoice;
    language?: string;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: any) => void;
  }
): Promise<() => void> {
  const { voice = 'Kore', language = 'en', onStart, onEnd, onError } = options || {};

  // Stop any currently playing speech first
  stopSpeaking();

  // Strip markdown formatting for cleaner audio pronunciation
  const cleanText = text
    .replace(/[*#_`~>\[\]\(\)]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanText) {
    onEnd?.();
    return () => {};
  }

  let aborted = false;

  const cancelFn = () => {
    aborted = true;
    stopSpeaking();
  };

  try {
    // Attempt Gemini 3.8 Flash-Lite TTS via server proxy
    const res = await fetch('/api/gemini/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: cleanText,
        voice,
      }),
    });

    if (aborted) return cancelFn;

    const data = await res.json();

    if (data.audioData && !data.fallbackToBrowser) {
      // Play Gemini audio
      const audioUrl = `data:audio/wav;base64,${data.audioData}`;
      const audio = new Audio(audioUrl);
      currentAudio = audio;

      audio.onplay = () => {
        if (!aborted) onStart?.();
      };

      audio.onended = () => {
        currentAudio = null;
        if (!aborted) onEnd?.();
      };

      audio.onerror = (e) => {
        console.warn('Audio playback error, trying browser speech fallback:', e);
        fallbackBrowserSpeak(cleanText, language, onStart, onEnd, onError);
      };

      await audio.play();
      return cancelFn;
    } else {
      // Fallback to browser synthesis
      fallbackBrowserSpeak(cleanText, language, onStart, onEnd, onError);
      return cancelFn;
    }
  } catch (err) {
    if (aborted) return cancelFn;
    console.warn('Gemini TTS request failed, using browser speech fallback:', err);
    fallbackBrowserSpeak(cleanText, language, onStart, onEnd, onError);
    return cancelFn;
  }
}

/**
 * Fallback browser SpeechSynthesis implementation
 */
function fallbackBrowserSpeak(
  text: string,
  langCode: string,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (err: any) => void
): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onError?.(new Error('Speech synthesis not supported in this browser.'));
    onEnd?.();
    return;
  }

  try {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    currentUtterance = utterance;

    // Map language
    const langMap: Record<string, string> = {
      en: 'en-US',
      es: 'es-ES',
      fr: 'fr-FR',
      de: 'de-DE',
      zh: 'zh-CN',
      ar: 'ar-SA',
    };
    utterance.lang = langMap[langCode] || 'en-US';
    utterance.rate = 1.02; // Crisp, professional pace
    utterance.pitch = 1.0;

    // Pick best available voice for language if available
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      const match = voices.find((v) => v.lang.startsWith(utterance.lang)) || voices[0];
      if (match) utterance.voice = match;
    }

    utterance.onstart = () => {
      onStart?.();
    };

    utterance.onend = () => {
      currentUtterance = null;
      onEnd?.();
    };

    utterance.onerror = (event) => {
      console.warn('SpeechSynthesis error:', event);
      currentUtterance = null;
      onError?.(event);
      onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn('Failed to invoke browser speech synthesis:', e);
    onError?.(e);
    onEnd?.();
  }
}

import { useCallback, useEffect, useState } from 'react';

// Browser-native TTS via the Web Speech API — zero backend, zero LLM quota.
// Maps our advisory language codes to BCP-47 voices Indian browsers ship.
const LANG_TO_BCP47 = {
  en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN', kn: 'kn-IN', bn: 'bn-IN', te: 'te-IN',
};

export function useSpeech() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [voices, setVoices] = useState([]);
  const [speakingKey, setSpeakingKey] = useState(null);

  useEffect(() => {
    if (!supported) return undefined;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, [supported]);

  const bestVoice = useCallback((langCode) => {
    const bcp = LANG_TO_BCP47[langCode] || 'en-IN';
    const exact = voices.find((v) => v.lang === bcp);
    if (exact) return exact;
    const prefix = bcp.split('-')[0];
    return voices.find((v) => v.lang && v.lang.startsWith(prefix)) || null;
  }, [voices]);

  // True only when the browser actually ships a voice for that language.
  const hasVoiceFor = useCallback((langCode) => !!bestVoice(langCode), [bestVoice]);

  const speak = useCallback((text, langCode, key = 'default') => {
    if (!supported || !text) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = bestVoice(langCode);
    if (v) u.voice = v;
    u.lang = LANG_TO_BCP47[langCode] || 'en-IN';
    u.rate = 0.95;
    u.onend = () => setSpeakingKey(null);
    u.onerror = () => setSpeakingKey(null);
    setSpeakingKey(key);
    window.speechSynthesis.speak(u);
  }, [supported, bestVoice]);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeakingKey(null);
  }, [supported]);

  return { supported, speak, stop, speakingKey, hasVoiceFor };
}

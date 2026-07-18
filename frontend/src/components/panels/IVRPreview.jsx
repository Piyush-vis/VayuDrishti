import React, { useState } from 'react';
import { Phone, Volume2, Square, MessageCircle } from 'lucide-react';
import { useSpeech } from '../../hooks/useSpeech';

// Phone-frame IVR / WhatsApp preview — demonstrates the mobile + voice delivery
// channel (a named PS capability) WITHOUT live telephony. The audio is real
// browser TTS; the phone frame is a UI mock of how a citizen would receive it.
const IVR_LANGS = [
  { code: 'hi', key: '2', label: 'हिंदी' },
  { code: 'en', key: '1', label: 'English' },
  { code: 'ta', key: '3', label: 'தமிழ்' },
  { code: 'bn', key: '4', label: 'বাংলা' },
];

const IVRPreview = ({ advisories, category, zone }) => {
  const { supported, speak, stop, speakingKey, hasVoiceFor } = useSpeech();
  const [lang, setLang] = useState('hi');

  const line = advisories?.general?.[lang] || advisories?.general?.en || '';
  const greeting = {
    hi: 'नमस्ते। वायुदृष्टि वायु गुणवत्ता चेतावनी।',
    en: 'Hello. This is a VayuDrishti air quality alert.',
    ta: 'வணக்கம். இது வாயுதிருஷ்டி காற்று தர எச்சரிக்கை.',
    bn: 'নমস্কার। এটি একটি বায়ুদৃষ্টি বায়ু মানের সতর্কতা।',
  }[lang] || '';
  const fullMessage = `${greeting} ${line}`;

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Phone className="h-4 w-4 text-emerald-400" />
        <h4 className="text-xs font-bold text-white uppercase tracking-wider">IVR / Voice Delivery</h4>
        <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
          Simulated call
        </span>
      </div>

      {/* Phone frame */}
      <div className="mx-auto max-w-[220px] rounded-[1.5rem] border-4 border-slate-700 bg-slate-950 p-3 shadow-2xl">
        <div className="text-center border-b border-slate-800 pb-2 mb-2">
          <div className="text-[9px] text-slate-500 font-mono">Incoming · 1800-VAYU</div>
          <div className="text-[11px] text-emerald-400 font-bold">Air Quality Helpline</div>
        </div>
        <div className="text-[9px] text-slate-400 mb-2 leading-snug">
          "Press a key for your language / अपनी भाषा के लिए एक कुंजी दबाएँ"
        </div>
        <div className="grid grid-cols-2 gap-1.5 mb-2">
          {IVR_LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-[10px] font-bold border transition-all ${
                lang === l.code
                  ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="font-mono bg-slate-800 rounded px-1">{l.key}</span>
              <span>{l.label}</span>
            </button>
          ))}
        </div>

        {/* WhatsApp-style advisory bubble */}
        <div className="bg-emerald-900/30 border border-emerald-800/40 rounded-lg rounded-tl-none p-2">
          <div className="flex items-center gap-1 text-[8px] text-emerald-400 font-bold uppercase tracking-wider mb-1">
            <MessageCircle className="h-2.5 w-2.5" /> {zone} · {category}
          </div>
          <p className="text-[10px] text-slate-200 leading-snug">{line}</p>
        </div>
      </div>

      {/* Real TTS playback */}
      <div className="flex items-center gap-2">
        {speakingKey === 'ivr' ? (
          <button
            onClick={stop}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-600/20 border border-red-500/40 text-red-300 text-xs font-bold transition-all active:scale-95"
          >
            <Square className="h-3.5 w-3.5" /> Stop
          </button>
        ) : (
          <button
            onClick={() => speak(fullMessage, lang, 'ivr')}
            disabled={!supported}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all active:scale-95 disabled:opacity-40"
          >
            <Volume2 className="h-3.5 w-3.5" /> Play voice advisory
          </button>
        )}
      </div>
      {!supported && (
        <p className="text-[9px] text-amber-400/80">This browser lacks speech synthesis; production uses pre-rendered MP3 (edge-tts).</p>
      )}
      {supported && !hasVoiceFor(lang) && lang !== 'en' && (
        <p className="text-[9px] text-slate-500">
          No on-device {lang.toUpperCase()} voice found — playback falls back to the closest available voice.
          Production ships pre-rendered Indian-language MP3s.
        </p>
      )}
      <p className="text-[8px] text-slate-600 leading-tight">
        Live audio is real browser text-to-speech (Web Speech API). No live telephony — CPCB's SAMEER app is
        English-only, while ~90% of new Indian internet users prefer regional languages.
      </p>
    </div>
  );
};

export default IVRPreview;

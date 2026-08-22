import React, { useState } from 'react';
import { Phone, Volume2, Square, MessageCircle } from 'lucide-react';
import { useSpeech } from '../../hooks/useSpeech';

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
    <div className="bento-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-[var(--accent-emerald)]" />
          <h4 className="text-xs font-heading font-bold text-[var(--text-primary)] uppercase tracking-wider">
            IVR Voice & WhatsApp Broadcast
          </h4>
        </div>
        <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)]">
          Live Synthesizer
        </span>
      </div>

      {/* Phone Mockup Frame */}
      <div className="mx-auto max-w-[240px] rounded-2xl border-2 border-[var(--border-active)] bg-[var(--bg-surface-elevated)] p-3 shadow-lg">
        <div className="text-center border-b border-[var(--border-subtle)] pb-2 mb-2">
          <div className="text-[10px] text-[var(--text-muted)] font-mono">Incoming Alert · 1800-VAYU</div>
          <div className="text-xs text-[var(--accent-emerald)] font-heading font-bold">CPCB Air Emergency Desk</div>
        </div>
        <div className="text-[11px] text-[var(--text-secondary)] mb-2 leading-tight text-center">
          "Press key for regional language / भाषा चुनें"
        </div>
        <div className="grid grid-cols-2 gap-1.5 mb-2.5">
          {IVR_LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-heading font-semibold border transition-all cursor-pointer ${
                lang === l.code
                  ? 'bg-[var(--accent-emerald-subtle)] border-[var(--accent-emerald-border)] text-[var(--accent-emerald)]'
                  : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span className="font-mono text-[10px] bg-[var(--bg-surface-elevated)] rounded px-1">{l.key}</span>
              <span>{l.label}</span>
            </button>
          ))}
        </div>

        {/* WhatsApp message bubble */}
        <div className="bg-[var(--accent-emerald-subtle)] border border-[var(--accent-emerald-border)] rounded-lg rounded-tl-none p-2">
          <div className="flex items-center gap-1 text-[10px] text-[var(--accent-emerald)] font-bold uppercase tracking-wider mb-1">
            <MessageCircle className="h-3 w-3" /> {zone || 'NCR'} · {category || 'Advisory'}
          </div>
          <p className="text-xs text-[var(--text-primary)] leading-snug">{line || 'Processing advisory alert...'}</p>
        </div>
      </div>

      {/* TTS Speech Trigger */}
      <div className="flex items-center gap-2">
        {speakingKey === 'ivr' ? (
          <button
            onClick={stop}
            className="w-full btn-secondary text-xs text-[var(--accent-crimson)] border-[var(--accent-crimson-border)] bg-[var(--accent-crimson-subtle)] py-2"
          >
            <Square className="h-3.5 w-3.5" /> Stop Voice Broadcast
          </button>
        ) : (
          <button
            onClick={() => speak(fullMessage, lang, 'ivr')}
            disabled={!supported}
            className="w-full btn-primary text-xs py-2 disabled:opacity-40"
          >
            <Volume2 className="h-3.5 w-3.5" /> Play Voice Broadcast
          </button>
        )}
      </div>
    </div>
  );
};

export default IVRPreview;

import React, { useState, useEffect } from 'react';
import { advisoryApi } from '../../services/api';
import { AlertCircle, ShieldAlert, Hammer, RefreshCw, Volume2, Square } from 'lucide-react';
import { useReplay } from '../../context/ReplayContext';
import { useSpeech } from '../../hooks/useSpeech';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'Hindi (हिंदी)', flag: '🇮🇳' },
  { code: 'ta', label: 'Tamil (தமிழ்)', flag: '🇮🇳' },
  { code: 'kn', label: 'Kannada (ಕನ್ನಡ)', flag: '🇮🇳' },
  { code: 'bn', label: 'Bengali (বাংলা)', flag: '🇮🇳' },
  { code: 'te', label: 'Telugu (తెలుగు)', flag: '🇮🇳' }
];

const AdvisoryPanel = ({ city, zone, aqiLevel, category, onAdvisories }) => {
  const { replayAtDebounced } = useReplay();
  const { supported, speak, stop, speakingKey } = useSpeech();
  const [selectedLang, setSelectedLang] = useState('en');
  const [advisories, setAdvisories] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchAdvisory = async () => {
    setLoading(true);
    try {
      const data = await advisoryApi.citizen(city, zone);
      setAdvisories(data.advisories);
      if (onAdvisories) onAdvisories(data.advisories);
    } catch (e) {
      console.error("Failed to fetch advisories: ", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (city) {
      fetchAdvisory();
    }
  }, [city, zone, aqiLevel, replayAtDebounced]);

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      const res = await advisoryApi.generate(city, zone);
      setAdvisories(res.data.advisories);
    } catch (e) {
      console.error(e);
      alert("AI Advisory Regeneration: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const getAdvisoryText = (group) => {
    if (!advisories) return "Loading health guidance...";
    const groupData = advisories[group];
    if (!groupData) return "No data for this group.";
    return groupData[selectedLang] || groupData['en'] || "No translation available.";
  };

  const ListenButton = ({ group }) => {
    if (!supported) return null;
    const key = `${group}-${selectedLang}`;
    const isSpeaking = speakingKey === key;
    return (
      <button
        onClick={() => (isSpeaking ? stop() : speak(getAdvisoryText(group), selectedLang, key))}
        className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-heading font-semibold transition-all active:scale-95 cursor-pointer ${
          isSpeaking
            ? 'bg-[var(--accent-crimson-subtle)] border-[var(--accent-crimson-border)] text-[var(--accent-crimson)]'
            : 'bg-[var(--accent-emerald-subtle)] border-[var(--accent-emerald-border)] text-[var(--accent-emerald)] hover:opacity-90'
        }`}
        title="Listen with browser text-to-speech"
      >
        {isSpeaking ? <Square className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
        <span>{isSpeaking ? 'Stop' : 'Listen / सुनें'}</span>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with Regenerate Action */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-heading font-bold text-[var(--text-primary)] uppercase tracking-wider">
            Citizen Health Advisories
          </h3>
          <p className="text-xs text-[var(--text-secondary)] font-normal">
            Multi-lingual guidance for {zone || city}
          </p>
        </div>
        <button
          onClick={handleRegenerate}
          disabled={loading}
          className="btn-secondary text-xs py-1.5 px-3"
          title="Force Groq AI localized regeneration"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          <span>Regen AI</span>
        </button>
      </div>

      {/* Language Tabs */}
      <div className="flex flex-wrap gap-1 p-1 bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-lg">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setSelectedLang(lang.code)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-heading font-semibold rounded-md transition-all cursor-pointer ${
              selectedLang === lang.code
                ? 'bg-[var(--accent-emerald)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
            }`}
          >
            <span>{lang.flag}</span>
            <span>{lang.label}</span>
          </button>
        ))}
      </div>

      {/* Advisory Persona Cards */}
      <div className="space-y-3">
        {/* General Public Card */}
        <div className="bento-card p-4 border-l-4 border-l-[var(--accent-emerald)] flex gap-3.5 items-start">
          <div className="p-2 bg-[var(--accent-emerald-subtle)] text-[var(--accent-emerald)] rounded-lg h-9 w-9 flex items-center justify-center shrink-0 border border-[var(--accent-emerald-border)]">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-heading font-bold text-[var(--text-primary)] uppercase tracking-wider">
                General Public
              </h4>
              <ListenButton group="general" />
            </div>
            <p className="text-xs text-[var(--text-primary)] leading-relaxed font-normal">
              {getAdvisoryText('general')}
            </p>
          </div>
        </div>

        {/* Vulnerable Groups Card */}
        <div className="bento-card p-4 border-l-4 border-l-[var(--accent-amber)] flex gap-3.5 items-start">
          <div className="p-2 bg-[var(--accent-amber-subtle)] text-[var(--accent-amber)] rounded-lg h-9 w-9 flex items-center justify-center shrink-0 border border-[var(--accent-amber-border)]">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-heading font-bold text-[var(--text-primary)] uppercase tracking-wider">
                Vulnerable Populations
              </h4>
              <ListenButton group="vulnerable" />
            </div>
            <p className="text-xs text-[var(--text-primary)] leading-relaxed font-normal">
              {getAdvisoryText('vulnerable')}
            </p>
            <p className="text-[11px] text-[var(--text-muted)] italic">
              Elderly, pediatric groups, asthma and cardiopulmonary patients
            </p>
          </div>
        </div>

        {/* Outdoor Workers Card */}
        <div className="bento-card p-4 border-l-4 border-l-[var(--accent-crimson)] flex gap-3.5 items-start">
          <div className="p-2 bg-[var(--accent-crimson-subtle)] text-[var(--accent-crimson)] rounded-lg h-9 w-9 flex items-center justify-center shrink-0 border border-[var(--accent-crimson-border)]">
            <Hammer className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-heading font-bold text-[var(--text-primary)] uppercase tracking-wider">
                Outdoor & Industrial Workers
              </h4>
              <ListenButton group="outdoor_workers" />
            </div>
            <p className="text-xs text-[var(--text-primary)] leading-relaxed font-normal">
              {getAdvisoryText('outdoor_workers')}
            </p>
            <p className="text-[11px] text-[var(--text-muted)] italic">
              Construction corridors, delivery fleets, street vendors, traffic police
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvisoryPanel;

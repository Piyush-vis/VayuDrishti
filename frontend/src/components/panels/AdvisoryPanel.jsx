import React, { useState, useEffect } from 'react';
import { advisoryApi } from '../../services/api';
import { AlertCircle, ShieldAlert, Hammer, RefreshCw } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'Hindi (हिंदी)', flag: '🇮🇳' },
  { code: 'ta', label: 'Tamil (தமிழ்)', flag: '🇮🇳' },
  { code: 'kn', label: 'Kannada (ಕನ್ನಡ)', flag: '🇮🇳' },
  { code: 'bn', label: 'Bengali (বাংলা)', flag: '🇮🇳' },
  { code: 'te', label: 'Telugu (తెలుగు)', flag: '🇮🇳' }
];

const AdvisoryPanel = ({ city, zone, aqiLevel, category }) => {
  const [selectedLang, setSelectedLang] = useState('en');
  const [advisories, setAdvisories] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchAdvisory = async () => {
    setLoading(true);
    try {
      const data = await advisoryApi.citizen(city, zone);
      setAdvisories(data.advisories);
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
  }, [city, zone, aqiLevel]);

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      const res = await advisoryApi.generate(city, zone);
      setAdvisories(res.data.advisories);
      alert("Successfully regenerated localized AI advisories!");
    } catch (e) {
      console.error(e);
      alert("AI Regeneration failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const getAdvisoryText = (group) => {
    if (!advisories) return "Loading advisories...";
    const groupData = advisories[group];
    if (!groupData) return "No data for this group.";
    return groupData[selectedLang] || groupData['en'] || "No translation available.";
  };

  return (
    <div className="space-y-4">
      {/* Header with Regenerate Action */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Health Advisories</h3>
          <p className="text-[10px] text-slate-400">Localized warnings in 6 regional languages</p>
        </div>
        <button
          onClick={handleRegenerate}
          disabled={loading}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 hover:text-white rounded-lg border border-slate-700/50 flex items-center gap-1.5 transition-all text-xs font-semibold"
          title="Force Gemini AI regeneration"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          <span>Regen AI</span>
        </button>
      </div>

      {/* Language Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-slate-900/60 border border-slate-800/80 rounded-lg">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setSelectedLang(lang.code)}
            className={`flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded transition-all ${
              selectedLang === lang.code
                ? 'bg-blue-600 text-white shadow shadow-blue-500/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <span>{lang.flag}</span>
            <span>{lang.label}</span>
          </button>
        ))}
      </div>

      {/* Advisories content */}
      <div className="space-y-3">
        {/* General Public Card */}
        <div className="glass-card p-4 border-l-4 border-l-blue-500 flex gap-3">
          <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg h-9 w-9 flex items-center justify-center shrink-0 border border-blue-500/20">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">General Public</h4>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {getAdvisoryText('general')}
            </p>
          </div>
        </div>

        {/* Vulnerable Groups Card */}
        <div className="glass-card p-4 border-l-4 border-l-orange-500 flex gap-3">
          <div className="p-2 bg-orange-500/10 text-orange-400 rounded-lg h-9 w-9 flex items-center justify-center shrink-0 border border-orange-500/20">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Vulnerable Groups</h4>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {getAdvisoryText('vulnerable')}
            </p>
            <p className="text-[9px] text-slate-500 mt-1 font-medium italic">Includes elderly, children, asthma & heart patients</p>
          </div>
        </div>

        {/* Outdoor Workers Card */}
        <div className="glass-card p-4 border-l-4 border-l-amber-500 flex gap-3">
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg h-9 w-9 flex items-center justify-center shrink-0 border border-amber-500/20">
            <Hammer className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Outdoor Workers</h4>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {getAdvisoryText('outdoor_workers')}
            </p>
            <p className="text-[9px] text-slate-500 mt-1 font-medium italic">Includes construction workers, street vendors, delivery personnel</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvisoryPanel;

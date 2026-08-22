import React, { useState } from 'react';
import { CITIES } from '../../utils/constants';
import { Activity, RefreshCw, Sun, Moon, Radio } from 'lucide-react';
import { dataApi } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

const Navbar = ({ activeCity, onCityChange, dataFreshness, onRefresh }) => {
  const { theme, toggleTheme } = useTheme();
  const [ingesting, setIngesting] = useState(false);

  const handleTriggerIngestion = async () => {
    setIngesting(true);
    try {
      await dataApi.ingest();
      setTimeout(() => {
        onRefresh();
        setIngesting(false);
      }, 2500);
    } catch (e) {
      console.error(e);
      setIngesting(false);
      alert('Ingestion trigger: ' + e.message);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] px-5 py-2.5 flex items-center justify-between shadow-sm transition-colors">
      {/* Brand & Platform Identification */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-[var(--accent-emerald-subtle)] border border-[var(--accent-emerald-border)] flex items-center justify-center text-[var(--accent-emerald)] shadow-sm">
          <Activity className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-heading font-extrabold text-base sm:text-lg tracking-tight text-[var(--text-primary)]">
              VAYUDRISHTI
            </span>
            <span className="font-heading text-xs font-semibold px-2 py-0.5 rounded bg-[var(--accent-emerald-subtle)] text-[var(--accent-emerald)] border border-[var(--accent-emerald-border)]">
              वायुदृष्टि
            </span>
            <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
              <Radio className="h-2.5 w-2.5 text-[var(--accent-emerald)] animate-pulse" />
              CPCB / CAAQMS LIVE
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] hidden sm:block font-normal">
            National Urban Air Quality & Atmospheric Intelligence Platform
          </p>
        </div>
      </div>

      {/* Action Controls & Selectors */}
      <div className="flex items-center gap-3">
        {/* City Picker */}
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-[var(--text-secondary)] font-medium hidden lg:inline">
            City:
          </label>
          <select
            value={activeCity}
            onChange={(e) => onCityChange(e.target.value)}
            className="input-base text-xs font-semibold py-1.5 px-2.5 cursor-pointer"
          >
            {Object.entries(CITIES).map(([key, city]) => (
              <option key={key} value={key}>
                {city.name}
              </option>
            ))}
          </select>
        </div>

        {/* Live Ingestion Button */}
        <button
          onClick={handleTriggerIngestion}
          disabled={ingesting}
          className="btn-primary text-xs py-1.5 px-3"
          title="Trigger real-time telemetry ingestion job"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${ingesting ? 'animate-spin' : ''}`} />
          <span className="hidden md:inline">{ingesting ? 'Syncing...' : 'Ingest Feed'}</span>
        </button>

        {/* Theme Switcher Toggle */}
        <button
          onClick={toggleTheme}
          className="h-8 w-8 rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-active)] transition-all active:scale-95"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4 text-[var(--accent-amber)]" />
          ) : (
            <Moon className="h-4 w-4 text-[var(--accent-sky)]" />
          )}
        </button>

        {/* Freshness Timestamp */}
        {dataFreshness && (
          <div className="text-right hidden xl:block pl-2 border-l border-[var(--border-subtle)]">
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-mono">Last Sync</p>
            <p className="text-xs font-mono font-semibold text-[var(--text-primary)]">
              {new Date(dataFreshness).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;

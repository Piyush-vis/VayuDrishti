import React, { useState } from 'react';
import { CITIES } from '../../utils/constants';
import { Activity, RefreshCw, Sun, Moon, Radio, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { dataApi } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

const Navbar = ({ activeCity, onCityChange, dataFreshness, onRefresh, sidebarOpen, onToggleSidebar }) => {
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
    <header className="sticky top-0 z-50 w-full bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] px-4 sm:px-5 py-2 flex items-center justify-between shadow-sm transition-colors shrink-0">
      {/* Brand & Sidebar Toggle */}
      <div className="flex items-center gap-3">
        {/* Toggle Sidebar Button */}
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] transition-all cursor-pointer"
          title={sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
          aria-label="Toggle Sidebar"
        >
          {sidebarOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeftOpen className="h-4 w-4" />
          )}
        </button>

        <div className="h-8 w-8 rounded-lg bg-[var(--accent-emerald-subtle)] border border-[var(--accent-emerald-border)] flex items-center justify-center text-[var(--accent-emerald)] shadow-sm shrink-0">
          <Activity className="h-4.5 w-4.5" />
        </div>
        
        <div>
          <div className="flex items-center gap-2">
            <span className="font-heading font-extrabold text-sm sm:text-base tracking-tight text-[var(--text-primary)]">
              VAYUDRISHTI
            </span>
            <span className="font-heading text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[var(--accent-emerald-subtle)] text-[var(--accent-emerald)] border border-[var(--accent-emerald-border)]">
              वायुदृष्टि
            </span>
            <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
              <Radio className="h-2 w-2 text-[var(--accent-emerald)] animate-pulse" />
              CPCB / CAAQMS LIVE
            </span>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] hidden sm:block font-normal leading-tight">
            National Urban Air Quality & Atmospheric Intelligence Platform
          </p>
        </div>
      </div>

      {/* Action Controls & Selectors */}
      <div className="flex items-center gap-2.5">
        {/* City Picker */}
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-[var(--text-secondary)] font-medium hidden lg:inline">
            City:
          </label>
          <select
            value={activeCity}
            onChange={(e) => onCityChange(e.target.value)}
            className="input-base text-xs font-semibold py-1 px-2.5 cursor-pointer"
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
          className="btn-primary text-xs py-1 px-3"
          title="Trigger real-time telemetry ingestion job"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${ingesting ? 'animate-spin' : ''}`} />
          <span className="hidden md:inline">{ingesting ? 'Syncing...' : 'Ingest Feed'}</span>
        </button>

        {/* Theme Switcher Toggle */}
        <button
          onClick={toggleTheme}
          className="h-7 w-7 rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-active)] transition-all active:scale-95 cursor-pointer"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? (
            <Sun className="h-3.5 w-3.5 text-[var(--accent-amber)]" />
          ) : (
            <Moon className="h-3.5 w-3.5 text-[var(--accent-sky)]" />
          )}
        </button>

        {/* Freshness Timestamp */}
        {dataFreshness && (
          <div className="text-right hidden xl:block pl-2 border-l border-[var(--border-subtle)]">
            <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider font-mono">Last Sync</p>
            <p className="text-[11px] font-mono font-semibold text-[var(--text-primary)]">
              {new Date(dataFreshness).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;

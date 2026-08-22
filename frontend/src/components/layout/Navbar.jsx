import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { CITIES } from '../../utils/constants';
import { 
  MapPin, 
  Search, 
  RefreshCw, 
  Sun, 
  Moon, 
  Menu, 
  X, 
  Radio, 
  Activity, 
  TrendingUp, 
  ShieldAlert, 
  BellRing, 
  BarChart3, 
  Crosshair 
} from 'lucide-react';
import { dataApi } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

const NAV_LINKS = [
  { path: '/', label: 'Overview & Map', icon: Activity },
  { path: '/predictions', label: '72H Predictions', icon: TrendingUp },
  { path: '/enforcement', label: 'Enforcement Desk', icon: ShieldAlert },
  { path: '/war-room', label: 'Incident War Room', icon: Crosshair },
  { path: '/advisory', label: 'Citizen Portal', icon: BellRing },
  { path: '/compare', label: 'City Rankings', icon: BarChart3 },
];

const Navbar = ({ activeCity, onCityChange, dataFreshness, onRefresh, toggleSidebar, sidebarOpen }) => {
  const { theme, toggleTheme } = useTheme();
  const [ingesting, setIngesting] = useState(false);
  const location = useLocation();

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
      alert('Ingestion error: ' + e.message);
    }
  };

  return (
    <header className="w-full bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] px-4 py-2.5 flex items-center justify-between z-50 shrink-0 transition-colors">
      {/* Left: Brand + City Search Dropdown */}
      <div className="flex items-center gap-4">
        {/* Toggle Sidebar Button */}
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-md hover:bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] cursor-pointer"
          title={sidebarOpen ? "Hide Sidebar Rail" : "Show Sidebar Rail"}
        >
          {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>

        {/* Brand Logo */}
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded bg-[var(--accent-sky)] flex items-center justify-center text-white font-extrabold text-xs shadow-sm">
            AQI
          </div>
          <div>
            <span className="font-heading font-black text-sm tracking-tight text-[var(--text-primary)] hidden sm:inline">
              VAYUDRISHTI
            </span>
            <span className="text-[10px] font-mono text-[var(--accent-emerald)] ml-1.5 hidden md:inline">
              ● CPCB LIVE
            </span>
          </div>
        </div>

        {/* Search & City Selector Bar (aqi.in style) */}
        <div className="relative flex items-center">
          <MapPin className="absolute left-2.5 h-3.5 w-3.5 text-[var(--text-muted)] pointer-events-none" />
          <select
            value={activeCity}
            onChange={(e) => onCityChange(e.target.value)}
            className="input-search pl-8 pr-7 py-1 text-xs font-semibold cursor-pointer appearance-none bg-[var(--bg-surface-elevated)] min-w-[140px] sm:min-w-[180px]"
          >
            {Object.entries(CITIES).map(([key, city]) => (
              <option key={key} value={key}>
                {city.name}, India
              </option>
            ))}
          </select>
          <span className="absolute right-2.5 text-[9px] text-[var(--text-muted)] pointer-events-none">▼</span>
        </div>
      </div>

      {/* Center: Top Quick Navigation Tabs */}
      <nav className="hidden xl:flex items-center gap-1.5">
        {NAV_LINKS.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.path;
          return (
            <NavLink
              key={link.path}
              to={link.path}
              className={`btn-pill ${isActive ? 'btn-pill-active' : ''}`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Right: Actions, Ingest, Lights Switch */}
      <div className="flex items-center gap-2.5">
        {/* Ingest Feed Button */}
        <button
          onClick={handleTriggerIngestion}
          disabled={ingesting}
          className="btn-primary text-xs py-1 px-2.5"
          title="Trigger live CPCB ingestion feed"
        >
          <RefreshCw className={`h-3 w-3 ${ingesting ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{ingesting ? 'Syncing...' : 'Ingest Feed'}</span>
        </button>

        {/* Lights On / Lights Off Toggle (Exact aqi.in style) */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-heading font-semibold transition-all cursor-pointer"
          title="Toggle Light / Dark mode"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="h-3.5 w-3.5 text-[var(--accent-amber)]" />
              <span className="hidden md:inline">Lights On</span>
            </>
          ) : (
            <>
              <Moon className="h-3.5 w-3.5 text-[var(--accent-sky)]" />
              <span className="hidden md:inline">Lights Off</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};

export default Navbar;

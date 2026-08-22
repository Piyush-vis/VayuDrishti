import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  ShieldAlert,
  BellRing,
  BarChart3,
  Radio,
  History,
  Crosshair,
  Sparkles
} from 'lucide-react';
import { useReplay } from '../../context/ReplayContext';

const Sidebar = ({ isOpen = true }) => {
  const { episodes, episode, enterReplay, exitReplay } = useReplay();
  
  const menuItems = [
    { path: '/', label: 'Command Center', icon: LayoutDashboard },
    { path: '/war-room', label: 'Incident War Room', icon: Crosshair },
    { path: '/predictions', label: '72H Predictions', icon: TrendingUp },
    { path: '/enforcement', label: 'Enforcement Desk', icon: ShieldAlert },
    { path: '/advisory', label: 'Citizen Portal', icon: BellRing },
    { path: '/compare', label: 'City Analytics', icon: BarChart3 }
  ];

  return (
    <aside 
      className={`bg-[var(--bg-surface)] border-r border-[var(--border-subtle)] flex flex-col justify-between shrink-0 transition-all duration-200 ease-in-out ${
        isOpen ? 'w-56' : 'w-16'
      }`}
    >
      <div className="py-4 px-2.5 space-y-5 overflow-x-hidden">
        {/* Navigation Section */}
        <div>
          {isOpen && (
            <p className="px-2.5 text-[10px] font-heading font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 transition-opacity">
              Navigation
            </p>
          )}
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  title={!isOpen ? item.label : undefined}
                  className={({ isActive }) =>
                    `w-full flex items-center ${isOpen ? 'gap-3 px-3 py-2' : 'justify-center py-2 px-0'} rounded-lg text-xs font-heading font-semibold transition-all ${
                      isActive
                        ? 'bg-[var(--accent-emerald-subtle)] text-[var(--accent-emerald)] border border-[var(--accent-emerald-border)] shadow-sm'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--text-primary)] border border-transparent'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[var(--accent-emerald)]' : 'text-[var(--text-muted)]'}`} />
                      {isOpen && <span className="truncate">{item.label}</span>}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Operating Mode / Crisis Replay */}
        <div>
          {isOpen && (
            <p className="px-2.5 text-[10px] font-heading font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 transition-opacity">
              Operating Mode
            </p>
          )}
          <div className="space-y-1">
            <button
              onClick={exitReplay}
              title={!isOpen ? "Real-time Stream" : undefined}
              className={`w-full flex items-center ${isOpen ? 'gap-3 px-3 py-2' : 'justify-center py-2 px-0'} rounded-lg text-xs font-heading font-semibold transition-all border text-left cursor-pointer ${
                !episode
                  ? 'bg-[var(--accent-emerald-subtle)] text-[var(--accent-emerald)] border-[var(--accent-emerald-border)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--text-primary)] border-transparent'
              }`}
            >
              <Radio className={`h-4 w-4 shrink-0 ${!episode ? 'text-[var(--accent-emerald)] animate-pulse' : 'text-[var(--text-muted)]'}`} />
              {isOpen && (
                <div className="flex-1 min-w-0">
                  <span className="block font-bold truncate">Real-time Stream</span>
                  <span className="block text-[10px] text-[var(--text-muted)] font-normal truncate">Live sensor feeds</span>
                </div>
              )}
            </button>

            {episodes.map((ep) => (
              <button
                key={ep.episode_id}
                onClick={() => enterReplay(ep)}
                title={ep.description}
                className={`w-full flex items-center ${isOpen ? 'gap-3 px-3 py-2' : 'justify-center py-2 px-0'} rounded-lg text-xs font-heading font-semibold transition-all border text-left cursor-pointer ${
                  episode?.episode_id === ep.episode_id
                    ? 'bg-[var(--accent-purple-subtle)] text-[var(--accent-purple)] border-[var(--accent-purple-border)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--text-primary)] border-transparent'
                }`}
              >
                <History className="h-4 w-4 shrink-0" />
                {isOpen && (
                  <div className="flex-1 min-w-0">
                    <span className="block font-bold leading-tight truncate">{ep.label}</span>
                    <span className="block text-[10px] text-[var(--text-muted)] font-normal truncate">Crisis Episode</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Intelligence Status Badge at Sidebar Bottom */}
      <div className={`p-2.5 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] ${!isOpen ? 'text-center' : ''}`}>
        <div className={`flex items-center ${isOpen ? 'gap-2' : 'justify-center'} text-[11px] text-[var(--text-secondary)]`}>
          <Sparkles className="h-3.5 w-3.5 text-[var(--accent-emerald)] shrink-0" />
          {isOpen && <span className="font-heading font-semibold truncate">Groq & XGBoost L168</span>}
        </div>
        {isOpen && <p className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5 truncate">VayuDrishti v2.4 Release</p>}
      </div>
    </aside>
  );
};

export default Sidebar;

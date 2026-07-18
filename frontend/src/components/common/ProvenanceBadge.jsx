import React from 'react';

// Data-provenance pill shown on every data panel: LIVE / CACHED / HISTORICAL
// REPLAY / SIMULATED / MODELLED. Full honesty about where each number comes
// from is a deliberate product feature — keep labels blunt, never decorative.
const STYLES = {
  live: { label: 'LIVE', cls: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10', pulse: true },
  api: { label: 'LIVE', cls: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10', pulse: true },
  'live-hybrid': { label: 'LIVE + MODELLED', cls: 'text-teal-300 border-teal-500/40 bg-teal-500/10', pulse: true },
  cached: { label: 'CACHED', cls: 'text-sky-400 border-sky-500/40 bg-sky-500/10' },
  replay: { label: 'HISTORICAL REPLAY', cls: 'text-purple-300 border-purple-500/40 bg-purple-500/10' },
  simulated: { label: 'SIMULATED', cls: 'text-amber-400 border-amber-500/40 bg-amber-500/10' },
  modelled: { label: 'MODELLED', cls: 'text-amber-400 border-amber-500/40 bg-amber-500/10' },
  xgboost_v1: { label: 'ML MODEL', cls: 'text-blue-300 border-blue-500/40 bg-blue-500/10' },
  statistical_fallback: { label: 'STATISTICAL', cls: 'text-amber-400 border-amber-500/40 bg-amber-500/10' },
};

const ProvenanceBadge = ({ source, timestamp, className = '' }) => {
  if (!source) return null;
  const style = STYLES[source] || {
    label: String(source).toUpperCase(),
    cls: 'text-slate-300 border-slate-600 bg-slate-800/60',
  };
  const time = timestamp
    ? new Date(timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[8px] font-bold uppercase tracking-widest whitespace-nowrap ${style.cls} ${className}`}
      title={`Data provenance: ${style.label}${time ? ` at ${time}` : ''}`}
    >
      {style.pulse && <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse shrink-0" />}
      {style.label}
      {time && source === 'cached' && <span className="opacity-80">{time}</span>}
    </span>
  );
};

export default ProvenanceBadge;

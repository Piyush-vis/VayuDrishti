import React from 'react';

const STYLES = {
  live: { label: 'LIVE SENSOR', cls: 'text-[var(--accent-emerald)] bg-[var(--accent-emerald-subtle)] border-[var(--accent-emerald-border)]', pulse: true },
  api: { label: 'LIVE SENSOR', cls: 'text-[var(--accent-emerald)] bg-[var(--accent-emerald-subtle)] border-[var(--accent-emerald-border)]', pulse: true },
  'live-hybrid': { label: 'LIVE + MODELLED', cls: 'text-[var(--accent-sky)] bg-[var(--accent-sky-subtle)] border-[var(--accent-sky-border)]', pulse: true },
  cached: { label: 'CACHED RESULT', cls: 'text-[var(--accent-sky)] bg-[var(--accent-sky-subtle)] border-[var(--accent-sky-border)]' },
  replay: { label: 'CRISIS REPLAY', cls: 'text-[var(--accent-purple)] bg-[var(--accent-purple-subtle)] border-[var(--accent-purple-border)]' },
  simulated: { label: 'SIMULATED', cls: 'text-[var(--accent-amber)] bg-[var(--accent-amber-subtle)] border-[var(--accent-amber-border)]' },
  modelled: { label: 'MODELLED', cls: 'text-[var(--accent-amber)] bg-[var(--accent-amber-subtle)] border-[var(--accent-amber-border)]' },
  xgboost_v1: { label: 'XGBOOST ML', cls: 'text-[var(--accent-sky)] bg-[var(--accent-sky-subtle)] border-[var(--accent-sky-border)]' },
  statistical_fallback: { label: 'STATISTICAL', cls: 'text-[var(--accent-amber)] bg-[var(--accent-amber-subtle)] border-[var(--accent-amber-border)]' },
};

const ProvenanceBadge = ({ source, timestamp, className = '' }) => {
  if (!source) return null;
  const style = STYLES[source] || {
    label: String(source).toUpperCase(),
    cls: 'text-[var(--text-secondary)] bg-[var(--bg-surface-elevated)] border-[var(--border-subtle)]',
  };
  const time = timestamp
    ? new Date(timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-mono font-semibold tracking-wide whitespace-nowrap ${style.cls} ${className}`}
      title={`Telemetry provenance: ${style.label}${time ? ` at ${time}` : ''}`}
    >
      {style.pulse && <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse shrink-0" />}
      <span>{style.label}</span>
      {time && source === 'cached' && <span className="opacity-75">· {time}</span>}
    </span>
  );
};

export default ProvenanceBadge;

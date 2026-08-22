import React, { useEffect, useState } from 'react';
import { HeartPulse, Users, Activity, ShieldPlus, Info } from 'lucide-react';
import { healthApi } from '../../services/api';
import { useReplay } from '../../context/ReplayContext';
import ProvenanceBadge from '../common/ProvenanceBadge';

const fmt = (n) => (n == null ? '–' : Number(n).toLocaleString('en-IN'));

const HealthImpactPanel = ({ city }) => {
  const { replayAtDebounced } = useReplay();
  const [data, setData] = useState(null);
  const [action, setAction] = useState(null);
  const [showAssumptions, setShowAssumptions] = useState(false);

  useEffect(() => {
    if (!city) return;
    let cancelled = false;
    Promise.all([healthApi.city(city), healthApi.action(city, 30)])
      .then(([c, a]) => { if (!cancelled) { setData(c); setAction(a); } })
      .catch((e) => console.error('Health impact failed:', e));
    return () => { cancelled = true; };
  }, [city, replayAtDebounced]);

  if (!data || !data.available) return null;
  const aqli = data.lenses.aqli;
  const who = data.lenses.who_mortality;

  return (
    <div className="bento-card p-5 space-y-4">
      <div className="flex justify-between items-start gap-2">
        <div className="flex items-center gap-2">
          <HeartPulse className="h-4 w-4 text-[var(--accent-crimson)]" />
          <h3 className="text-xs font-heading font-bold text-[var(--text-primary)] uppercase tracking-wider">
            Public Health & Demographic Impact
          </h3>
        </div>
        <ProvenanceBadge source={data.provenance === 'replay' ? 'replay' : 'live'} />
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-3 text-center">
          <Users className="h-4 w-4 text-[var(--accent-sky)] mx-auto mb-1" />
          <div className="text-lg font-mono font-bold text-[var(--text-primary)] leading-none">{fmt(data.exposed_population)}</div>
          <div className="text-[10px] font-heading font-semibold uppercase text-[var(--text-muted)] mt-1.5">Population Exposed</div>
        </div>
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-3 text-center">
          <Activity className="h-4 w-4 text-[var(--accent-amber)] mx-auto mb-1" />
          <div className="text-lg font-mono font-bold text-[var(--text-primary)] leading-none">{aqli.life_years_lost_per_resident}</div>
          <div className="text-[10px] font-heading font-semibold uppercase text-[var(--text-muted)] mt-1.5">Life Yrs Lost / Resident</div>
        </div>
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-3 text-center">
          <HeartPulse className="h-4 w-4 text-[var(--accent-crimson)] mx-auto mb-1" />
          <div className="text-lg font-mono font-bold text-[var(--text-primary)] leading-none">{who.excess_deaths_per_day}</div>
          <div className="text-[10px] font-heading font-semibold uppercase text-[var(--text-muted)] mt-1.5">Excess Mortality / Day</div>
        </div>
      </div>

      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
        Population-weighted PM2.5: <span className="font-mono font-bold text-[var(--text-primary)]">{data.population_weighted_pm25} µg/m³</span>.
        {' '}{aqli.headline}.
      </p>

      {/* 30% reduction scenario */}
      {action && (
        <div className="rounded-lg border border-[var(--accent-emerald-border)] bg-[var(--accent-emerald-subtle)] p-3 space-y-1.5">
          <div className="flex items-center gap-2 text-[var(--accent-emerald)]">
            <ShieldPlus className="h-4 w-4" />
            <span className="text-xs font-heading font-bold uppercase tracking-wider">Targeted Enforcement Impact (-30% PM2.5)</span>
          </div>
          <div className="flex items-center gap-4 flex-wrap text-xs">
            <span className="text-[var(--text-primary)]">Protects <span className="font-mono font-bold text-[var(--accent-emerald)]">{fmt(action.people_protected)}</span> residents</span>
            <span className="text-[var(--text-primary)]">Averts <span className="font-mono font-bold text-[var(--accent-emerald)]">~{action.deaths_averted_per_day}</span> deaths/day</span>
          </div>
        </div>
      )}

      {/* Methodological assumptions toggle */}
      <button
        onClick={() => setShowAssumptions(!showAssumptions)}
        className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] font-heading font-semibold uppercase tracking-wider cursor-pointer"
      >
        <Info className="h-3.5 w-3.5" /> {showAssumptions ? 'Hide' : 'Show'} WHO / AQLI Model Parameters
      </button>
      {showAssumptions && (
        <div className="space-y-1 text-xs text-[var(--text-secondary)] font-mono leading-relaxed border-t border-[var(--border-subtle)] pt-2.5">
          {Object.entries(data.assumptions).map(([k, v]) => (
            <div key={k}><span className="text-[var(--text-muted)] font-bold uppercase">{k}:</span> {v}</div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HealthImpactPanel;

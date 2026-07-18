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
    <div className="glass-card p-5 space-y-4">
      <div className="flex justify-between items-start gap-2">
        <div className="flex items-center gap-2">
          <HeartPulse className="h-4 w-4 text-rose-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Human Impact</h3>
        </div>
        <ProvenanceBadge source={data.provenance === 'replay' ? 'replay' : 'live'} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-center">
          <Users className="h-4 w-4 text-sky-400 mx-auto mb-1" />
          <div className="text-lg font-black text-white leading-none">{fmt(data.exposed_population)}</div>
          <div className="text-[8px] font-bold uppercase tracking-wider text-slate-500 mt-1">People exposed</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-center">
          <Activity className="h-4 w-4 text-amber-400 mx-auto mb-1" />
          <div className="text-lg font-black text-white leading-none">{aqli.life_years_lost_per_resident}</div>
          <div className="text-[8px] font-bold uppercase tracking-wider text-slate-500 mt-1">Life-yrs lost / resident</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-center">
          <HeartPulse className="h-4 w-4 text-rose-400 mx-auto mb-1" />
          <div className="text-lg font-black text-white leading-none">{who.excess_deaths_per_day}</div>
          <div className="text-[8px] font-bold uppercase tracking-wider text-slate-500 mt-1">Excess deaths / day</div>
        </div>
      </div>

      <p className="text-[10px] text-slate-400 leading-relaxed">
        Population-weighted PM2.5 is <span className="font-bold text-slate-200">{data.population_weighted_pm25} µg/m³</span>.
        {' '}{aqli.headline}.
      </p>

      {action && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3 space-y-1">
          <div className="flex items-center gap-2 text-emerald-300">
            <ShieldPlus className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">If enforcement cuts PM2.5 by 30%</span>
          </div>
          <div className="flex items-center gap-4 flex-wrap text-[11px]">
            <span className="text-slate-200">Protects <span className="font-black text-emerald-300">{fmt(action.people_protected)}</span> people</span>
            <span className="text-slate-200">Averts <span className="font-black text-emerald-300">~{action.deaths_averted_per_day}</span> deaths/day</span>
          </div>
        </div>
      )}

      <button
        onClick={() => setShowAssumptions(!showAssumptions)}
        className="flex items-center gap-1 text-[9px] text-slate-500 hover:text-slate-300 uppercase tracking-wider font-bold"
      >
        <Info className="h-3 w-3" /> {showAssumptions ? 'Hide' : 'Show'} coefficients & sources
      </button>
      {showAssumptions && (
        <div className="space-y-1 text-[9px] text-slate-500 leading-relaxed border-t border-slate-800 pt-2">
          {Object.entries(data.assumptions).map(([k, v]) => (
            <div key={k}><span className="text-slate-400 font-semibold uppercase">{k}:</span> {v}</div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HealthImpactPanel;

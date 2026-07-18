import { motion } from 'framer-motion';
import React, { useState, useEffect, useRef } from 'react';
import {
  Radio, Crosshair, Wind, Landmark, HeartPulse, Volume2, Square,
  Timer, ChevronRight, AlertTriangle, CheckCircle2, Loader2,
} from 'lucide-react';
import {
  aqiApi, attributionApi, grapApi, healthApi, trajectoryApi, advisoryApi,
} from '../services/api';
import { useReplay } from '../context/ReplayContext';
import { useSpeech } from '../hooks/useSpeech';
import ProvenanceBadge from '../components/common/ProvenanceBadge';

const STEPS = [
  { key: 'signal', label: 'Signal detected', icon: Radio },
  { key: 'attribution', label: 'Source attributed', icon: Crosshair },
  { key: 'trajectory', label: 'Cause traced', icon: Wind },
  { key: 'grap', label: 'Response drafted', icon: Landmark },
  { key: 'health', label: 'Impact quantified', icon: HeartPulse },
  { key: 'advisory', label: 'Citizens alerted', icon: Volume2 },
];

// Documented government lag reference (never an invented figure):
// Delhi 10 Nov 2025 hit AQI 362; GRAP-III came only 11 Nov at 425+ — >24h.
const GOV_LAG_LABEL = '> 24 hours';
const GOV_LAG_CITATION = 'Delhi, 10-11 Nov 2025: AQI hit 362 on the 10th; GRAP-III invoked only on the 11th at 425+ (ThePrint/CEEW)';

function WarRoom({ activeCity }) {
  const { episode, replayAtDebounced } = useReplay();
  const { supported, speak, stop, speakingKey } = useSpeech();
  const [incident, setIncident] = useState(null);
  const [stepStates, setStepStates] = useState({});
  const [elapsedMs, setElapsedMs] = useState(null);
  const [running, setRunning] = useState(false);
  const runId = useRef(0);

  const runIncident = async () => {
    const myRun = ++runId.current;
    setRunning(true);
    setIncident(null);
    setElapsedMs(null);
    setStepStates({ signal: 'running' });
    const t0 = performance.now();

    try {
      // 1. Signal: worst station in the city right now (or as-of replay time)
      const readings = await aqiApi.current(activeCity);
      if (myRun !== runId.current) return;
      if (!readings || readings.length === 0) {
        setStepStates({ signal: 'empty' });
        setRunning(false);
        return;
      }
      const worst = readings.reduce((a, b) => (b.reading.aqi > a.reading.aqi ? b : a));
      const inc = { worst, city: activeCity };
      setStepStates((s) => ({ ...s, signal: 'done', attribution: 'running' }));

      // 2. Attribution (CPF confidence)
      const attr = await attributionApi.sources(activeCity, worst.station.zone);
      if (myRun !== runId.current) return;
      inc.attribution = attr;
      setStepStates((s) => ({ ...s, attribution: 'done', trajectory: 'running' }));

      // 3. Trajectory (causal provenance)
      const traj = await trajectoryApi.back(worst.station.station_id, 30);
      if (myRun !== runId.current) return;
      inc.trajectory = traj;
      setStepStates((s) => ({ ...s, trajectory: 'done', grap: 'running' }));

      // 4. GRAP response
      const grap = await grapApi.status(activeCity);
      if (myRun !== runId.current) return;
      inc.grap = grap;
      setStepStates((s) => ({ ...s, grap: 'done', health: 'running' }));

      // 5. Health impact
      const [health, action] = await Promise.all([
        healthApi.city(activeCity),
        healthApi.action(activeCity, 30),
      ]);
      if (myRun !== runId.current) return;
      inc.health = health;
      inc.action = action;
      setStepStates((s) => ({ ...s, health: 'done', advisory: 'running' }));

      // 6. Advisory (real API, replay-aware; voice-ready)
      inc.category = categoryFor(worst.reading.aqi);
      const adv = await advisoryApi.citizen(activeCity, worst.station.zone);
      if (myRun !== runId.current) return;
      inc.advisory = adv.advisories;
      setStepStates((s) => ({ ...s, advisory: 'done' }));

      const t1 = performance.now();
      if (myRun !== runId.current) return;
      setElapsedMs(t1 - t0);
      setIncident(inc);
    } catch (e) {
      console.error('War-room run failed:', e);
    } finally {
      if (myRun === runId.current) setRunning(false);
    }
  };

  useEffect(() => {
    runIncident();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCity, replayAtDebounced]);

  const advisoryLine = incident?.advisory
    ? (incident.advisory.general?.hi || incident.advisory.general?.en || '')
    : '';
  const advisoryLineEn = incident?.advisory?.general?.en || '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6 w-full max-w-6xl mx-auto"
    >
      {/* Header + counter */}
      <div className="glass-card p-6 bg-gradient-to-br from-slate-900/60 to-slate-950/60">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
              <h2 className="text-lg font-black text-white uppercase tracking-wider">Incident War Room</h2>
              {episode && <ProvenanceBadge source="replay" />}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Live signal-to-intervention pipeline for {activeCity.charAt(0).toUpperCase() + activeCity.slice(1)}
            </p>
          </div>
          <button
            onClick={runIncident}
            disabled={running}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold transition-all active:scale-95"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
            {running ? 'Running pipeline…' : 'Re-run incident'}
          </button>
        </div>

        {/* Signal -> Intervention counter */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
            <div className="flex items-center gap-2 text-emerald-300 mb-1">
              <Timer className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">VayuDrishti · signal → drafted intervention</span>
            </div>
            <div className="text-3xl font-black text-emerald-400">
              {elapsedMs == null ? '…' : `${(elapsedMs / 1000).toFixed(1)}s`}
            </div>
            <p className="text-[9px] text-slate-500 mt-1">Wall-clock to attribute, trace, draft the GRAP order, quantify impact, and prepare the advisory.</p>
          </div>
          <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4">
            <div className="flex items-center gap-2 text-red-300 mb-1">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Documented government lag</span>
            </div>
            <div className="text-3xl font-black text-red-400">{GOV_LAG_LABEL}</div>
            <p className="text-[9px] text-slate-500 mt-1">{GOV_LAG_CITATION}</p>
          </div>
        </div>
      </div>

      {/* Pipeline stepper */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {STEPS.map((step, i) => {
            const st = stepStates[step.key];
            const Icon = step.icon;
            return (
              <React.Fragment key={step.key}>
                <div className={`flex flex-col items-center gap-1.5 px-2 min-w-[90px] ${
                  st === 'done' ? 'text-emerald-400' : st === 'running' ? 'text-blue-400' : 'text-slate-600'
                }`}>
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 ${
                    st === 'done' ? 'border-emerald-500/50 bg-emerald-500/10'
                    : st === 'running' ? 'border-blue-500/50 bg-blue-500/10 animate-pulse'
                    : 'border-slate-700 bg-slate-900'
                  }`}>
                    {st === 'done' ? <CheckCircle2 className="h-5 w-5" />
                      : st === 'running' ? <Loader2 className="h-5 w-5 animate-spin" />
                      : <Icon className="h-5 w-5" />}
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-center leading-tight">{step.label}</span>
                </div>
                {i < STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-slate-700 shrink-0" />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Evidence bundle */}
      {incident && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Signal */}
          <div className="glass-card p-5 space-y-2">
            <StepHeader icon={Radio} title="1 · Signal" />
            <div className="flex items-end gap-3">
              <div className="text-4xl font-black" style={{ color: aqiColor(incident.worst.reading.aqi) }}>
                {Math.round(incident.worst.reading.aqi)}
              </div>
              <div className="pb-1">
                <div className="text-sm font-bold text-white">{incident.worst.station.name}</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">{incident.worst.station.zone} · {incident.category}</div>
              </div>
            </div>
            <p className="text-[10px] text-slate-400">
              PM2.5 {incident.worst.reading.pm25} µg/m³ · worst of {incident.city} stations this hour.
            </p>
          </div>

          {/* Attribution */}
          <div className="glass-card p-5 space-y-2">
            <StepHeader icon={Crosshair} title="2 · Source attribution" />
            {incident.attribution && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">
                    {topSource(incident.attribution.attributions)}
                  </span>
                  <span className={`text-[10px] font-black ${confColor(incident.attribution.confidence?.band)}`}>
                    {Math.round((incident.attribution.confidence?.overall || 0) * 100)}% confidence · {incident.attribution.confidence?.band}
                  </span>
                </div>
                <div className="flex gap-1 h-2 rounded-full overflow-hidden">
                  {Object.entries(incident.attribution.attributions).map(([k, v]) => (
                    <div key={k} title={`${k}: ${Math.round(v * 100)}%`} style={{ width: `${v * 100}%`, backgroundColor: sourceColor(k) }} />
                  ))}
                </div>
                <p className="text-[10px] text-slate-400">
                  Dominant upwind sector: <span className="text-slate-200 font-semibold">{incident.attribution.wind_rose?.dominant?.sector || 'n/a'}</span> (CPF method).
                </p>
              </>
            )}
          </div>

          {/* Trajectory */}
          <div className="glass-card p-5 space-y-2">
            <StepHeader icon={Wind} title="3 · Causal trace" />
            {incident.trajectory && (
              <p className="text-xs text-slate-300 leading-relaxed">{incident.trajectory.summary}</p>
            )}
            {incident.trajectory && (
              <div className="text-[9px] text-slate-500">
                {incident.trajectory.total_travel_km} km traced · {incident.trajectory.fires_crossed}/{incident.trajectory.fires_total} fires crossed
              </div>
            )}
          </div>

          {/* GRAP */}
          <div className="glass-card p-5 space-y-2">
            <StepHeader icon={Landmark} title="4 · Drafted response" />
            {incident.grap && (
              <>
                {incident.grap.recommendation === 'INVOKE_IN_ADVANCE' ? (
                  <div className="text-red-300 text-xs font-bold">
                    ⚠ Forecast crosses {incident.grap.draft_order?.basis?.threshold} in ~{incident.grap.crossing_eta_hours}h — {incident.grap.draft_order?.stage_name} order drafted {incident.grap.lead_time_hours}h early.
                  </div>
                ) : (
                  <div className="text-amber-300 text-xs font-bold">{incident.grap.rationale}</div>
                )}
                {incident.grap.draft_order && (
                  <div className="text-[10px] text-slate-400">
                    {incident.grap.draft_order.actions.length} statutory actions · trigger: {incident.grap.triggered_by}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Health */}
          <div className="glass-card p-5 space-y-2">
            <StepHeader icon={HeartPulse} title="5 · Human impact" />
            {incident.health?.available && (
              <div className="grid grid-cols-3 gap-2 text-center">
                <Metric value={fmtNum(incident.health.exposed_population)} label="exposed" />
                <Metric value={incident.health.lenses.aqli.life_years_lost_per_resident} label="life-yrs / resident" />
                <Metric value={incident.health.lenses.who_mortality.excess_deaths_per_day} label="deaths / day" />
              </div>
            )}
            {incident.action && (
              <p className="text-[10px] text-emerald-300/90">{incident.action.headline}</p>
            )}
          </div>

          {/* Advisory */}
          <div className="glass-card p-5 space-y-2">
            <StepHeader icon={Volume2} title="6 · Citizens alerted" />
            <p className="text-xs text-slate-300 leading-relaxed">{advisoryLine}</p>
            {advisoryLineEn && advisoryLineEn !== advisoryLine && (
              <p className="text-[10px] text-slate-500 leading-relaxed">{advisoryLineEn}</p>
            )}
            <button
              onClick={() => (speakingKey === 'warroom' ? stop() : speak(advisoryLine, 'hi', 'warroom'))}
              disabled={!supported || !advisoryLine}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all active:scale-95 disabled:opacity-40 ${
                speakingKey === 'warroom'
                  ? 'bg-red-600/20 border-red-500/40 text-red-300'
                  : 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300'
              }`}
            >
              {speakingKey === 'warroom' ? <Square className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              {speakingKey === 'warroom' ? 'Stop' : 'Dispatch voice advisory (हिंदी)'}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

const StepHeader = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-2 text-slate-300">
    <Icon className="h-4 w-4" />
    <h3 className="text-[10px] font-black uppercase tracking-widest">{title}</h3>
  </div>
);

const Metric = ({ value, label }) => (
  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
    <div className="text-sm font-black text-white leading-none">{value}</div>
    <div className="text-[8px] font-bold uppercase tracking-wider text-slate-500 mt-1">{label}</div>
  </div>
);

function categoryFor(aqi) {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Satisfactory';
  if (aqi <= 200) return 'Moderate';
  if (aqi <= 300) return 'Poor';
  if (aqi <= 400) return 'Very Poor';
  return 'Severe';
}
function aqiColor(aqi) {
  if (aqi <= 100) return '#22c55e';
  if (aqi <= 200) return '#eab308';
  if (aqi <= 300) return '#f97316';
  if (aqi <= 400) return '#ef4444';
  return '#a21caf';
}
function topSource(attr) {
  if (!attr) return '—';
  const [k, v] = Object.entries(attr).sort((a, b) => b[1] - a[1])[0];
  const label = { vehicular: 'Vehicular', industrial: 'Industrial', construction: 'Construction', biomass_burning: 'Biomass burning', other: 'Background' }[k] || k;
  return `${label} ${Math.round(v * 100)}%`;
}
function sourceColor(k) {
  return { vehicular: '#3b82f6', industrial: '#ef4444', construction: '#f59e0b', biomass_burning: '#8b5cf6', other: '#64748b' }[k] || '#64748b';
}
function confColor(band) {
  return band === 'high' ? 'text-emerald-400' : band === 'moderate' ? 'text-amber-400' : 'text-red-400';
}
function fmtNum(n) {
  return n == null ? '–' : Number(n).toLocaleString('en-IN');
}

export default WarRoom;

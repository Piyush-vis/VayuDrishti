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
  { key: 'signal', label: 'Signal Detected', icon: Radio },
  { key: 'attribution', label: 'Source Attributed', icon: Crosshair },
  { key: 'trajectory', label: 'Cause Traced', icon: Wind },
  { key: 'grap', label: 'Response Drafted', icon: Landmark },
  { key: 'health', label: 'Impact Quantified', icon: HeartPulse },
  { key: 'advisory', label: 'Citizens Alerted', icon: Volume2 },
];

const GOV_LAG_LABEL = '> 24 hours';
const GOV_LAG_CITATION = 'Delhi, 10-11 Nov 2025: AQI hit 362 on 10th; statutory GRAP-III invoked only on 11th at 425+ (ThePrint/CEEW)';

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

      const attr = await attributionApi.sources(activeCity, worst.station.zone);
      if (myRun !== runId.current) return;
      inc.attribution = attr;
      setStepStates((s) => ({ ...s, attribution: 'done', trajectory: 'running' }));

      const traj = await trajectoryApi.back(worst.station.station_id, 30);
      if (myRun !== runId.current) return;
      inc.trajectory = traj;
      setStepStates((s) => ({ ...s, trajectory: 'done', grap: 'running' }));

      const grap = await grapApi.status(activeCity);
      if (myRun !== runId.current) return;
      inc.grap = grap;
      setStepStates((s) => ({ ...s, grap: 'done', health: 'running' }));

      const [health, action] = await Promise.all([
        healthApi.city(activeCity),
        healthApi.action(activeCity, 30),
      ]);
      if (myRun !== runId.current) return;
      inc.health = health;
      inc.action = action;
      setStepStates((s) => ({ ...s, health: 'done', advisory: 'running' }));

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
      console.error('War-room pipeline failed:', e);
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-5 w-full max-w-7xl mx-auto"
    >
      {/* Header & Lag Comparison Card */}
      <div className="bento-card p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-crimson)] opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--accent-crimson)]" />
              </span>
              <h2 className="text-lg font-heading font-extrabold text-[var(--text-primary)] uppercase tracking-wider">
                Emergency Incident War Room
              </h2>
              {episode && <ProvenanceBadge source="replay" />}
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Automated Signal-to-Intervention pipeline for {activeCity.charAt(0).toUpperCase() + activeCity.slice(1)}
            </p>
          </div>
          <button
            onClick={runIncident}
            disabled={running}
            className="btn-primary text-xs py-2 px-4 cursor-pointer"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
            <span>{running ? 'Running Pipeline…' : 'Trigger Incident Run'}</span>
          </button>
        </div>

        {/* Signal -> Intervention Latency vs Government Lag */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div className="rounded-xl border border-[var(--accent-emerald-border)] bg-[var(--accent-emerald-subtle)] p-4">
            <div className="flex items-center gap-2 text-[var(--accent-emerald)] mb-1">
              <Timer className="h-4 w-4" />
              <span className="text-[10px] font-heading font-bold uppercase tracking-widest">VayuDrishti Signal → Action Latency</span>
            </div>
            <div className="text-3xl font-mono font-extrabold text-[var(--accent-emerald)]">
              {elapsedMs == null ? '…' : `${(elapsedMs / 1000).toFixed(1)}s`}
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] mt-1">Autonomous pipeline to attribute sources, trace trajectory, draft statutory GRAP order, and generate multi-lingual IVR advisories.</p>
          </div>
          
          <div className="rounded-xl border border-[var(--accent-crimson-border)] bg-[var(--accent-crimson-subtle)] p-4">
            <div className="flex items-center gap-2 text-[var(--accent-crimson)] mb-1">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-[10px] font-heading font-bold uppercase tracking-widest">Documented Government Response Lag</span>
            </div>
            <div className="text-3xl font-mono font-extrabold text-[var(--accent-crimson)]">{GOV_LAG_LABEL}</div>
            <p className="text-[11px] text-[var(--text-secondary)] mt-1">{GOV_LAG_CITATION}</p>
          </div>
        </div>
      </div>

      {/* Pipeline Stepper Bar */}
      <div className="bento-card p-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {STEPS.map((step, i) => {
            const st = stepStates[step.key];
            const Icon = step.icon;
            return (
              <React.Fragment key={step.key}>
                <div className={`flex flex-col items-center gap-1.5 px-3 min-w-[110px] ${
                  st === 'done' ? 'text-[var(--accent-emerald)]' : st === 'running' ? 'text-[var(--accent-sky)]' : 'text-[var(--text-muted)]'
                }`}>
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    st === 'done' ? 'border-[var(--accent-emerald)] bg-[var(--accent-emerald-subtle)]'
                    : st === 'running' ? 'border-[var(--accent-sky)] bg-[var(--accent-sky-subtle)] animate-pulse'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]'
                  }`}>
                    {st === 'done' ? <CheckCircle2 className="h-5 w-5" />
                      : st === 'running' ? <Loader2 className="h-5 w-5 animate-spin" />
                      : <Icon className="h-5 w-5" />}
                  </div>
                  <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-center leading-tight">{step.label}</span>
                </div>
                {i < STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-[var(--border-active)] shrink-0" />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Incident Evidence Bento Grid */}
      {incident && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Signal Card */}
          <div className="bento-card p-4 space-y-2.5">
            <StepHeader icon={Radio} title="1 · Telemetry Anomaly Signal" />
            <div className="flex items-end gap-3.5">
              <div className="text-4xl font-mono font-extrabold" style={{ color: aqiColor(incident.worst.reading.aqi) }}>
                {Math.round(incident.worst.reading.aqi)}
              </div>
              <div className="pb-1">
                <div className="text-sm font-heading font-bold text-[var(--text-primary)]">{incident.worst.station.name}</div>
                <div className="text-xs text-[var(--text-secondary)] font-heading font-semibold uppercase tracking-wider">
                  {incident.worst.station.zone} · {incident.category}
                </div>
              </div>
            </div>
            <p className="text-xs text-[var(--text-secondary)] font-mono">
              PM2.5: {incident.worst.reading.pm25} µg/m³ · Highest recorded station in {incident.city}.
            </p>
          </div>

          {/* Attribution Card */}
          <div className="bento-card p-4 space-y-2.5">
            <StepHeader icon={Crosshair} title="2 · Source Attribution Decomposition" />
            {incident.attribution && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-heading font-bold text-[var(--text-primary)]">
                    Primary Driver: {topSource(incident.attribution.attributions)}
                  </span>
                  <span className={`text-xs font-mono font-bold ${confColor(incident.attribution.confidence?.band)}`}>
                    {Math.round((incident.attribution.confidence?.overall || 0) * 100)}% confidence
                  </span>
                </div>
                <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-[var(--bg-surface-elevated)]">
                  {Object.entries(incident.attribution.attributions).map(([k, v]) => (
                    <div key={k} title={`${k}: ${Math.round(v * 100)}%`} style={{ width: `${v * 100}%`, backgroundColor: sourceColor(k) }} />
                  ))}
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  Dominant sector: <span className="font-bold text-[var(--text-primary)]">{incident.attribution.wind_rose?.dominant?.sector || 'N/A'}</span> (Conditional Probability Function).
                </p>
              </>
            )}
          </div>

          {/* Trajectory Card */}
          <div className="bento-card p-4 space-y-2.5">
            <StepHeader icon={Wind} title="3 · Causal Air-Mass Trajectory" />
            {incident.trajectory && (
              <p className="text-xs text-[var(--text-primary)] leading-relaxed font-normal">{incident.trajectory.summary}</p>
            )}
            {incident.trajectory && (
              <div className="text-xs font-mono text-[var(--text-secondary)]">
                {incident.trajectory.total_travel_km} km traced · {incident.trajectory.fires_crossed}/{incident.trajectory.fires_total} fire detections crossed
              </div>
            )}
          </div>

          {/* GRAP Response */}
          <div className="bento-card p-4 space-y-2.5">
            <StepHeader icon={Landmark} title="4 · Automated Statutory GRAP Order" />
            {incident.grap && (
              <>
                {incident.grap.recommendation === 'INVOKE_IN_ADVANCE' ? (
                  <div className="text-[var(--accent-crimson)] text-xs font-heading font-bold">
                    ⚠ Forecast crosses threshold in ~{incident.grap.crossing_eta_hours}h — {incident.grap.draft_order?.stage_name} order generated {incident.grap.lead_time_hours}h in advance.
                  </div>
                ) : (
                  <div className="text-[var(--accent-amber)] text-xs font-heading font-bold">{incident.grap.rationale}</div>
                )}
                {incident.grap.draft_order && (
                  <div className="text-xs font-mono text-[var(--text-secondary)]">
                    {incident.grap.draft_order.actions.length} statutory enforcement directives · Basis: {incident.grap.triggered_by}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Health Burden */}
          <div className="bento-card p-4 space-y-2.5">
            <StepHeader icon={HeartPulse} title="5 · Public Health Burden" />
            {incident.health?.available && (
              <div className="grid grid-cols-3 gap-2 text-center">
                <Metric value={fmtNum(incident.health.exposed_population)} label="Exposed" />
                <Metric value={incident.health.lenses.aqli.life_years_lost_per_resident} label="Yrs Lost/Res" />
                <Metric value={incident.health.lenses.who_mortality.excess_deaths_per_day} label="Deaths/Day" />
              </div>
            )}
            {incident.action && (
              <p className="text-xs text-[var(--accent-emerald)] font-semibold">{incident.action.headline}</p>
            )}
          </div>

          {/* Citizen Advisory */}
          <div className="bento-card p-4 space-y-2.5">
            <StepHeader icon={Volume2} title="6 · Multi-Lingual Citizen Broadcast" />
            <p className="text-xs text-[var(--text-primary)] leading-relaxed">{advisoryLine}</p>
            <button
              onClick={() => (speakingKey === 'warroom' ? stop() : speak(advisoryLine, 'hi', 'warroom'))}
              disabled={!supported || !advisoryLine}
              className="btn-primary text-xs py-1.5 px-3 cursor-pointer"
            >
              {speakingKey === 'warroom' ? <Square className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              <span>{speakingKey === 'warroom' ? 'Stop Audio' : 'Dispatch Voice Alert (हिंदी)'}</span>
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

const StepHeader = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
    <Icon className="h-4 w-4 text-[var(--accent-sky)]" />
    <h3 className="text-xs font-heading font-bold uppercase tracking-wider">{title}</h3>
  </div>
);

const Metric = ({ value, label }) => (
  <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-2">
    <div className="text-base font-mono font-bold text-[var(--text-primary)] leading-none">{value}</div>
    <div className="text-[10px] font-heading font-semibold uppercase text-[var(--text-muted)] mt-1">{label}</div>
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
  if (aqi <= 100) return '#10B981';
  if (aqi <= 200) return '#F59E0B';
  if (aqi <= 300) return '#F97316';
  if (aqi <= 400) return '#EF4444';
  return '#A855F7';
}
function topSource(attr) {
  if (!attr) return '—';
  const [k, v] = Object.entries(attr).sort((a, b) => b[1] - a[1])[0];
  const label = { vehicular: 'Vehicular', industrial: 'Industrial', construction: 'Construction', biomass_burning: 'Biomass Burning', other: 'Background' }[k] || k;
  return `${label} (${Math.round(v * 100)}%)`;
}
function sourceColor(k) {
  return { vehicular: '#0284C7', industrial: '#EF4444', construction: '#F59E0B', biomass_burning: '#8B5CF6', other: '#64748B' }[k] || '#64748B';
}
function confColor(band) {
  return band === 'high' ? 'text-[var(--accent-emerald)]' : band === 'moderate' ? 'text-[var(--accent-amber)]' : 'text-[var(--accent-crimson)]';
}
function fmtNum(n) {
  return n == null ? '–' : Number(n).toLocaleString('en-IN');
}

export default WarRoom;

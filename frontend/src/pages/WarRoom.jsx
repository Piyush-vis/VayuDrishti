import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  Button,
  Paper,
  Chip,
  Alert,
  LinearProgress,
  Avatar,
  CircularProgress
} from '@mui/material';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import AirIcon from '@mui/icons-material/Air';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import FavoriteIcon from '@mui/icons-material/Favorite';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import StopIcon from '@mui/icons-material/Stop';
import TimerIcon from '@mui/icons-material/Timer';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import {
  aqiApi, attributionApi, grapApi, healthApi, trajectoryApi, advisoryApi,
} from '../services/api';
import { useReplay } from '../context/ReplayContext';
import { useSpeech } from '../hooks/useSpeech';
import ProvenanceBadge from '../components/common/ProvenanceBadge';

const STEPS = [
  { key: 'signal', label: 'Signal Detected', icon: RadioButtonCheckedIcon },
  { key: 'attribution', label: 'Source Attributed', icon: TrackChangesIcon },
  { key: 'trajectory', label: 'Cause Traced', icon: AirIcon },
  { key: 'grap', label: 'Response Drafted', icon: AccountBalanceIcon },
  { key: 'health', label: 'Impact Quantified', icon: FavoriteIcon },
  { key: 'advisory', label: 'Citizens Alerted', icon: VolumeUpIcon },
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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, width: '100%', minWidth: 0 }}>
      {/* Top Header & Latency Comparison Card */}
      <Card elevation={1} sx={{ p: 3, borderRadius: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '0.02em', color: 'error.main' }}>
                EMERGENCY INCIDENT WAR ROOM
              </Typography>
              {episode && <ProvenanceBadge source="replay" />}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Automated Signal-to-Intervention pipeline for {activeCity.charAt(0).toUpperCase() + activeCity.slice(1)}
            </Typography>
          </Box>

          <Button
            variant="contained"
            color="primary"
            onClick={runIncident}
            disabled={running}
            startIcon={running ? <CircularProgress size={16} color="inherit" /> : <RadioButtonCheckedIcon />}
            sx={{ borderRadius: 1 }}
          >
            {running ? 'Running Pipeline…' : 'Trigger Incident Run'}
          </Button>
        </Box>

        {/* Latency Comparison Grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 1,
              bgcolor: 'rgba(129, 199, 132, 0.08)',
              borderColor: 'rgba(129, 199, 132, 0.3)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'success.main', mb: 0.5 }}>
              <TimerIcon fontSize="small" />
              <Typography variant="overline" sx={{ fontWeight: 700 }}>
                VAYUDRISHTI SIGNAL → ACTION LATENCY
              </Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: 'monospace', color: 'success.main' }}>
              {elapsedMs == null ? '…' : `${(elapsedMs / 1000).toFixed(1)}s`}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Autonomous pipeline to attribute sources, trace trajectory, draft statutory GRAP order, and generate voice alert.
            </Typography>
          </Paper>

          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 1,
              bgcolor: 'rgba(207, 102, 121, 0.08)',
              borderColor: 'rgba(207, 102, 121, 0.3)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main', mb: 0.5 }}>
              <WarningAmberIcon fontSize="small" />
              <Typography variant="overline" sx={{ fontWeight: 700 }}>
                DOCUMENTED GOVERNMENT RESPONSE LAG
              </Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: 'monospace', color: 'error.main' }}>
              {GOV_LAG_LABEL}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              {GOV_LAG_CITATION}
            </Typography>
          </Paper>
        </Box>
      </Card>

      {/* Stepper Pipeline Status */}
      <Card elevation={1} sx={{ p: 2, borderRadius: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflowX: 'auto', py: 0.5 }}>
          {STEPS.map((step, i) => {
            const st = stepStates[step.key];
            const Icon = step.icon;
            return (
              <React.Fragment key={step.key}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 110 }}>
                  <Avatar
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 1,
                      mb: 0.5,
                      bgcolor: st === 'done' ? 'success.main' : st === 'running' ? 'primary.main' : 'action.disabledBackground',
                      color: st === 'done' || st === 'running' ? '#FFF' : 'text.disabled',
                    }}
                  >
                    {st === 'done' ? (
                      <CheckCircleIcon fontSize="small" />
                    ) : st === 'running' ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      <Icon fontSize="small" />
                    )}
                  </Avatar>
                  <Typography variant="caption" sx={{ fontSize: '0.6875rem', fontWeight: 700, textAlign: 'center', color: st === 'done' ? 'success.main' : 'text.secondary' }}>
                    {step.label}
                  </Typography>
                </Box>
                {i < STEPS.length - 1 && <ChevronRightIcon sx={{ color: 'text.disabled', mx: 0.5 }} />}
              </React.Fragment>
            );
          })}
        </Box>
      </Card>

      {/* Incident Evidence 2x3 Grid */}
      {incident && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 2.5,
            width: '100%',
          }}
        >
          {/* 1. Signal Card */}
          <Card elevation={1} sx={{ p: 2.5, height: '100%', borderRadius: 1 }}>
            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
              1 · TELEMETRY ANOMALY SIGNAL
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, my: 1 }}>
              <Typography variant="h3" sx={{ fontWeight: 700, fontFamily: 'monospace', color: aqiColor(incident.worst.reading.aqi) }}>
                {Math.round(incident.worst.reading.aqi)}
              </Typography>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {incident.worst.station.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                  {incident.worst.station.zone} · {incident.category}
                </Typography>
              </Box>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
              PM2.5: {incident.worst.reading.pm25} µg/m³ · Highest recorded monitor in {incident.city}.
            </Typography>
          </Card>

          {/* 2. Attribution Card */}
          <Card elevation={1} sx={{ p: 2.5, height: '100%', borderRadius: 1 }}>
            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
              2 · SOURCE ATTRIBUTION DECOMPOSITION
            </Typography>
            {incident.attribution && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    Primary Driver: {topSource(incident.attribution.attributions)}
                  </Typography>
                  <Chip
                    label={`${Math.round((incident.attribution.confidence?.overall || 0) * 100)}% Confidence`}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ borderRadius: 1, fontFamily: 'monospace', height: 20, fontSize: '0.6875rem' }}
                  />
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.round((incident.attribution.confidence?.overall || 0) * 100)}
                  color="primary"
                  sx={{ height: 6, borderRadius: 1 }}
                />
                <Typography variant="caption" color="text.secondary">
                  Dominant sector: <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>{incident.attribution.wind_rose?.dominant?.sector || 'N/A'}</Box> (Conditional Probability Function).
                </Typography>
              </Box>
            )}
          </Card>

          {/* 3. Trajectory Card */}
          <Card elevation={1} sx={{ p: 2.5, height: '100%', borderRadius: 1 }}>
            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
              3 · CAUSAL AIR-MASS TRAJECTORY
            </Typography>
            {incident.trajectory && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                  {incident.trajectory.summary}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, fontFamily: 'monospace' }}>
                  {incident.trajectory.total_travel_km} km traced · {incident.trajectory.fires_crossed}/{incident.trajectory.fires_total} fire detections crossed
                </Typography>
              </Box>
            )}
          </Card>

          {/* 4. GRAP Response */}
          <Card elevation={1} sx={{ p: 2.5, height: '100%', borderRadius: 1 }}>
            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
              4 · AUTOMATED STATUTORY GRAP ORDER
            </Typography>
            {incident.grap && (
              <Box sx={{ mt: 1 }}>
                {incident.grap.recommendation === 'INVOKE_IN_ADVANCE' ? (
                  <Alert severity="error" sx={{ mb: 1, borderRadius: 1, fontSize: '0.75rem' }}>
                    Forecast crosses threshold in ~{incident.grap.crossing_eta_hours}h — {incident.grap.draft_order?.stage_name} order generated {incident.grap.lead_time_hours}h in advance.
                  </Alert>
                ) : (
                  <Alert severity="warning" sx={{ mb: 1, borderRadius: 1, fontSize: '0.75rem' }}>
                    {incident.grap.rationale}
                  </Alert>
                )}
                {incident.grap.draft_order && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                    {incident.grap.draft_order.actions.length} statutory enforcement directives · Basis: {incident.grap.triggered_by}
                  </Typography>
                )}
              </Box>
            )}
          </Card>

          {/* 5. Health Burden */}
          <Card elevation={1} sx={{ p: 2.5, height: '100%', borderRadius: 1 }}>
            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
              5 · PUBLIC HEALTH BURDEN
            </Typography>
            {incident.health?.available && (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mt: 0.5, mb: 1 }}>
                <Paper variant="outlined" sx={{ p: 1, textAlign: 'center', borderRadius: 1, bgcolor: 'background.default' }}>
                  <Typography variant="body1" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                    {fmtNum(incident.health.exposed_population)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.625rem' }}>
                    EXPOSED
                  </Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 1, textAlign: 'center', borderRadius: 1, bgcolor: 'background.default' }}>
                  <Typography variant="body1" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                    {incident.health.lenses.aqli.life_years_lost_per_resident}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.625rem' }}>
                    YRS LOST/RES
                  </Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 1, textAlign: 'center', borderRadius: 1, bgcolor: 'background.default' }}>
                  <Typography variant="body1" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                    {incident.health.lenses.who_mortality.excess_deaths_per_day}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.625rem' }}>
                    DEATHS/DAY
                  </Typography>
                </Paper>
              </Box>
            )}
            {incident.action && (
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'success.main' }}>
                {incident.action.headline}
              </Typography>
            )}
          </Card>

          {/* 6. Citizen Advisory Broadcast */}
          <Card elevation={1} sx={{ p: 2.5, height: '100%', borderRadius: 1 }}>
            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
              6 · MULTI-LINGUAL CITIZEN BROADCAST
            </Typography>
            <Typography variant="body2" sx={{ my: 1, lineHeight: 1.4 }}>
              {advisoryLine}
            </Typography>
            <Button
              size="small"
              variant="contained"
              color="primary"
              startIcon={speakingKey === 'warroom' ? <StopIcon /> : <VolumeUpIcon />}
              disabled={!supported || !advisoryLine}
              onClick={() => (speakingKey === 'warroom' ? stop() : speak(advisoryLine, 'hi', 'warroom'))}
              sx={{ borderRadius: 1 }}
            >
              {speakingKey === 'warroom' ? 'Stop Audio' : 'Dispatch Voice Alert (हिंदी)'}
            </Button>
          </Card>
        </Box>
      )}
    </Box>
  );
}

function categoryFor(aqi) {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Satisfactory';
  if (aqi <= 200) return 'Moderate';
  if (aqi <= 300) return 'Poor';
  if (aqi <= 400) return 'Very Poor';
  return 'Severe';
}
function aqiColor(aqi) {
  if (aqi <= 100) return '#81C784';
  if (aqi <= 200) return '#FFB74D';
  if (aqi <= 300) return '#FF9800';
  if (aqi <= 400) return '#CF6679';
  return '#B388FF';
}
function topSource(attr) {
  if (!attr) return '—';
  const [k, v] = Object.entries(attr).sort((a, b) => b[1] - a[1])[0];
  const label = { vehicular: 'Vehicular', industrial: 'Industrial', construction: 'Construction', biomass_burning: 'Biomass Burning', other: 'Background' }[k] || k;
  return `${label} (${Math.round(v * 100)}%)`;
}
function fmtNum(n) {
  return n == null ? '–' : Number(n).toLocaleString('en-IN');
}

export default WarRoom;

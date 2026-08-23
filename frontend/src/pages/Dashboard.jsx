import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Paper,
  Divider,
  Chip,
  LinearProgress,
  Tooltip,
  IconButton,
} from '@mui/material';
import MapIcon from '@mui/icons-material/Map';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AirIcon from '@mui/icons-material/Air';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SensorsIcon from '@mui/icons-material/Sensors';
import SecurityIcon from '@mui/icons-material/Security';
import FullscreenIcon from '@mui/icons-material/Fullscreen';

import AQIMap from '../components/map/AQIMap';
import FullscreenMapModal from '../components/map/FullscreenMapModal';
import TimeSlider from '../components/map/TimeSlider';
import AQITrendChart from '../components/charts/AQITrendChart';
import PollutantBreakdown from '../components/charts/PollutantBreakdown';
import SourcePieChart from '../components/charts/SourcePieChart';
import WindRose from '../components/charts/WindRose';
import AQIBadge from '../components/common/AQIBadge';
import ProvenanceBadge from '../components/common/ProvenanceBadge';
import HealthImpactPanel from '../components/panels/HealthImpactPanel';
import { getAqiCategory, CITIES } from '../utils/constants';
import { aqiApi, trajectoryApi } from '../services/api';
import { useReplay } from '../context/ReplayContext';
import { useTheme } from '@mui/material/styles';

const SOURCE_LABELS = {
  'live:tomtom': { text: 'TomTom Live', color: 'success.main' },
  'live:nasa-firms': { text: 'NASA FIRMS Live', color: 'success.main' },
  'catalog:named-industrial-areas': { text: 'Catalog', color: 'info.main' },
  'modelled:diurnal-profile': { text: 'Modelled Diurnal', color: 'warning.main' },
  'modelled:seasonal-prior': { text: 'Seasonal Prior', color: 'warning.main' },
  'static-prior:city-tier': { text: 'Static Prior', color: 'warning.main' },
  'measured:station-readings': { text: 'Measured Sensor', color: 'success.main' },
};

function EvidenceItem({ label, value, source }) {
  const src = SOURCE_LABELS[source] || (source ? { text: source, color: 'text.secondary' } : null);
  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1, bgcolor: 'background.default' }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, textTransform: 'uppercase' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
        {value}
      </Typography>
      {src && (
        <Typography variant="caption" sx={{ display: 'block', color: src.color, fontWeight: 700, fontSize: '0.625rem', textTransform: 'uppercase' }}>
          {src.text}
        </Typography>
      )}
    </Paper>
  );
}

function Dashboard({
  activeCity,
  currentReadings,
  allReadings,
  setCurrentReadings,
  heatmapPoints,
  vulnerabilities,
  fetchBaseData,
  selectedStationId,
  setSelectedStationId,
  selectedStation,
  trendReadings,
  attributions,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { episode, replayAtDebounced } = useReplay();
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showVulnerabilities, setShowVulnerabilities] = useState(false);
  const [showTrajectory, setShowTrajectory] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [trajectory, setTrajectory] = useState(null);
  const timelapseRequestId = useRef(0);

  useEffect(() => {
    if (!showTrajectory || !selectedStationId) {
      setTrajectory(null);
      return;
    }
    let cancelled = false;
    trajectoryApi
      .back(selectedStationId, 30)
      .then((t) => {
        if (!cancelled) setTrajectory(t);
      })
      .catch((e) => console.error('Trajectory load failed:', e));
    return () => {
      cancelled = true;
    };
  }, [showTrajectory, selectedStationId, replayAtDebounced]);

  useEffect(() => {
    if (!selectedStationId && currentReadings && currentReadings.length > 0) {
      setSelectedStationId(currentReadings[0].station.station_id);
    }
  }, [currentReadings, selectedStationId, setSelectedStationId]);

  const activeCityCoords = CITIES[activeCity] ? [CITIES[activeCity].lat, CITIES[activeCity].lon] : [28.6139, 77.209];
  const activeStationReading = currentReadings.find((r) => r.station.station_id === selectedStationId)?.reading;
  const activeStationAqiCat = activeStationReading ? getAqiCategory(activeStationReading.aqi) : null;

  // Compute city summary metrics
  const avgAqi =
    currentReadings.length > 0
      ? Math.round(currentReadings.reduce((sum, r) => sum + (r.reading?.aqi || 0), 0) / currentReadings.length)
      : 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, width: '100%', minWidth: 0 }}>
      {/* 1. Top High-Density Metric Cards (4 Columns) */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' },
          gap: 2,
          width: '100%',
        }}
      >
        {/* City Average Card */}
        <Card elevation={1} sx={{ minHeight: 114, borderRadius: 1, display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', '&:last-child': { pb: 2 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.05em', lineHeight: 1 }}>
                  {CITIES[activeCity]?.name || 'City'} Average
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, minHeight: 34 }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: 'monospace', lineHeight: 1 }}>
                    {avgAqi || '—'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    AQI
                  </Typography>
                </Box>
                <Box sx={{ minHeight: 22, display: 'flex', alignItems: 'center' }}>
                  {avgAqi > 0 && <AQIBadge aqi={avgAqi} size="small" />}
                </Box>
              </Box>
              <ShowChartIcon sx={{ color: 'primary.main', fontSize: 26 }} />
            </Box>
          </CardContent>
        </Card>

        {/* Dominant Pollutant Card */}
        <Card elevation={1} sx={{ minHeight: 114, borderRadius: 1, display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', '&:last-child': { pb: 2 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.05em', lineHeight: 1 }}>
                  Dominant Pollutant
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, minHeight: 34 }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'error.main', lineHeight: 1 }}>
                    PM2.5
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Fine Particles
                  </Typography>
                </Box>
                <Box sx={{ minHeight: 22, display: 'flex', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6875rem' }}>
                    Primary exposure risk
                  </Typography>
                </Box>
              </Box>
              <WarningAmberIcon sx={{ color: 'error.main', fontSize: 26 }} />
            </Box>
          </CardContent>
        </Card>

        {/* CAAQMS Stations Card */}
        <Card elevation={1} sx={{ minHeight: 114, borderRadius: 1, display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', '&:last-child': { pb: 2 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.05em', lineHeight: 1 }}>
                  CAAQMS Stations
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, minHeight: 34 }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main', lineHeight: 1 }}>
                    {currentReadings.length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Monitors Live
                  </Typography>
                </Box>
                <Box sx={{ minHeight: 22, display: 'flex', alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 700, fontSize: '0.6875rem' }}>
                    ● 100% Reporting
                  </Typography>
                </Box>
              </Box>
              <SensorsIcon sx={{ color: 'primary.main', fontSize: 26 }} />
            </Box>
          </CardContent>
        </Card>

        {/* Statutory Enforcement Protocol Card */}
        <Card elevation={1} sx={{ minHeight: 114, borderRadius: 1, display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', '&:last-child': { pb: 2 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.05em', lineHeight: 1 }}>
                  Enforcement Protocol
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, minHeight: 34 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
                    {avgAqi > 400 ? 'GRAP Stage IV' : avgAqi > 300 ? 'GRAP Stage III' : avgAqi > 200 ? 'GRAP Stage II' : 'Standard'}
                  </Typography>
                </Box>
                <Box sx={{ minHeight: 22, display: 'flex', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6875rem' }}>
                    Automated statutory response
                  </Typography>
                </Box>
              </Box>
              <SecurityIcon sx={{ color: 'warning.main', fontSize: 26 }} />
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* 2. Main Side-by-Side 2-Column Grid: Left Map & Health (60%) vs Right Analytics (40%) */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1.6fr 1fr' },
          gap: 2.5,
          width: '100%',
          alignItems: 'start',
        }}
      >
        {/* Left Column (Map & Public Health) */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, minWidth: 0 }}>
          {/* Map Card */}
          <Card
            elevation={1}
            sx={{
              height: 520,
              position: 'relative',
              overflow: 'hidden',
              borderRadius: 1,
              width: '100%',
              bgcolor: 'background.paper',
            }}
          >
            {/* Map Layer Controls Floating Overlay */}
            <Paper
              elevation={4}
              sx={{
                position: 'absolute',
                top: 12,
                right: 12,
                zIndex: 1000,
                display: 'flex',
                gap: 1,
                p: 0.75,
                borderRadius: 1,
                bgcolor: isDark ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(12px)',
                border: 1,
                borderColor: 'divider',
                boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 4px 20px rgba(0,0,0,0.12)',
              }}
            >
              <Chip
                clickable
                label="Heatmap"
                size="small"
                variant={showHeatmap ? 'filled' : 'outlined'}
                color={showHeatmap ? 'primary' : 'default'}
                icon={<MapIcon />}
                onClick={() => setShowHeatmap(!showHeatmap)}
                sx={{ borderRadius: 1 }}
              />
              <Chip
                clickable
                label="Vulnerabilities"
                size="small"
                variant={showVulnerabilities ? 'filled' : 'outlined'}
                color={showVulnerabilities ? 'secondary' : 'default'}
                icon={<VisibilityIcon />}
                onClick={() => setShowVulnerabilities(!showVulnerabilities)}
                sx={{ borderRadius: 1 }}
              />
              <Chip
                clickable
                label="Back-trajectory"
                size="small"
                variant={showTrajectory ? 'filled' : 'outlined'}
                color={showTrajectory ? 'primary' : 'default'}
                icon={<AirIcon />}
                disabled={!selectedStationId}
                onClick={() => setShowTrajectory(!showTrajectory)}
                sx={{ borderRadius: 1 }}
              />
              <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />
              <Tooltip title="Open Fullscreen Air Quality Map">
                <Chip
                  clickable
                  label="Fullscreen"
                  size="small"
                  variant="filled"
                  color="primary"
                  icon={<FullscreenIcon />}
                  onClick={() => setIsFullscreen(true)}
                  sx={{ borderRadius: 1, fontWeight: 700 }}
                />
              </Tooltip>
            </Paper>

            {/* Trajectory Summary Overlay */}
            {showTrajectory && trajectory && (
              <Paper
                elevation={4}
                sx={{
                  position: 'absolute',
                  bottom: 80,
                  left: 16,
                  zIndex: 1000,
                  p: 1.5,
                  maxWidth: 320,
                  borderRadius: 1,
                  bgcolor: isDark ? 'rgba(30, 30, 30, 0.92)' : 'rgba(255, 255, 255, 0.96)',
                  backdropFilter: 'blur(12px)',
                  border: 1,
                  borderColor: 'primary.main',
                  boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 4px 20px rgba(0,0,0,0.12)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, color: 'primary.main' }}>
                  <AirIcon fontSize="small" />
                  <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                    Air-Mass Back-Trajectory
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ fontSize: '0.8125rem', lineHeight: 1.4 }}>
                  {trajectory.summary}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontFamily: 'monospace' }}>
                  {trajectory.total_travel_km} km traced · {trajectory.fires_crossed}/{trajectory.fires_total} fire crossings
                </Typography>
              </Paper>
            )}

            {/* Leaflet Map Component — uses allReadings so all cities show when panning */}
            <AQIMap
              stations={allReadings && allReadings.length > 0 ? allReadings : currentReadings}
              center={activeCityCoords}
              heatmapPoints={heatmapPoints}
              showHeatmap={showHeatmap}
              vulnerabilities={vulnerabilities}
              showVulnerabilities={showVulnerabilities}
              onStationSelect={setSelectedStationId}
              trajectory={trajectory}
              showTrajectory={showTrajectory}
            />

            {/* Time Slider Overlay */}
            {!episode && (
              <Box sx={{ position: 'absolute', bottom: 12, left: 12, right: 12, zIndex: 1000 }}>
                <TimeSlider
                  onChange={async (val) => {
                    if (val === 0) {
                      fetchBaseData();
                      return;
                    }
                    const requestId = ++timelapseRequestId.current;
                    try {
                      const historicalReadings = await aqiApi.at(activeCity, Math.abs(val));
                      if (requestId === timelapseRequestId.current) {
                        setCurrentReadings(historicalReadings);
                      }
                    } catch (err) {
                      console.error('Snapshot load error:', err);
                    }
                  }}
                />
              </Box>
            )}
          </Card>

          {/* Bottom Health Impact Card */}
          <HealthImpactPanel city={activeCity} />
        </Box>

        {/* Right Column (Deep-Dive Analytics) */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, minWidth: 0 }}>
          {/* Selected Station Deep Dive Card */}
          <Card elevation={1} sx={{ borderRadius: 1 }}>
            <CardContent sx={{ p: 2 }}>
              {selectedStation && activeStationReading ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                        {selectedStation.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                        {selectedStation.zone}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                      <Chip label={selectedStation.type} size="small" variant="outlined" sx={{ borderRadius: 1, height: 20, fontSize: '0.6875rem' }} />
                      <ProvenanceBadge source={activeStationReading.source} timestamp={activeStationReading.timestamp} />
                    </Box>
                  </Box>

                  {/* Hero AQI Stat */}
                  <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 2, borderRadius: 1, bgcolor: 'background.default' }}>
                    <Box sx={{ textAlign: 'center', minWidth: 60 }}>
                      <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: 'monospace', lineHeight: 1 }}>
                        {Math.round(activeStationReading.aqi)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.625rem' }}>
                        AQI
                      </Typography>
                    </Box>
                    <Divider orientation="vertical" flexItem />
                    <Box>
                      <AQIBadge aqi={activeStationReading.aqi} size="small" />
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, lineHeight: 1.3 }}>
                        {activeStationAqiCat?.health}
                      </Typography>
                    </Box>
                  </Paper>

                  {/* Pollutant Sub-indices */}
                  <Box>
                    <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 700 }}>
                      POLLUTANT SUB-INDICES (µg/m³)
                    </Typography>
                    <PollutantBreakdown reading={activeStationReading} />
                  </Box>

                  {/* 24-Hour Trend */}
                  <Box>
                    <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 700 }}>
                      24-HOUR HISTORICAL AQI TREND
                    </Typography>
                    <AQITrendChart data={trendReadings} />
                  </Box>
                </Box>
              ) : (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Click any station marker on the map to inspect telemetry readings.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Source Attribution Card */}
          {selectedStation && attributions && (
            <Card elevation={1} sx={{ borderRadius: 1 }}>
              <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                      Source Attribution Analysis
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      PMF priors × live telemetry for {selectedStation.zone}
                    </Typography>
                  </Box>
                  <ProvenanceBadge source={attributions.provenance} timestamp={attributions.timestamp} />
                </Box>

                {/* Attribution Confidence Card with Clean Alignment */}
                {attributions.confidence && (
                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1, bgcolor: 'background.default' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase' }} color="text.secondary">
                        Attribution Confidence
                      </Typography>
                      <Chip
                        label={`${Math.round(attributions.confidence.overall * 100)}% (${attributions.confidence.band.toUpperCase()})`}
                        size="small"
                        color={attributions.confidence.band === 'high' ? 'success' : 'warning'}
                        sx={{ height: 20, fontSize: '0.6875rem', fontFamily: 'monospace', fontWeight: 700, borderRadius: 1 }}
                      />
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.round(attributions.confidence.overall * 100)}
                      color={attributions.confidence.band === 'high' ? 'success' : 'warning'}
                      sx={{ height: 6, borderRadius: 1 }}
                    />
                  </Paper>
                )}

                <SourcePieChart attributions={attributions.attributions} />

                {attributions.wind_rose && <WindRose windRose={attributions.wind_rose} />}

                {/* Evidence Grid */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                  <EvidenceItem
                    label="Traffic Congestion"
                    value={`${Math.round(attributions.evidence.traffic_congestion_score * 100)}%`}
                    source={attributions.evidence_sources?.traffic_congestion_score}
                  />
                  <EvidenceItem
                    label="Industrial Areas"
                    value={`${attributions.evidence.nearby_industries} catalogued`}
                    source={attributions.evidence_sources?.nearby_industries}
                  />
                  <EvidenceItem
                    label="Construction"
                    value={`${attributions.evidence.active_construction_sites} active`}
                    source={attributions.evidence_sources?.active_construction_sites}
                  />
                  <EvidenceItem
                    label="NASA Hotspots"
                    value={`${attributions.evidence.fire_hotspots_detected} detected`}
                    source={attributions.evidence_sources?.fire_hotspots_detected}
                  />
                </Box>
              </CardContent>
            </Card>
          )}
        </Box>
      </Box>

      {/* Fullscreen AQI Map Modal with Interactive Telemetry & Stats Overlay */}
      <FullscreenMapModal
        open={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        stations={allReadings && allReadings.length > 0 ? allReadings : currentReadings}
        center={activeCityCoords}
        heatmapPoints={heatmapPoints}
        vulnerabilities={vulnerabilities}
        selectedStationId={selectedStationId}
        onStationSelect={setSelectedStationId}
        trendReadings={trendReadings}
        trajectory={trajectory}
        activeCity={activeCity}
      />
    </Box>
  );
}

export default Dashboard;

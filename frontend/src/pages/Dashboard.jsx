import { motion } from 'framer-motion';
import React, { useState, useEffect, useRef } from 'react';
import { Map as MapIcon, Eye, Wind, Activity, Zap, Shield, AlertTriangle, Radio } from 'lucide-react';
import AQIMap from '../components/map/AQIMap';
import TimeSlider from '../components/map/TimeSlider';
import AQITrendChart from '../components/charts/AQITrendChart';
import PollutantBreakdown from '../components/charts/PollutantBreakdown';
import SourcePieChart from '../components/charts/SourcePieChart';
import WindRose from '../components/charts/WindRose';
import ProvenanceBadge from '../components/common/ProvenanceBadge';
import HealthImpactPanel from '../components/panels/HealthImpactPanel';
import { getAqiCategory, CITIES } from '../utils/constants';
import { aqiApi, trajectoryApi } from '../services/api';
import { useReplay } from '../context/ReplayContext';

const SOURCE_LABELS = {
  'live:tomtom': { text: 'TomTom Live', cls: 'text-[var(--accent-emerald)]' },
  'live:nasa-firms': { text: 'NASA FIRMS Live', cls: 'text-[var(--accent-emerald)]' },
  'catalog:named-industrial-areas': { text: 'Catalog', cls: 'text-[var(--accent-sky)]' },
  'modelled:diurnal-profile': { text: 'Modelled Diurnal', cls: 'text-[var(--accent-amber)]' },
  'modelled:seasonal-prior': { text: 'Seasonal Prior', cls: 'text-[var(--accent-amber)]' },
  'static-prior:city-tier': { text: 'Static Prior', cls: 'text-[var(--accent-amber)]' },
  'measured:station-readings': { text: 'Measured Sensor', cls: 'text-[var(--accent-emerald)]' },
};

function EvidenceItem({ label, value, source }) {
  const src = SOURCE_LABELS[source] || (source ? { text: source, cls: 'text-[var(--text-muted)]' } : null);
  return (
    <div className="p-2 rounded bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] space-y-0.5">
      <div className="text-[10px] font-heading font-bold text-[var(--text-muted)] uppercase tracking-wider">{label}</div>
      <div className="text-xs font-mono font-bold text-[var(--text-primary)]">{value}</div>
      {src && <span className={`block text-[9px] uppercase tracking-wider font-mono font-semibold ${src.cls}`}>{src.text}</span>}
    </div>
  );
}

function Dashboard({
    activeCity, 
    currentReadings, 
    setCurrentReadings, 
    heatmapPoints, 
    vulnerabilities, 
    fetchBaseData,
    selectedStationId,
    setSelectedStationId,
    selectedStation,
    trendReadings,
    attributions
}) {
  const { episode, replayAtDebounced } = useReplay();
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showVulnerabilities, setShowVulnerabilities] = useState(false);
  const [showTrajectory, setShowTrajectory] = useState(false);
  const [trajectory, setTrajectory] = useState(null);
  const timelapseRequestId = useRef(0);

  useEffect(() => {
    if (!showTrajectory || !selectedStationId) { setTrajectory(null); return; }
    let cancelled = false;
    trajectoryApi.back(selectedStationId, 30)
      .then((t) => { if (!cancelled) setTrajectory(t); })
      .catch((e) => console.error('Trajectory load failed:', e));
    return () => { cancelled = true; };
  }, [showTrajectory, selectedStationId, replayAtDebounced]);

  useEffect(() => {
    if (!selectedStationId && currentReadings && currentReadings.length > 0) {
      setSelectedStationId(currentReadings[0].station.station_id);
    }
  }, [currentReadings, selectedStationId, setSelectedStationId]);

  const activeCityCoords = CITIES[activeCity] ? [CITIES[activeCity].lat, CITIES[activeCity].lon] : [28.6139, 77.2090];
  const activeStationReading = currentReadings.find(r => r.station.station_id === selectedStationId)?.reading;
  const activeStationAqiCat = activeStationReading ? getAqiCategory(activeStationReading.aqi) : null;

  // Compute city summary metrics
  const avgAqi = currentReadings.length > 0
    ? Math.round(currentReadings.reduce((sum, r) => sum + (r.reading?.aqi || 0), 0) / currentReadings.length)
    : 0;
  const cityCategory = getAqiCategory(avgAqi);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex-1 flex flex-col gap-5 min-h-0 w-full"
    >
      {/* Top High-Density KPI Metric Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 shrink-0">
        {/* City Average Card */}
        <div className="bento-card p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-heading font-bold text-[var(--text-muted)] uppercase tracking-wider">
              {CITIES[activeCity]?.name || 'City'} Average
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-mono font-extrabold text-[var(--text-primary)] leading-none">
                {avgAqi || '—'}
              </span>
              <span className="text-xs font-mono text-[var(--text-muted)] font-semibold">AQI</span>
            </div>
            {cityCategory && (
              <span
                className="inline-block text-[10px] font-heading font-bold uppercase px-2 py-0.5 rounded mt-1.5"
                style={{
                  backgroundColor: `${cityCategory.color}18`,
                  color: cityCategory.color,
                  border: `1px solid ${cityCategory.color}35`
                }}
              >
                {cityCategory.label}
              </span>
            )}
          </div>
          <div className="h-11 w-11 rounded-xl bg-[var(--accent-emerald-subtle)] border border-[var(--accent-emerald-border)] flex items-center justify-center text-[var(--accent-emerald)] shadow-sm">
            <Activity className="h-5 w-5" />
          </div>
        </div>

        {/* Dominant Driver */}
        <div className="bento-card p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-heading font-bold text-[var(--text-muted)] uppercase tracking-wider">
              Dominant Pollutant
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-mono font-extrabold text-[var(--accent-crimson)] leading-none">
                PM2.5
              </span>
              <span className="text-xs font-mono text-[var(--text-muted)]">Fine Particles</span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] mt-1.5">
              Primary health exposure risk
            </p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-[var(--accent-crimson-subtle)] border border-[var(--accent-crimson-border)] flex items-center justify-center text-[var(--accent-crimson)] shadow-sm">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>

        {/* Active Sensor Mesh */}
        <div className="bento-card p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-heading font-bold text-[var(--text-muted)] uppercase tracking-wider">
              CAAQMS Stations
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-mono font-extrabold text-[var(--accent-sky)] leading-none">
                {currentReadings.length}
              </span>
              <span className="text-xs font-mono text-[var(--text-muted)]">Monitors Live</span>
            </div>
            <p className="text-[11px] text-[var(--accent-emerald)] font-heading font-semibold mt-1.5 flex items-center gap-1">
              <Radio className="h-3 w-3 animate-pulse" /> 100% Reporting
            </p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-[var(--accent-sky-subtle)] border border-[var(--accent-sky-border)] flex items-center justify-center text-[var(--accent-sky)] shadow-sm">
            <Radio className="h-5 w-5" />
          </div>
        </div>

        {/* Statutory Stage Protocol */}
        <div className="bento-card p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-heading font-bold text-[var(--text-muted)] uppercase tracking-wider">
              Enforcement Protocol
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-heading font-extrabold text-[var(--text-primary)] leading-none">
                {avgAqi > 400 ? 'GRAP Stage IV' : avgAqi > 300 ? 'GRAP Stage III' : avgAqi > 200 ? 'GRAP Stage II' : 'Standard'}
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] mt-1.5">
              Automated statutory response
            </p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-[var(--accent-amber-subtle)] border border-[var(--accent-amber-border)] flex items-center justify-center text-[var(--accent-amber)] shadow-sm">
            <Shield className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Main Grid: Map & Deep-Dive Analytics */}
      <div className="flex-1 flex flex-col lg:flex-row gap-5 min-h-0 w-full">
        {/* Left 62% Map Area */}
        <div className="w-full lg:w-[62%] flex flex-col gap-4">
          <div className="relative bento-card overflow-hidden h-[480px] lg:h-[560px] flex flex-col">
            {/* Map Overlay Controls */}
            <div className="absolute top-3.5 right-3.5 z-[1000] flex gap-2">
              <button
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-heading font-semibold rounded-lg border transition-all cursor-pointer shadow-sm ${
                  showHeatmap 
                    ? 'bg-[var(--accent-emerald)] border-[var(--accent-emerald)] text-white' 
                    : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-active)]'
                }`}
              >
                <MapIcon className="h-3.5 w-3.5" />
                <span>Heatmap</span>
              </button>
              <button
                onClick={() => setShowVulnerabilities(!showVulnerabilities)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-heading font-semibold rounded-lg border transition-all cursor-pointer shadow-sm ${
                  showVulnerabilities
                    ? 'bg-[var(--accent-sky)] border-[var(--accent-sky)] text-white'
                    : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-active)]'
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Vulnerabilities</span>
              </button>
              <button
                onClick={() => setShowTrajectory(!showTrajectory)}
                disabled={!selectedStationId}
                title={selectedStationId ? 'Trace back-trajectory for selected monitor' : 'Select a station first'}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-heading font-semibold rounded-lg border transition-all cursor-pointer shadow-sm disabled:opacity-40 ${
                  showTrajectory
                    ? 'bg-[var(--accent-purple)] border-[var(--accent-purple)] text-white'
                    : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-active)]'
                }`}
              >
                <Wind className="h-3.5 w-3.5" />
                <span>Back-trajectory</span>
              </button>
            </div>

            {/* Map Container */}
            <div className="flex-1 min-h-0 relative">
              <AQIMap
                stations={currentReadings}
                center={activeCityCoords}
                heatmapPoints={heatmapPoints}
                showHeatmap={showHeatmap}
                vulnerabilities={vulnerabilities}
                showVulnerabilities={showVulnerabilities}
                onStationSelect={setSelectedStationId}
                trajectory={trajectory}
                showTrajectory={showTrajectory}
              />

              {/* Trajectory summary overlay */}
              {showTrajectory && trajectory && (
                <div className="absolute bottom-16 left-3.5 z-[1000] max-w-xs bento-card p-3 shadow-2xl border-[var(--accent-purple-border)]">
                  <div className="flex items-center gap-1.5 text-[var(--accent-purple)] mb-1">
                    <Wind className="h-3.5 w-3.5" />
                    <span className="text-xs font-heading font-bold uppercase tracking-wider">Air-Mass Back-Trajectory</span>
                  </div>
                  <p className="text-xs text-[var(--text-primary)] leading-relaxed">{trajectory.summary}</p>
                  <div className="text-[11px] font-mono text-[var(--text-secondary)] mt-1.5 flex gap-3">
                    <span>{trajectory.total_travel_km} km traced</span>
                    <span>{trajectory.fires_crossed}/{trajectory.fires_total} fire crossings</span>
                  </div>
                </div>
              )}
            </div>

            {/* Historical Timelapse Slider */}
            {!episode && (
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
            )}
          </div>

          {/* Demographic & Public Health Lens */}
          <HealthImpactPanel city={activeCity} />
        </div>

        {/* Right 38% Selected Station & Source Attribution Bento */}
        <div className="w-full lg:w-[38%] flex flex-col gap-4 overflow-y-auto pr-1">
          {/* Station Deep Dive Card */}
          <div className="bento-card p-5 space-y-4">
            {selectedStation && activeStationReading ? (
              <>
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-base font-heading font-extrabold text-[var(--text-primary)] leading-tight">
                      {selectedStation.name}
                    </h2>
                    <p className="text-xs text-[var(--text-secondary)] font-heading font-semibold uppercase tracking-wider mt-0.5">
                      {selectedStation.zone}
                    </p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1.5">
                    <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                      {selectedStation.type}
                    </span>
                    <ProvenanceBadge source={activeStationReading.source} timestamp={activeStationReading.timestamp} />
                  </div>
                </div>

                {/* Hero AQI Stat */}
                <div className="flex items-center gap-4 py-3 border-y border-[var(--border-subtle)]">
                  <div
                    className="h-18 w-18 rounded-2xl flex flex-col items-center justify-center border shrink-0 shadow-md"
                    style={{ 
                      borderColor: `${activeStationAqiCat?.color}40`, 
                      backgroundColor: `${activeStationAqiCat?.color}15`,
                      color: activeStationAqiCat?.color
                    }}
                  >
                    <span className="text-3xl font-mono font-extrabold">{Math.round(activeStationReading.aqi)}</span>
                    <span className="text-[9px] font-heading font-bold uppercase tracking-widest -mt-1 opacity-80">AQI</span>
                  </div>
                  <div className="space-y-1">
                    <span
                      className="text-xs font-heading font-bold px-2.5 py-0.5 rounded border uppercase inline-block"
                      style={{ 
                        borderColor: `${activeStationAqiCat?.color}45`, 
                        backgroundColor: `${activeStationAqiCat?.color}20`,
                        color: activeStationAqiCat?.color
                      }}
                    >
                      {activeStationAqiCat?.label}
                    </span>
                    <p className="text-xs text-[var(--text-secondary)] leading-snug">{activeStationAqiCat?.health}</p>
                  </div>
                </div>

                {/* Sub-indices Breakdown */}
                <div>
                  <h3 className="text-xs font-heading font-bold text-[var(--text-primary)] uppercase tracking-wider mb-2">
                    Pollutant Sub-indices (µg/m³)
                  </h3>
                  <PollutantBreakdown reading={activeStationReading} />
                </div>

                {/* 24-Hour Trend */}
                <div>
                  <h3 className="text-xs font-heading font-bold text-[var(--text-primary)] uppercase tracking-wider mb-2">
                    24-Hour Historical AQI Trend
                  </h3>
                  <AQITrendChart data={trendReadings} />
                </div>
              </>
            ) : (
              <div className="h-48 flex items-center justify-center p-6 text-center text-[var(--text-muted)] text-xs font-heading">
                Click any station marker on the map to inspect live sensor readings and analytics.
              </div>
            )}
          </div>

          {/* Source Attribution Bento */}
          {selectedStation && attributions && (
            <div className="bento-card p-5 space-y-4">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <h3 className="text-xs font-heading font-bold text-[var(--text-primary)] uppercase tracking-wider">
                    Source Attribution Analysis
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">PMF priors × live telemetry for {selectedStation.zone}</p>
                </div>
                <ProvenanceBadge source={attributions.provenance} timestamp={attributions.timestamp} />
              </div>

              {attributions.confidence && (
                <div className="bg-[var(--bg-surface-elevated)] p-3 rounded-lg border border-[var(--border-subtle)] space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-heading font-bold text-[var(--text-muted)] uppercase tracking-wider">Attribution Confidence</span>
                    <span className={`font-mono font-bold ${
                      attributions.confidence.band === 'high' ? 'text-[var(--accent-emerald)]'
                      : attributions.confidence.band === 'moderate' ? 'text-[var(--accent-amber)]' : 'text-[var(--accent-crimson)]'
                    }`}>
                      {Math.round(attributions.confidence.overall * 100)}% · {attributions.confidence.band.toUpperCase()}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        attributions.confidence.band === 'high' ? 'bg-[var(--accent-emerald)]'
                        : attributions.confidence.band === 'moderate' ? 'bg-[var(--accent-amber)]' : 'bg-[var(--accent-crimson)]'
                      }`}
                      style={{ width: `${Math.round(attributions.confidence.overall * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-[var(--text-muted)]">
                    <span>Wind CPF: {Math.round(attributions.confidence.components.wind_sector_cpf * 100)}%</span>
                    <span>Data Quality: {Math.round(attributions.confidence.components.data_quality * 100)}%</span>
                    <span>Sample Size: {Math.round(attributions.confidence.components.sample_size * 100)}%</span>
                  </div>
                </div>
              )}

              <SourcePieChart attributions={attributions.attributions} />

              {attributions.wind_rose && <WindRose windRose={attributions.wind_rose} />}

              {/* Evidence grid */}
              <div className="grid grid-cols-2 gap-2">
                <EvidenceItem label="Traffic Congestion"
                  value={`${Math.round(attributions.evidence.traffic_congestion_score * 100)}%`}
                  source={attributions.evidence_sources?.traffic_congestion_score} />
                <EvidenceItem label="Industrial Areas"
                  value={`${attributions.evidence.nearby_industries} catalogued`}
                  source={attributions.evidence_sources?.nearby_industries} />
                <EvidenceItem label="Active Construction"
                  value={`${attributions.evidence.active_construction_sites} active sites`}
                  source={attributions.evidence_sources?.active_construction_sites} />
                <EvidenceItem label="NASA Fire Detections"
                  value={`${attributions.evidence.fire_hotspots_detected} hotspots`}
                  source={attributions.evidence_sources?.fire_hotspots_detected} />
              </div>

              {attributions.sector_alignment?.checked && (
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border-subtle)] pt-2.5">
                  {attributions.sector_alignment.industrial_sites_upwind?.length > 0 && (
                    <>Upwind in the {attributions.sector_alignment.dominant_sector} sector: <span className="font-semibold text-[var(--text-primary)]">{attributions.sector_alignment.industrial_sites_upwind.join(', ')}</span>. </>
                  )}
                  {attributions.sector_alignment.biomass_corridor_upwind && (
                    <>Dominant sector aligns directly with the <span className="font-semibold text-[var(--accent-purple)]">NW crop-burning transport corridor</span>.</>
                  )}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default Dashboard;

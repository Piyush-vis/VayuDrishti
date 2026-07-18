import { motion } from 'framer-motion';
import React, { useState, useEffect, useRef } from 'react';
import { Map as MapIcon, Eye } from 'lucide-react';
import AQIMap from '../components/map/AQIMap';
import TimeSlider from '../components/map/TimeSlider';
import AQITrendChart from '../components/charts/AQITrendChart';
import PollutantBreakdown from '../components/charts/PollutantBreakdown';
import SourcePieChart from '../components/charts/SourcePieChart';
import { getAqiCategory, CITIES } from '../utils/constants';
import { aqiApi } from '../services/api';

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
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showVulnerabilities, setShowVulnerabilities] = useState(false);
  const timelapseRequestId = useRef(0);

  // Set default station if none selected and we have readings
  useEffect(() => {
    if (!selectedStationId && currentReadings && currentReadings.length > 0) {
        setSelectedStationId(currentReadings[0].station.station_id);
    }
  }, [currentReadings, selectedStationId, setSelectedStationId]);

  const activeCityCoords = CITIES[activeCity] ? [CITIES[activeCity].lat, CITIES[activeCity].lon] : [28.6139, 77.2090];
  const activeStationReading = currentReadings.find(r => r.station.station_id === selectedStationId)?.reading;
  const activeStationAqiCat = activeStationReading ? getAqiCategory(activeStationReading.aqi) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 w-full"
    >
      <div className="w-full lg:w-[65%] flex flex-col relative h-[500px] lg:h-full min-h-[400px]">
        <div className="absolute top-4 right-4 z-[1000] flex gap-2">
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${
              showHeatmap 
                ? 'bg-blue-600 border-blue-500 text-white shadow shadow-blue-500/20' 
                : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white backdrop-blur'
            }`}
          >
            <MapIcon className="h-3 w-3" />
            <span>Heatmap</span>
          </button>
          <button
            onClick={() => setShowVulnerabilities(!showVulnerabilities)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${
              showVulnerabilities 
                ? 'bg-blue-600 border-blue-500 text-white shadow shadow-blue-500/20' 
                : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white backdrop-blur'
            }`}
          >
            <Eye className="h-3 w-3" />
            <span>Vulnerabilities</span>
          </button>
        </div>

        <div className="flex-1 min-h-0">
          <AQIMap 
            stations={currentReadings} 
            center={activeCityCoords}
            heatmapPoints={heatmapPoints}
            showHeatmap={showHeatmap}
            vulnerabilities={vulnerabilities}
            showVulnerabilities={showVulnerabilities}
            onStationSelect={setSelectedStationId}
          />
        </div>

        <TimeSlider
          onChange={async (val) => {
            if (val === 0) {
              fetchBaseData();
              return;
            }
            // val is a negative hour offset (e.g. -24 => 24 hours ago). Pull the
            // actual recorded readings from that hour rather than faking a trend.
            const requestId = ++timelapseRequestId.current;
            try {
              const historicalReadings = await aqiApi.at(activeCity, Math.abs(val));
              // Ignore stale responses if the slider moved again before this resolved
              if (requestId === timelapseRequestId.current) {
                setCurrentReadings(historicalReadings);
              }
            } catch (err) {
              console.error('Failed to load historical AQI snapshot:', err);
            }
          }}
        />
      </div>

      <div className="w-full lg:w-[35%] flex flex-col gap-6 overflow-y-auto pr-1">
        <div className="glass-card p-5 space-y-4">
          {selectedStation && activeStationReading ? (
            <>
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-base font-bold text-white leading-tight">{selectedStation.name}</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{selectedStation.zone}</p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-bold text-slate-300">
                    {selectedStation.type}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 py-2 border-y border-slate-800/80">
                <div className="h-16 w-16 rounded-xl flex flex-col items-center justify-center border shrink-0 shadow-lg"
                     style={{ 
                       borderColor: `${activeStationAqiCat?.color}30`, 
                       backgroundColor: `${activeStationAqiCat?.color}10`,
                       color: activeStationAqiCat?.color
                     }}>
                  <span className="text-2xl font-black">{Math.round(activeStationReading.aqi)}</span>
                  <span className="text-[8px] font-bold uppercase tracking-widest -mt-1 text-slate-400">AQI</span>
                </div>
                <div>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded border uppercase"
                        style={{ 
                          borderColor: `${activeStationAqiCat?.color}40`, 
                          backgroundColor: `${activeStationAqiCat?.color}15`,
                          color: activeStationAqiCat?.color
                        }}>
                    {activeStationAqiCat?.label}
                  </span>
                  <p className="text-xs text-slate-300 font-medium mt-1.5 leading-snug">{activeStationAqiCat?.health}</p>
                </div>
              </div>

              <div>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Pollutant sub-indices</h3>
                <PollutantBreakdown reading={activeStationReading} />
              </div>

              <div>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">24-hour AQI Trend</h3>
                <AQITrendChart data={trendReadings} />
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center p-8 text-center text-slate-500 text-xs">
              Click any station marker on the map to inspect live sensor readings and analytics.
            </div>
          )}
        </div>

        {selectedStation && attributions && (
          <div className="glass-card p-5 space-y-4">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Source Attribution</h3>
              <p className="text-[10px] text-slate-400">Geospatial pollution attribution estimates for {selectedStation.zone}</p>
            </div>
            <SourcePieChart attributions={attributions.attributions} />
            
            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-[10px] grid grid-cols-2 gap-2 text-slate-400">
              <div>Traffic Congestion: <span className="font-bold text-slate-200">{Math.round(attributions.evidence.traffic_congestion_score * 100)}%</span></div>
              <div>Nearby Stacks: <span className="font-bold text-slate-200">{attributions.evidence.nearby_industries} found</span></div>
              <div>Construction: <span className="font-bold text-slate-200">{attributions.evidence.active_construction_sites} sites</span></div>
              <div>Crop Fire Alerts: <span className="font-bold text-slate-200">{attributions.evidence.fire_hotspots_detected} hotspots</span></div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default Dashboard;

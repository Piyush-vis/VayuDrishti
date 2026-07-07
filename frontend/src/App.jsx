import React, { useState, useEffect } from 'react';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import Footer from './components/layout/Footer';
import AQIMap from './components/map/AQIMap';
import TimeSlider from './components/map/TimeSlider';
import AQITrendChart from './components/charts/AQITrendChart';
import PredictionChart from './components/charts/PredictionChart';
import PollutantBreakdown from './components/charts/PollutantBreakdown';
import SourcePieChart from './components/charts/SourcePieChart';
import CityComparisonChart from './components/charts/CityComparisonChart';
import AdvisoryPanel from './components/panels/AdvisoryPanel';
import EnforcementPanel from './components/panels/EnforcementPanel';
import ChatPanel from './components/panels/ChatPanel';
import { getAqiCategory, CITIES } from './utils/constants';
import { aqiApi, stationsApi, predictApi, attributionApi, advisoryApi } from './services/api';
import { 
  ShieldAlert, 
  Map as MapIcon, 
  Eye, 
  AlertOctagon, 
  Activity, 
  TrendingUp, 
  BookOpen, 
  AlertTriangle,
  Bot
} from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeCity, setActiveCity] = useState('delhi');
  const [stations, setStations] = useState([]);
  const [selectedStationId, setSelectedStationId] = useState('');
  const [selectedStation, setSelectedStation] = useState(null);
  
  // Readings and details
  const [currentReadings, setCurrentReadings] = useState([]);
  const [trendReadings, setTrendReadings] = useState([]);
  const [forecast, setForecast] = useState([]);
  const [attributions, setAttributions] = useState(null);
  
  // Layer toggles
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showVulnerabilities, setShowVulnerabilities] = useState(false);
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [heatmapPoints, setHeatmapPoints] = useState([]);
  
  // Compare and global states
  const [compareData, setCompareData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [syncTime, setSyncTime] = useState(new Date());
  const [showChat, setShowChat] = useState(false);

  const fetchBaseData = async () => {
    try {
      // 1. Get stations and readings for city
      const currentData = await aqiApi.current(activeCity);
      setCurrentReadings(currentData);
      
      const stationsList = currentData.map(d => d.station);
      setStations(stationsList);
      
      if (currentData.length > 0) {
        // Set default selected station
        const defaultId = currentData[0].station.station_id;
        setSelectedStationId(defaultId);
      }
      
      // 2. Fetch heat points
      const heatData = await aqiApi.heatmap(activeCity);
      setHeatmapPoints(heatData);
      
      // 3. Fetch vulnerabilities
      const vulData = await advisoryApi.vulnerabilityMap(activeCity);
      setVulnerabilities(vulData);
      
      // 4. Fetch alerts
      const activeAlerts = await predictApi.alerts(activeCity);
      setAlerts(activeAlerts);
      
      setSyncTime(new Date());
    } catch (e) {
      console.error("Error loading base layout data: ", e);
    }
  };

  useEffect(() => {
    fetchBaseData();
  }, [activeCity]);

  // Fetch details when selected station changes
  useEffect(() => {
    if (!selectedStationId) return;
    
    const loadStationDetails = async () => {
      try {
        // 1. Fetch station details
        const st = await stationsApi.get(selectedStationId);
        setSelectedStation(st);
        
        // 2. Fetch recent 24h readings for trend chart
        const trend = await stationsApi.readings(selectedStationId, 24);
        setTrendReadings(trend);
        
        // 3. Fetch predictions
        const pred = await predictApi.forecast(selectedStationId, 72);
        setForecast(pred.predictions);
        
        // 4. Fetch attributions
        const attr = await attributionApi.sources(activeCity, st.zone);
        setAttributions(attr);
      } catch (e) {
        console.error("Error loading station details: ", e);
      }
    };
    
    loadStationDetails();
  }, [selectedStationId]);

  // Load comparison statistics
  useEffect(() => {
    if (activeTab === 'compare') {
      const loadCompare = async () => {
        try {
          const data = await aqiApi.compare('delhi,mumbai,bengaluru,kolkata,chennai,hyderabad,lucknow,jabalpur');
          setCompareData(data);
        } catch (e) {
          console.error("Error loading comparison metrics: ", e);
        }
      };
      loadCompare();
    }
  }, [activeTab]);

  const activeCityCoords = CITIES[activeCity] ? [CITIES[activeCity].lat, CITIES[activeCity].lon] : [28.6139, 77.2090];
  const activeStationReading = currentReadings.find(r => r.station.station_id === selectedStationId)?.reading;
  const activeStationAqiCat = activeStationReading ? getAqiCategory(activeStationReading.aqi) : null;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top Navbar */}
      <Navbar 
        activeCity={activeCity} 
        onCityChange={(c) => {
          setActiveCity(c);
          setSelectedStationId('');
          setSelectedStation(null);
        }}
        dataFreshness={syncTime}
        onRefresh={fetchBaseData}
      />

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden w-full">
        {/* Left Navigation Sidebar */}
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Pages */}
        <main className="flex-1 flex flex-col overflow-y-auto bg-slate-950/40 p-6 space-y-6">
          
          {/* TAB 1: DASHBOARD COMMAND CENTER */}
          {activeTab === 'dashboard' && (
            <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
              
              {/* Map Column (65% width) */}
              <div className="w-full lg:w-[65%] flex flex-col relative h-[500px] lg:h-full min-h-[400px]">
                {/* Layer Control Badges */}
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

                {/* Leaflet Interactive Map */}
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

                {/* Timelapse slider (static hourly offset overlay) */}
                <TimeSlider 
                  onChange={(val) => {
                    // Timelapse simulation: slightly offset AQI for visualization
                    if (val !== 0) {
                      const modifiedReadings = currentReadings.map(r => {
                        const baseAqi = r.reading.aqi;
                        const timestampDate = new Date(r.reading.timestamp);
                        const factor = 1.0 + (Math.sin((val + timestampDate.getHours()) * 0.2) * 0.15);
                        return {
                          ...r,
                          reading: {
                            ...r.reading,
                            aqi: Math.max(10, Math.min(500, baseAqi * factor))
                          }
                        };
                      });
                      setCurrentReadings(modifiedReadings);
                    } else {
                      // restore live
                      fetchBaseData();
                    }
                  }}
                />
              </div>

              {/* Data & AI Insights Panel (35% width) */}
              <div className="w-full lg:w-[35%] flex flex-col gap-6 overflow-y-auto pr-1">
                {/* 1. Selected Station Details */}
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

                      {/* Large AQI Indicator */}
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

                      {/* Pollutant concentrations compared to safe limits */}
                      <div>
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Pollutant sub-indices</h3>
                        <PollutantBreakdown reading={activeStationReading} />
                      </div>

                      {/* 24-hour historical line chart */}
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

                {/* 2. Source Attribution Engine */}
                {selectedStation && attributions && (
                  <div className="glass-card p-5 space-y-4">
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">Source Attribution</h3>
                      <p className="text-[10px] text-slate-400">Geospatial pollution attribution estimates for {selectedStation.zone}</p>
                    </div>
                    <SourcePieChart attributions={attributions.attributions} />
                    
                    {/* Evidence summary */}
                    <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-[10px] grid grid-cols-2 gap-2 text-slate-400">
                      <div>Traffic Congestion: <span className="font-bold text-slate-200">{Math.round(attributions.evidence.traffic_congestion_score * 100)}%</span></div>
                      <div>Nearby Stacks: <span className="font-bold text-slate-200">{attributions.evidence.nearby_industries} found</span></div>
                      <div>Construction: <span className="font-bold text-slate-200">{attributions.evidence.active_construction_sites} sites</span></div>
                      <div>Crop Fire Alerts: <span className="font-bold text-slate-200">{attributions.evidence.fire_hotspots_detected} hotspots</span></div>
                    </div>
                  </div>
                )}

                {/* 3. CPCB Regulations Chatbot removed from here and moved to a floating layout */}
              </div>

            </div>
          )}

          {/* TAB 2: PREDICTIONS PANEL */}
          {activeTab === 'predictions' && (
            <div className="space-y-6">
              <div className="glass-card p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-white">72-Hour Predictive AQI Forecast</h2>
                  <p className="text-xs text-slate-400">Autoregressive XGBoost model predicting trends with 80% confidence interval bands</p>
                </div>
                
                {selectedStation ? (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 glass-card p-4 bg-slate-900/40">
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">72-Hour Forecast (AQI vs Time)</h3>
                      <PredictionChart data={forecast} />
                    </div>
                    
                    {/* Forecast warnings and stats */}
                    <div className="space-y-4">
                      <div className="glass-card p-4 space-y-3 bg-slate-900/30">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Prediction Summary</h4>
                        <div className="space-y-2 text-xs text-slate-300 font-medium">
                          <div className="flex justify-between py-1 border-b border-slate-800">
                            <span>Target Station:</span>
                            <span className="font-bold text-white">{selectedStation.name}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-800">
                            <span>Max Predicted AQI:</span>
                            <span className="font-bold text-red-400">
                              {forecast.length > 0 ? Math.max(...forecast.map(f => f.aqi)) : 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-800">
                            <span>Quantile Uncertainty:</span>
                            <span className="font-bold text-blue-300">± 24.5 AQI</span>
                          </div>
                          <div className="flex justify-between py-1">
                            <span>Model Engine:</span>
                            <span className="font-mono text-slate-400 text-[10px]">XGBoost Quantile v1</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Active Breaches list */}
                      <div className="glass-card p-4 space-y-3 border-l-4 border-l-red-500 bg-red-950/10">
                        <div className="flex items-center gap-2 text-red-400">
                          <AlertTriangle className="h-4 w-4" />
                          <h4 className="text-xs font-bold uppercase tracking-wider">Active Forecast Alerts</h4>
                        </div>
                        {alerts.length === 0 ? (
                          <p className="text-xs text-slate-400">No critical threshold breaches predicted for next 72 hours.</p>
                        ) : (
                          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                            {alerts.map((alert, idx) => (
                              <div key={idx} className="text-[11px] text-slate-300 bg-slate-900/80 p-2 rounded border border-slate-800">
                                <span className="font-bold text-white">{alert.zone}</span> predicted to breach threshold on{' '}
                                <span className="font-mono text-red-400">{new Date(alert.predicted_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>{' '}
                                (Expected AQI: <span className="font-bold text-red-500">{alert.predicted_aqi}</span>)
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    Please select a station in the Command Center tab to analyze predictions.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ENFORCEMENT ACTIONS DESK */}
          {activeTab === 'enforcement' && (
            <div className="glass-card p-6 bg-slate-900/20">
              <EnforcementPanel city={activeCity} onRefresh={fetchBaseData} />
            </div>
          )}

          {/* TAB 4: CITIZEN PORTAL ADVISORIES */}
          {activeTab === 'advisory' && (
            <div className="glass-card p-6 bg-slate-900/20 max-w-4xl mx-auto w-full">
              {selectedStation ? (
                <AdvisoryPanel 
                  city={activeCity} 
                  zone={selectedStation.zone} 
                  aqiLevel={activeStationReading?.aqi} 
                  category={activeStationAqiCat?.label} 
                />
              ) : (
                <div className="text-center py-12 text-slate-500 text-xs">
                  Please select a station in the Command Center tab to configure warnings.
                </div>
              )}
            </div>
          )}

          {/* TAB 5: MULTI-CITY ANALYTICS COMPARE */}
          {activeTab === 'compare' && (
            <div className="glass-card p-6 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white">Multi-City Comparative Analytics</h2>
                <p className="text-xs text-slate-400">Track and compare air quality averages across India's largest urban hubs</p>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Comparative Bar Chart */}
                <div className="lg:col-span-2 glass-card p-5 bg-slate-900/40">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Average City AQI Indexes</h3>
                  <CityComparisonChart data={compareData} />
                </div>
                
                {/* Metrics Table */}
                <div className="glass-card p-5 bg-slate-900/20">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Pollutant Averages (µg/m³)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left text-slate-300">
                      <thead className="text-[10px] text-slate-500 uppercase tracking-wider border-b border-slate-800">
                        <tr>
                          <th className="py-2">City</th>
                          <th className="py-2 text-right">AQI</th>
                          <th className="py-2 text-right">PM2.5</th>
                          <th className="py-2 text-right">PM10</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50 font-medium">
                        {compareData.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/30">
                            <td className="py-2.5 font-semibold text-white">{row.city}</td>
                            <td className="py-2.5 text-right font-mono font-bold" style={{ color: getAqiCategory(row.avg_aqi).color }}>
                              {row.avg_aqi}
                            </td>
                            <td className="py-2.5 text-right font-mono">{row.avg_pm25}</td>
                            <td className="py-2.5 text-right font-mono">{row.avg_pm10}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Bottom Footer */}
      <Footer />

      {/* Floating CPCB Regulations Chatbot */}
      <div className="fixed bottom-6 right-6 z-[2000] flex flex-col items-end">
        {/* Chat Window Popup */}
        {showChat && (
          <div className="mb-4 w-[320px] sm:w-[400px] shadow-2xl rounded-2xl overflow-hidden border border-slate-800/80 bg-slate-900">
            <ChatPanel onClose={() => setShowChat(false)} />
          </div>
        )}

        {/* Toggle Button */}
        <button
          onClick={() => setShowChat(!showChat)}
          className={`h-14 w-14 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-95 border ${
            showChat 
              ? 'bg-slate-800 text-slate-300 hover:text-white border-slate-700' 
              : 'bg-blue-600 hover:bg-blue-500 text-white hover:shadow-blue-500/25 border-blue-500/30'
          }`}
          title={showChat ? "Close Compliance Assistant" : "Query CPCB Compliance Assistant"}
        >
          <Bot className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}

export default App;

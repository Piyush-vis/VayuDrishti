import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box, Paper, Fab, Tooltip } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import ChatPanel from './components/panels/ChatPanel';

import Dashboard from './pages/Dashboard';
import Predictions from './pages/Predictions';
import Enforcement from './pages/Enforcement';
import WarRoom from './pages/WarRoom';
import Advisory from './pages/Advisory';
import Compare from './pages/Compare';

import { aqiApi, attributionApi, stationsApi, predictApi, advisoryApi } from './services/api';
import { useReplay } from './context/ReplayContext';

function App() {
  const [activeCity, setActiveCity] = useState('delhi');
  const [currentReadings, setCurrentReadings] = useState([]);  // city-filtered, for analytics
  const [allReadings, setAllReadings] = useState([]);           // all cities, for map
  const [heatmapPoints, setHeatmapPoints] = useState([]);       // all cities heatmap
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [dataFreshness, setDataFreshness] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Cross-page shared telemetry state
  const [selectedStationId, setSelectedStationId] = useState(null);
  const [trendReadings, setTrendReadings] = useState([]);
  const [attributions, setAttributions] = useState(null);

  // Predictions page state
  const [forecast, setForecast] = useState([]);
  const [forecastMeta, setForecastMeta] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [forecastAlerts, setForecastAlerts] = useState([]);

  const { replayAtDebounced } = useReplay();

  // Refs for Chat dialog click-outside handling
  const chatContainerRef = useRef(null);
  const chatButtonRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showChat &&
        chatContainerRef.current &&
        !chatContainerRef.current.contains(event.target) &&
        chatButtonRef.current &&
        !chatButtonRef.current.contains(event.target)
      ) {
        setShowChat(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && showChat) {
        setShowChat(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showChat]);

  // Primary data fetch routine
  const fetchBaseData = async () => {
    // Each fetch is isolated — one failure won't abort the others

    // 1. City-filtered readings for analytics cards/charts
    try {
      const readings = await aqiApi.current(activeCity);
      setCurrentReadings(readings);
      if (readings.length > 0) {
        setDataFreshness(
          new Date(readings[0].reading.timestamp).toLocaleString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false,
            timeZoneName: 'short',
          })
        );
        if (!selectedStationId) {
          setSelectedStationId(readings[0].station.station_id);
        }
      }
    } catch (err) { console.error('currentReadings fetch failed:', err.message); }

    // 2. All-city readings for the map (no city filter)
    try {
      const allData = await aqiApi.current();
      setAllReadings(allData);
    } catch (err) { console.error('allReadings fetch failed:', err.message); }

    // 3. All-city heatmap points
    try {
      const heat = await aqiApi.heatmap();
      setHeatmapPoints(Array.isArray(heat) ? heat : []);
    } catch (err) { console.error('heatmap fetch failed:', err.message); }

    // 4. Vulnerability overlays (city-specific)
    try {
      const vulns = await advisoryApi.vulnerabilityMap(activeCity);
      setVulnerabilities(Array.isArray(vulns) ? vulns : []);
    } catch (err) { console.error('vulnerabilities fetch failed:', err.message); }
  };

  useEffect(() => {
    fetchBaseData();
  }, [activeCity, replayAtDebounced]);

  // Station deep-dive telemetry synchronizer
  useEffect(() => {
    if (!selectedStationId) return;

    let isMounted = true;
    const fetchStationData = async () => {
      try {
        // 24h trend uses /stations/{id}/readings?hours=24
        const trend = await stationsApi.readings(selectedStationId, 24);
        if (isMounted) setTrendReadings(trend);

        // Attribution
        const currentStation = currentReadings.find(r => r.station.station_id === selectedStationId);
        if (currentStation) {
          const attr = await attributionApi.sources(activeCity, currentStation.station.zone);
          if (isMounted) setAttributions(attr);
        }

        // Forecast for Predictions page
        const fc = await predictApi.forecast(selectedStationId, 72);
        if (isMounted) {
          setForecast(fc.predictions || []);
          setForecastMeta({
            modelVersion: fc.model_version,
            rmse: fc.rmse,
            horizonMetrics: fc.horizon_metrics,
            provenance: fc.provenance,
          });
        }

        // SHAP explanation at 24h horizon
        const exp = await predictApi.explain(selectedStationId, 24);
        if (isMounted) setExplanation(exp);

        // Forecast breach alerts
        const alerts = await predictApi.alerts(activeCity);
        if (isMounted) setForecastAlerts(Array.isArray(alerts) ? alerts : []);
      } catch (err) {
        console.error('Error fetching station detailed metrics:', err);
      }
    };

    fetchStationData();

    return () => {
      isMounted = false;
    };
  }, [selectedStationId, activeCity, currentReadings, replayAtDebounced]);

  const selectedStation = currentReadings.find(r => r.station.station_id === selectedStationId)?.station;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary' }}>
      {/* Sidebar Navigation (Toggleable) */}
      <Sidebar open={sidebarOpen} />

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          transition: (theme) =>
            theme.transitions.create(['margin', 'width'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.standard,
            }),
        }}
      >
        <Navbar 
          activeCity={activeCity}
          onCityChange={setActiveCity}
          dataFreshness={dataFreshness}
          onRefresh={fetchBaseData}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        <Box sx={{ p: { xs: 2, sm: 3 }, flexGrow: 1, overflowY: 'auto' }}>
          <Routes>
            <Route 
              path="/" 
              element={
                <Dashboard 
                  activeCity={activeCity}
                  currentReadings={currentReadings}
                  allReadings={allReadings}
                  setCurrentReadings={setCurrentReadings}
                  heatmapPoints={heatmapPoints}
                  vulnerabilities={vulnerabilities}
                  fetchBaseData={fetchBaseData}
                  selectedStationId={selectedStationId}
                  setSelectedStationId={setSelectedStationId}
                  selectedStation={selectedStation}
                  trendReadings={trendReadings}
                  attributions={attributions}
                />
              } 
            />
            <Route 
              path="/war-room" 
              element={<WarRoom activeCity={activeCity} />} 
            />
            <Route 
              path="/predictions" 
              element={
                <Predictions 
                  activeCity={activeCity} 
                  selectedStation={selectedStation} 
                  selectedStationId={selectedStationId}
                  forecast={forecast}
                  forecastMeta={forecastMeta}
                  explanation={explanation}
                  alerts={forecastAlerts}
                />
              } 
            />
            <Route 
              path="/enforcement" 
              element={
                <Enforcement 
                  activeCity={activeCity} 
                  selectedStation={selectedStation}
                />
              } 
            />
            <Route 
              path="/advisory" 
              element={
                <Advisory 
                  activeCity={activeCity} 
                  selectedStation={selectedStation}
                  currentReadings={currentReadings}
                />
              } 
            />
            <Route 
              path="/compare" 
              element={<Compare />} 
            />
          </Routes>
        </Box>
      </Box>

      {/* Floating CPCB Regulations Chatbot Dialog / Premium Circular FAB */}
      <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 2000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        {showChat && (
          <Paper
            ref={chatContainerRef}
            elevation={8}
            sx={{
              mb: 2,
              width: { xs: 320, sm: 420 },
              borderRadius: 1,
              overflow: 'hidden',
              border: 1,
              borderColor: 'divider',
            }}
          >
            <ChatPanel onClose={() => setShowChat(false)} />
          </Paper>
        )}

        <Tooltip title={showChat ? "Close Regulatory Assistant (Esc)" : "Ask CPCB Regulatory Assistant"}>
          <Fab
            ref={chatButtonRef}
            onClick={() => setShowChat(!showChat)}
            sx={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #00B4D8 0%, #0077B6 100%)',
              color: '#FFFFFF',
              boxShadow: '0 8px 24px rgba(0, 180, 216, 0.45), 0 2px 6px rgba(0,0,0,0.3)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                background: 'linear-gradient(135deg, #00C4EC 0%, #0096C7 100%)',
                boxShadow: '0 12px 28px rgba(0, 180, 216, 0.6), 0 4px 8px rgba(0,0,0,0.4)',
                transform: 'scale(1.05)',
              },
              '&:active': {
                transform: 'scale(0.96)',
              },
            }}
          >
            {showChat ? <AutoAwesomeIcon sx={{ fontSize: 26 }} /> : <SmartToyIcon sx={{ fontSize: 28 }} />}
          </Fab>
        </Tooltip>
      </Box>
    </Box>
  );
}

export default App;

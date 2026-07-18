import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import Footer from './components/layout/Footer';
import ChatPanel from './components/panels/ChatPanel';

// Pages
import Dashboard from './pages/Dashboard';
import WarRoom from './pages/WarRoom';
import Predictions from './pages/Predictions';
import Enforcement from './pages/Enforcement';
import Advisory from './pages/Advisory';
import Compare from './pages/Compare';

// Hooks
import { useAQIData } from './hooks/useAQIData';
import { useStations } from './hooks/useStations';
import ReplayBanner from './components/common/ReplayBanner';

import { Bot } from 'lucide-react';

function App() {
  const [activeCity, setActiveCity] = useState('delhi');
  const [selectedStationId, setSelectedStationId] = useState('');
  const [showChat, setShowChat] = useState(false);

  // Custom hooks to manage state and logic
  const { 
    currentReadings, 
    setCurrentReadings, 
    heatmapPoints, 
    vulnerabilities, 
    alerts, 
    syncTime, 
    fetchBaseData 
  } = useAQIData(activeCity);

  const {
    selectedStation,
    trendReadings,
    forecast,
    forecastMeta,
    attributions
  } = useStations(selectedStationId, activeCity);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top Navbar */}
      <Navbar 
        activeCity={activeCity} 
        onCityChange={(c) => {
          setActiveCity(c);
          setSelectedStationId('');
        }}
        dataFreshness={syncTime}
        onRefresh={fetchBaseData}
      />

      {/* Historical replay strip (only visible when an episode is active) */}
      <ReplayBanner />

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden w-full">
        {/* Left Navigation Sidebar */}
        <Sidebar />

        {/* Tab Pages with React Router */}
        <main className="flex-1 flex flex-col overflow-y-auto bg-slate-950/40 p-6 space-y-6">
          <Routes>
            <Route 
              path="/" 
              element={
                <Dashboard 
                  activeCity={activeCity}
                  currentReadings={currentReadings}
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
                  selectedStation={selectedStation}
                  forecast={forecast}
                  forecastMeta={forecastMeta}
                  alerts={alerts}
                />
              } 
            />
            <Route 
              path="/enforcement" 
              element={
                <Enforcement 
                  activeCity={activeCity}
                  fetchBaseData={fetchBaseData}
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

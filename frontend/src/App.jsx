import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
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

import { MessageSquareCode, Sparkles } from 'lucide-react';

function App() {
  const [activeCity, setActiveCity] = useState('delhi');
  const [selectedStationId, setSelectedStationId] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const chatContainerRef = useRef(null);
  const chatButtonRef = useRef(null);

  // Close chatbot when clicking outside or pressing Escape
  useEffect(() => {
    const handlePointerDownOutside = (event) => {
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

    document.addEventListener('mousedown', handlePointerDownOutside);
    document.addEventListener('touchstart', handlePointerDownOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDownOutside);
      document.removeEventListener('touchstart', handlePointerDownOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showChat]);

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
    explanation,
    attributions
  } = useStations(selectedStationId, activeCity);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--bg-base)] text-[var(--text-primary)] transition-colors">
      {/* Top Navbar */}
      <Navbar 
        activeCity={activeCity} 
        onCityChange={(c) => {
          setActiveCity(c);
          setSelectedStationId('');
        }}
        dataFreshness={syncTime}
        onRefresh={fetchBaseData}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
      />

      {/* Historical replay strip (only visible when an episode is active) */}
      <ReplayBanner />

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden w-full">
        {/* Left Navigation Sidebar */}
        <Sidebar isOpen={sidebarOpen} />

        {/* Tab Pages with React Router */}
        <main className="flex-1 flex flex-col overflow-y-auto p-4 lg:p-6 space-y-6">
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
                  explanation={explanation}
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

      {/* Floating CPCB Regulations Chatbot */}
      <div className="fixed bottom-5 right-5 z-[2000] flex flex-col items-end">
        {/* Chat Window Popup with outside click ref */}
        {showChat && (
          <div 
            ref={chatContainerRef}
            className="mb-3 w-[340px] sm:w-[420px] shadow-2xl rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-surface)] animate-in fade-in slide-in-from-bottom-3 duration-150"
          >
            <ChatPanel onClose={() => setShowChat(false)} />
          </div>
        )}

        {/* Minimalist Floating Assistant Button */}
        <button
          ref={chatButtonRef}
          onClick={() => setShowChat(!showChat)}
          className={`h-11 w-11 rounded-xl flex items-center justify-center shadow-lg transition-all active:scale-95 border cursor-pointer ${
            showChat 
              ? 'bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] border-[var(--border-active)]' 
              : 'bg-[var(--accent-emerald)] hover:opacity-90 text-white border-[var(--accent-emerald-border)] shadow-emerald-500/20'
          }`}
          title={showChat ? "Close Regulatory Assistant (Esc)" : "Ask CPCB Regulatory Assistant"}
          aria-label="Toggle Regulatory Assistant"
        >
          {showChat ? (
            <Sparkles className="h-5 w-5" />
          ) : (
            <MessageSquareCode className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
}

export default App;

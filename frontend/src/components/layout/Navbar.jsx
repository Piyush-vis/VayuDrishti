import React from 'react';
import { CITIES } from '../../utils/constants';
import { Activity, RefreshCw } from 'lucide-react';
import { dataApi } from '../../services/api';

const Navbar = ({ activeCity, onCityChange, dataFreshness, onRefresh }) => {
  const handleTriggerIngestion = async () => {
    try {
      await dataApi.ingest();
      alert("Live data ingestion triggered in background! Refreshing in 3 seconds...");
      setTimeout(() => {
        onRefresh();
      }, 3000);
    } catch (e) {
      console.error(e);
      alert("Failed to trigger ingestion: " + e.message);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/30 text-blue-400">
          <Activity className="h-6 w-6 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-wider text-white">VAYUDRISHTI</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">वायुदृष्टि</span>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">AI-powered Urban Air Quality Intelligence Platform</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* City Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 font-medium uppercase tracking-wider hidden md:block">Active City:</label>
          <select
            value={activeCity}
            onChange={(e) => onCityChange(e.target.value)}
            className="bg-slate-800/80 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
          >
            {Object.entries(CITIES).map(([key, city]) => (
              <option key={key} value={key}>
                {city.name}
              </option>
            ))}
          </select>
        </div>

        {/* Refresh Button */}
        <button
          onClick={handleTriggerIngestion}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/10 transition-all active:scale-95"
          title="Trigger live data ingestion job"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Ingest Live</span>
        </button>

        {dataFreshness && (
          <div className="text-right hidden lg:block">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Last Sync</p>
            <p className="text-xs text-slate-300 font-mono">
              {new Date(dataFreshness).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;

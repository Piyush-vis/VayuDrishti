import { motion } from 'framer-motion';
import React, { useState, useEffect } from 'react';
import CityComparisonChart from '../components/charts/CityComparisonChart';
import AQIBadge from '../components/common/AQIBadge';
import GovFeedPanel from '../components/panels/GovFeedPanel';
import { aqiApi } from '../services/api';
import { useReplay } from '../context/ReplayContext';
import { BarChart3 } from 'lucide-react';

function Compare() {
  const { replayAtDebounced } = useReplay();
  const [compareData, setCompareData] = useState([]);

  useEffect(() => {
    const loadCompare = async () => {
      try {
        const data = await aqiApi.compare('delhi,mumbai,bengaluru,kolkata,chennai,hyderabad,lucknow,jabalpur');
        setCompareData(data);
      } catch (e) {
        console.error("Error loading comparison metrics: ", e);
      }
    };
    loadCompare();
  }, [replayAtDebounced]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="bento-card p-6 space-y-6 w-full max-w-7xl mx-auto"
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-[var(--accent-sky-subtle)] border border-[var(--accent-sky-border)] flex items-center justify-center text-[var(--accent-sky)]">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-heading font-extrabold text-[var(--text-primary)]">
            Multi-City Comparative Analytics & NCAP Telemetry
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Cross-urban air quality indexes and particulate distributions across India's principal industrial & metro zones
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 bento-card p-5 bg-[var(--bg-surface-elevated)]">
          <h3 className="text-xs font-heading font-bold text-[var(--text-primary)] uppercase tracking-wider mb-3">
            Average Urban AQI Distribution
          </h3>
          <CityComparisonChart data={compareData} />
        </div>
        
        <div className="lg:col-span-4 bento-card p-5 space-y-3">
          <h3 className="text-xs font-heading font-bold text-[var(--text-primary)] uppercase tracking-wider">
            City Particulate Averages (µg/m³)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[10px] font-heading font-bold text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border-subtle)]">
                <tr>
                  <th className="py-2">City</th>
                  <th className="py-2 text-right">AQI Status</th>
                  <th className="py-2 text-right">PM2.5</th>
                  <th className="py-2 text-right">PM10</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] font-medium">
                {compareData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[var(--bg-surface-elevated)] transition-colors">
                    <td className="py-2.5 font-heading font-bold text-[var(--text-primary)]">{row.city}</td>
                    <td className="py-2.5 text-right">
                      <AQIBadge aqi={row.avg_aqi} size="sm" />
                    </td>
                    <td className="py-2.5 text-right font-mono font-bold text-[var(--text-primary)]">{row.avg_pm25}</td>
                    <td className="py-2.5 text-right font-mono text-[var(--text-secondary)]">{row.avg_pm10}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <GovFeedPanel />
    </motion.div>
  );
}

export default Compare;

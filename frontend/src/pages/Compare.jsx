import { motion } from 'framer-motion';
import React, { useState, useEffect } from 'react';
import CityComparisonChart from '../components/charts/CityComparisonChart';
import AQIBadge from '../components/common/AQIBadge';
import { aqiApi } from '../services/api';
import { useReplay } from '../context/ReplayContext';

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
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="glass-card p-6 space-y-6 w-full"
    >
      <div>
        <h2 className="text-lg font-bold text-white">Multi-City Comparative Analytics</h2>
        <p className="text-xs text-slate-400">Track and compare air quality averages across India's largest urban hubs</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card p-5 bg-slate-900/40">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Average City AQI Indexes</h3>
          <CityComparisonChart data={compareData} />
        </div>
        
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
                    <td className="py-2.5 text-right">
                      <AQIBadge aqi={row.avg_aqi} />
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
    </motion.div>
  );
}

export default Compare;

import { motion } from 'framer-motion';
import React from 'react';
import AdvisoryPanel from '../components/panels/AdvisoryPanel';
import { getAqiCategory } from '../utils/constants';

function Advisory({ activeCity, selectedStation, currentReadings }) {
  const activeStationReading = currentReadings.find(r => r.station.station_id === selectedStation?.station_id)?.reading;
  const activeStationAqiCat = activeStationReading ? getAqiCategory(activeStationReading.aqi) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="glass-card p-6 bg-slate-900/20 max-w-4xl mx-auto w-full"
    >
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
    </motion.div>
  );
}

export default Advisory;

import { motion } from 'framer-motion';
import React, { useState } from 'react';
import AdvisoryPanel from '../components/panels/AdvisoryPanel';
import IVRPreview from '../components/panels/IVRPreview';
import { getAqiCategory } from '../utils/constants';

function Advisory({ activeCity, selectedStation, currentReadings }) {
  const activeStationReading = currentReadings.find(r => r.station.station_id === selectedStation?.station_id)?.reading;
  const activeStationAqiCat = activeStationReading ? getAqiCategory(activeStationReading.aqi) : null;
  const [advisories, setAdvisories] = useState(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="max-w-6xl mx-auto w-full"
    >
      {selectedStation ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-card p-6 bg-slate-900/20">
            <AdvisoryPanel
              city={activeCity}
              zone={selectedStation.zone}
              aqiLevel={activeStationReading?.aqi}
              category={activeStationAqiCat?.label}
              onAdvisories={setAdvisories}
            />
          </div>
          <div className="lg:col-span-1">
            <IVRPreview
              advisories={advisories}
              category={activeStationAqiCat?.label}
              zone={selectedStation.zone}
            />
          </div>
        </div>
      ) : (
        <div className="glass-card p-6 bg-slate-900/20 text-center py-12 text-slate-500 text-xs">
          Please select a station in the Command Center tab to configure warnings.
        </div>
      )}
    </motion.div>
  );
}

export default Advisory;

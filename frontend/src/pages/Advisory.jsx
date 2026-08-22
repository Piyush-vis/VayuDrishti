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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="max-w-7xl mx-auto w-full space-y-5"
    >
      {selectedStation ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 bento-card p-6">
            <AdvisoryPanel
              city={activeCity}
              zone={selectedStation.zone}
              aqiLevel={activeStationReading?.aqi}
              category={activeStationAqiCat?.label}
              onAdvisories={setAdvisories}
            />
          </div>
          <div className="lg:col-span-4">
            <IVRPreview
              advisories={advisories}
              category={activeStationAqiCat?.label}
              zone={selectedStation.zone}
            />
          </div>
        </div>
      ) : (
        <div className="bento-card p-12 text-center text-[var(--text-muted)] text-xs font-heading">
          Please select a monitoring station in the Command Center to inspect citizen health advisories.
        </div>
      )}
    </motion.div>
  );
}

export default Advisory;

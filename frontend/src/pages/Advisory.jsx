import React, { useState } from 'react';
import { Box, Card, Typography } from '@mui/material';
import AdvisoryPanel from '../components/panels/AdvisoryPanel';
import IVRPreview from '../components/panels/IVRPreview';
import { getAqiCategory } from '../utils/constants';

function Advisory({ activeCity, selectedStation, currentReadings }) {
  const activeStationReading = currentReadings.find(r => r.station.station_id === selectedStation?.station_id)?.reading;
  const activeStationAqiCat = activeStationReading ? getAqiCategory(activeStationReading.aqi) : null;
  const [advisories, setAdvisories] = useState(null);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, width: '100%', minWidth: 0 }}>
      {selectedStation ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '1.6fr 1fr' },
            gap: 2.5,
            width: '100%',
            alignItems: 'start',
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <AdvisoryPanel
              city={activeCity}
              zone={selectedStation.zone}
              aqiLevel={activeStationReading?.aqi}
              category={activeStationAqiCat?.label}
              onAdvisories={setAdvisories}
            />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <IVRPreview
              advisories={advisories}
              category={activeStationAqiCat?.label}
              zone={selectedStation.zone}
            />
          </Box>
        </Box>
      ) : (
        <Card elevation={1} sx={{ p: 6, textAlign: 'center', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Please select a monitoring station in the Command Center to inspect citizen health advisories.
          </Typography>
        </Card>
      )}
    </Box>
  );
}

export default Advisory;

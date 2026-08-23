import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';

import CityComparisonChart from '../components/charts/CityComparisonChart';
import AQIBadge from '../components/common/AQIBadge';
import GovFeedPanel from '../components/panels/GovFeedPanel';
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
        console.error('Error loading comparison metrics: ', e);
      }
    };
    loadCompare();
  }, [replayAtDebounced]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, width: '100%', minWidth: 0 }}>
      {/* Top Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <CompareArrowsIcon sx={{ color: 'primary.main', fontSize: 24 }} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Multi-City Comparative Analytics & NCAP Telemetry
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Cross-urban air quality indexes and particulate distributions across India's principal industrial & metro zones
          </Typography>
        </Box>
      </Box>

      {/* Main Grid: Chart & Comparison Table (Side by Side) */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1.6fr 1fr' },
          gap: 2.5,
          width: '100%',
          alignItems: 'start',
        }}
      >
        {/* Left: Urban AQI Distribution Chart */}
        <Card elevation={1} sx={{ p: 2.5, borderRadius: 1, minWidth: 0, width: '100%' }}>
          <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 2, fontWeight: 700 }}>
            AVERAGE URBAN AQI DISTRIBUTION
          </Typography>
          <Box sx={{ minHeight: 380, width: '100%' }}>
            <CityComparisonChart data={compareData} />
          </Box>
        </Card>

        {/* Right: City Particulate Table */}
        <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 1, minWidth: 0 }}>
          <Box sx={{ p: 2, pb: 1 }}>
            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
              CITY PARTICULATE AVERAGES (µg/m³)
            </Typography>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700 }}>City</TableCell>
                <TableCell align="center" sx={{ fontSize: '0.75rem', fontWeight: 700 }}>AQI Status</TableCell>
                <TableCell align="right" sx={{ fontSize: '0.75rem', fontWeight: 700 }}>PM2.5</TableCell>
                <TableCell align="right" sx={{ fontSize: '0.75rem', fontWeight: 700 }}>PM10</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {compareData.map((row, idx) => (
                <TableRow key={idx} hover>
                  <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700 }}>{row.city}</TableCell>
                  <TableCell align="center">
                    <AQIBadge aqi={row.avg_aqi} size="small" />
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 700 }}>
                    {row.avg_pm25}
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'text.secondary' }}>
                    {row.avg_pm10}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Official Gov Feed Card */}
      <GovFeedPanel />
    </Box>
  );
}

export default Compare;

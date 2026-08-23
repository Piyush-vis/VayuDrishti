import React from 'react';
import { Box, Typography } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useTheme } from '@mui/material/styles';

const PollutantBreakdown = ({ reading }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  if (!reading) {
    return (
      <Box sx={{ height: 176, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          Select any station marker to inspect pollutant breakdown.
        </Typography>
      </Box>
    );
  }

  const data = [
    { name: 'PM2.5', value: reading.pm25 || 0, limit: 60, unit: 'µg/m³' },
    { name: 'PM10', value: reading.pm10 || 0, limit: 100, unit: 'µg/m³' },
    { name: 'NO2', value: reading.no2 || 0, limit: 80, unit: 'µg/m³' },
    { name: 'SO2', value: reading.so2 || 0, limit: 80, unit: 'µg/m³' },
    { name: 'O3', value: reading.o3 || 0, limit: 100, unit: 'µg/m³' },
    { name: 'CO', value: Math.round((reading.co || 0) * 100), limit: 200, unit: 'µg/m³' }
  ];

  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0';
  const tickColor = isDark ? '#E2E8F0' : '#334155';

  const getBarColor = (val, limit) => {
    if (val > limit * 1.5) return '#CF6679'; // severe breach
    if (val > limit) return '#FFB74D'; // moderate breach
    return '#81C784'; // within standard
  };

  return (
    <Box sx={{ width: '100%', height: 176 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 6 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis 
            dataKey="name" 
            stroke={tickColor} 
            fontSize={11} 
            fontWeight={600}
            fontFamily="monospace"
            tickLine={false}
            dy={4}
          />
          <YAxis 
            stroke={tickColor} 
            fontSize={10}
            fontFamily="monospace"
            tickLine={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                const isExceeded = item.value > item.limit;
                const ratio = ((item.value / item.limit) * 100).toFixed(0);

                return (
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      border: 1,
                      borderColor: 'divider',
                      boxShadow: 3,
                      bgcolor: 'background.paper',
                      fontFamily: 'monospace',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 0.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{item.name}</Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          px: 0.75,
                          py: 0.25,
                          borderRadius: 0.5,
                          fontWeight: 700,
                          bgcolor: isExceeded ? 'rgba(207, 102, 121, 0.15)' : 'rgba(129, 199, 132, 0.15)',
                          color: isExceeded ? 'error.main' : 'success.main',
                        }}
                      >
                        {ratio}% of Limit
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                      Recorded: <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>{item.value} {item.unit}</Box>
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', color: 'text.disabled' }}>
                      NAAQS Standard: {item.limit} {item.unit}
                    </Typography>
                  </Box>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="value" radius={[3, 3, 0, 0]}>
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={getBarColor(entry.value, entry.limit)} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default PollutantBreakdown;

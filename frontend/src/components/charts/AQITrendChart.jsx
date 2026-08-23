import React from 'react';
import { Box, Typography } from '@mui/material';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatTime } from '../../utils/formatters';
import { useTheme } from '@mui/material/styles';

const AQITrendChart = ({ data }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  if (!data || data.length === 0) {
    return (
      <Box sx={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          No 24-hour trend telemetry recorded.
        </Typography>
      </Box>
    );
  }

  const chartData = data.map((item) => ({
    ...item,
    timeLabel: formatTime(item.timestamp),
  }));

  const strokeColor = isDark ? '#00B4D8' : '#00838F';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0';
  const tickColor = isDark ? '#CBD5E1' : '#334155';

  return (
    <Box sx={{ width: '100%', height: 180 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 4 }}>
          <defs>
            <linearGradient id="aqiTrendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={strokeColor} stopOpacity={isDark ? 0.35 : 0.25} />
              <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis 
            dataKey="timeLabel" 
            stroke={tickColor} 
            fontSize={10.5}
            fontWeight={600}
            fontFamily="monospace"
            tickLine={false}
            dy={4}
          />
          <YAxis 
            stroke={tickColor} 
            fontSize={10}
            fontFamily="monospace"
            domain={[0, 'auto']}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0',
              borderRadius: '4px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              fontFamily: 'monospace',
              fontSize: '11px',
              color: isDark ? '#FFFFFF' : '#0F172A',
            }}
            labelStyle={{ fontWeight: 'bold', color: isDark ? '#FFFFFF' : '#0F172A', marginBottom: '4px' }}
          />
          <Area 
            type="monotone" 
            dataKey="aqi" 
            name="AQI Level"
            stroke={strokeColor} 
            strokeWidth={2.5}
            fillOpacity={1} 
            fill="url(#aqiTrendGrad)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default AQITrendChart;

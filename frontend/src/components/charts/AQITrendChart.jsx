import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatTime } from '../../utils/formatters';
import { useTheme } from '../../context/ThemeContext';

const AQITrendChart = ({ data }) => {
  const { isDark } = useTheme();

  if (!data || data.length === 0) {
    return (
      <div className="h-52 flex items-center justify-center text-xs text-[var(--text-muted)] font-heading">
        No 24-hour trend telemetry recorded.
      </div>
    );
  }

  const chartData = data.map((item) => ({
    ...item,
    timeLabel: formatTime(item.timestamp),
  }));

  const strokeColor = isDark ? '#10B981' : '#059669';
  const gridColor = isDark ? '#233044' : '#E2E8F0';
  const tickColor = isDark ? '#94A3B8' : '#64748B';

  return (
    <div className="w-full h-52">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
            fontSize={10}
            fontFamily="var(--font-mono)"
            tickLine={false}
            dy={4}
          />
          <YAxis 
            stroke={tickColor} 
            fontSize={10}
            fontFamily="var(--font-mono)"
            domain={[0, 'auto']}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? '#131B2A' : '#FFFFFF',
              borderColor: isDark ? '#233044' : '#E2E8F0',
              borderRadius: '8px',
              boxShadow: '0 8px 24px -4px rgba(0,0,0,0.2)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: isDark ? '#F8FAFC' : '#0F172A'
            }}
            labelStyle={{ fontWeight: 'bold', color: isDark ? '#F8FAFC' : '#0F172A', marginBottom: '4px' }}
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
    </div>
  );
};

export default AQITrendChart;

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getAqiColor } from '../../utils/aqiColors';
import { useTheme } from '../../context/ThemeContext';

const CityComparisonChart = ({ data }) => {
  const { isDark } = useTheme();

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-[var(--text-muted)] font-heading">
        Loading multi-city comparative analytics...
      </div>
    );
  }

  const gridColor = isDark ? '#233044' : '#E2E8F0';
  const tickColor = isDark ? '#94A3B8' : '#64748B';

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 15, left: -20, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis 
            dataKey="city" 
            stroke={tickColor} 
            fontSize={11}
            fontFamily="var(--font-heading)"
            fontWeight="bold"
            tickLine={false}
            dy={6}
          />
          <YAxis 
            stroke={tickColor} 
            fontSize={10}
            fontFamily="var(--font-mono)"
            tickLine={false}
            domain={[0, 'auto']}
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
            formatter={(val) => [`${Math.round(val)} AQI`, 'City Average']}
          />
          <Bar dataKey="avg_aqi" name="City Average AQI" radius={[6, 6, 0, 0]}>
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={getAqiColor(entry.avg_aqi)} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CityComparisonChart;

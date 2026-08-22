import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { useTheme } from '../../context/ThemeContext';

const PollutantBreakdown = ({ reading }) => {
  const { isDark } = useTheme();

  if (!reading) {
    return (
      <div className="h-44 flex items-center justify-center text-xs text-[var(--text-muted)] font-heading">
        Select any station marker to inspect pollutant breakdown.
      </div>
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

  const gridColor = isDark ? '#233044' : '#E2E8F0';
  const tickColor = isDark ? '#94A3B8' : '#64748B';

  const getBarColor = (val, limit) => {
    if (val > limit * 1.5) return '#EF4444'; // severe breach
    if (val > limit) return '#F59E0B'; // moderate breach
    return '#10B981'; // within standard
  };

  return (
    <div className="w-full h-44">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis 
            dataKey="name" 
            stroke={tickColor} 
            fontSize={10} 
            fontFamily="var(--font-mono)"
            tickLine={false}
          />
          <YAxis 
            stroke={tickColor} 
            fontSize={10}
            fontFamily="var(--font-mono)"
            tickLine={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                const isExceeded = item.value > item.limit;
                const ratio = ((item.value / item.limit) * 100).toFixed(0);

                return (
                  <div className="p-3 rounded-lg border shadow-xl text-xs space-y-1.5 font-mono"
                       style={{
                         backgroundColor: isDark ? '#131B2A' : '#FFFFFF',
                         borderColor: isDark ? '#233044' : '#E2E8F0',
                         color: isDark ? '#F8FAFC' : '#0F172A'
                       }}>
                    <div className="flex justify-between items-center gap-4">
                      <span className="font-bold text-sm">{item.name}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        isExceeded ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {ratio}% of Limit
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Current Level: <span className="font-bold text-[var(--text-primary)]">{item.value} {item.unit}</span>
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      CPCB NAAQS Standard: {item.limit} {item.unit}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={getBarColor(entry.value, entry.limit)} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PollutantBreakdown;

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatTime } from '../../utils/formatters';
import { useTheme } from '../../context/ThemeContext';

const PredictionChart = ({ data }) => {
  const { isDark } = useTheme();

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-[var(--text-muted)] font-heading">
        No forecast telemetry loaded. Select a station to view predictions.
      </div>
    );
  }

  const chartData = data.map((item) => {
    const dateObj = new Date(item.timestamp);
    const hourLabel = formatTime(item.timestamp);
    const dayLabel = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    
    const low = Math.round(item.confidence_low || item.aqi * 0.85);
    const high = Math.round(item.confidence_high || item.aqi * 1.15);

    return {
      ...item,
      label: `${dayLabel} ${hourLabel}`,
      displayAqi: Math.round(item.aqi),
      low,
      high,
      band: Math.max(0, high - low)
    };
  });

  const strokeColor = isDark ? '#38BDF8' : '#0284C7';
  const gridColor = isDark ? '#233044' : '#E2E8F0';
  const tickColor = isDark ? '#94A3B8' : '#64748B';

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis 
            dataKey="label" 
            stroke={tickColor} 
            fontSize={10}
            fontFamily="var(--font-mono)"
            tickLine={false}
            interval={Math.max(1, Math.floor(chartData.length / 6))}
          />
          <YAxis 
            stroke={tickColor} 
            fontSize={10}
            fontFamily="var(--font-mono)"
            domain={[0, 500]}
            tickLine={false}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload || !payload.length) return null;
              const point = payload[0]?.payload;
              if (!point) return null;
              return (
                <div className="p-3 rounded-lg border shadow-xl text-xs space-y-1 font-mono"
                     style={{
                       backgroundColor: isDark ? '#131B2A' : '#FFFFFF',
                       borderColor: isDark ? '#233044' : '#E2E8F0',
                       color: isDark ? '#F8FAFC' : '#0F172A'
                     }}>
                  <p className="font-bold text-xs">{label}</p>
                  <p className="text-[var(--accent-sky)] font-bold text-sm">
                    Forecast AQI: {point.displayAqi}
                  </p>
                  <p className="text-[var(--text-muted)] text-[10px]">
                    80% Interval: {point.low} – {point.high}
                  </p>
                </div>
              );
            }}
          />
          
          <Area
            type="monotone"
            dataKey="low"
            stackId="confidence"
            stroke="none"
            fill="transparent"
            legendType="none"
            name="Confidence Low"
          />
          <Area
            type="monotone"
            dataKey="band"
            stackId="confidence"
            stroke="none"
            fill={strokeColor}
            fillOpacity={isDark ? 0.2 : 0.15}
            name="80% Range"
          />
          <Area 
            type="monotone" 
            dataKey="displayAqi" 
            stroke={strokeColor} 
            strokeWidth={2.5}
            fill="none"
            name="Predicted AQI"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PredictionChart;

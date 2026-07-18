import React from 'react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatTime, formatDate } from '../../utils/formatters';

const PredictionChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center text-xs text-slate-500">
        No forecast data available. Select a station to view predictions.
      </div>
    );
  }

  // Format data for Recharts
  const chartData = data.map((item) => {
    const dateObj = new Date(item.timestamp);
    const hourLabel = formatTime(item.timestamp);
    const dayLabel = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    
    const low = Math.round(item.confidence_low);
    const high = Math.round(item.confidence_high);

    return {
      ...item,
      label: `${dayLabel} ${hourLabel}`,
      displayAqi: Math.round(item.aqi),
      low,
      high,
      // Recharts has no "band between two values" primitive. The standard trick is a
      // stacked area: an invisible area up to `low`, then a visible area of height
      // `band` on top of it - together the visible fill spans exactly [low, high].
      band: Math.max(0, high - low)
    };
  });

  return (
    <div className="w-full h-56">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
          <XAxis 
            dataKey="label" 
            stroke="#94a3b8" 
            fontSize={9}
            tickLine={false}
            interval={8} // show fewer labels
          />
          <YAxis 
            stroke="#94a3b8" 
            fontSize={9}
            domain={[0, 500]}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
            labelStyle={{ color: '#94a3b8', fontSize: '10px', fontWeight: 'bold' }}
            itemStyle={{ color: '#fff', fontSize: '12px' }}
            content={({ active, payload, label }) => {
              if (!active || !payload || !payload.length) return null;
              const point = payload[0]?.payload;
              if (!point) return null;
              return (
                <div style={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', padding: '8px 10px' }}>
                  <p style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 'bold', margin: 0 }}>{label}</p>
                  <p style={{ color: '#3b82f6', fontSize: '12px', margin: '4px 0 0' }}>Predicted AQI: {point.displayAqi}</p>
                  <p style={{ color: '#94a3b8', fontSize: '11px', margin: '2px 0 0' }}>80% Confidence: {point.low} - {point.high}</p>
                </div>
              );
            }}
          />
          
          {/* Invisible base lifting the visible band up to the "low" bound */}
          <Area
            type="monotone"
            dataKey="low"
            stackId="confidence"
            stroke="none"
            fill="transparent"
            legendType="none"
            name="Confidence Low"
          />
          {/* Visible band: stacked on top of "low", so it spans exactly [low, high] */}
          <Area
            type="monotone"
            dataKey="band"
            stackId="confidence"
            stroke="none"
            fill="#3b82f6"
            fillOpacity={0.15}
            name="80% Confidence Range"
          />

          {/* Main forecast line */}
          <Area 
            type="monotone" 
            dataKey="displayAqi" 
            stroke="#3b82f6" 
            strokeWidth={2}
            fill="none"
            name="Predicted AQI"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PredictionChart;

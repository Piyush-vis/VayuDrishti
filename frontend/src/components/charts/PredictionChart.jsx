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
    
    return {
      ...item,
      label: `${dayLabel} ${hourLabel}`,
      // Recharts Area expects high and low as arrays or we can use confidence_high and base confidence_low
      displayAqi: Math.round(item.aqi),
      low: Math.round(item.confidence_low),
      high: Math.round(item.confidence_high)
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
          />
          
          {/* Confidence interval area range */}
          <Area 
            type="monotone" 
            dataKey="high" 
            stroke="none"
            fill="#3b82f6" 
            fillOpacity={0.12} 
            baseValue="low" // This creates the range band!
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

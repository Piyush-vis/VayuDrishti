import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatTime } from '../../utils/formatters';

const AQITrendChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-xs text-slate-500">
        No trend data available.
      </div>
    );
  }

  // Format timestamp for display
  const chartData = data.map((item) => ({
    ...item,
    timeLabel: formatTime(item.timestamp),
  }));

  return (
    <div className="w-full h-48">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
          <defs>
            <linearGradient id="colorAqi" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
          <XAxis 
            dataKey="timeLabel" 
            stroke="#94a3b8" 
            fontSize={9}
            tickLine={false}
          />
          <YAxis 
            stroke="#94a3b8" 
            fontSize={9}
            domain={[0, 'dataMax + 50']}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
            labelStyle={{ color: '#94a3b8', fontSize: '10px', fontWeight: 'bold' }}
            itemStyle={{ color: '#fff', fontSize: '12px' }}
          />
          <Area 
            type="monotone" 
            dataKey="aqi" 
            stroke="#3b82f6" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorAqi)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AQITrendChart;

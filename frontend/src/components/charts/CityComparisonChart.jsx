import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getAqiColor } from '../../utils/aqiColors';

const CityComparisonChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-500">
        Loading multi-city analytics...
      </div>
    );
  }

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 10, left: -25, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
          <XAxis 
            dataKey="city" 
            stroke="#94a3b8" 
            fontSize={10}
            tickLine={false}
          />
          <YAxis 
            stroke="#94a3b8" 
            fontSize={9}
            tickLine={false}
            domain={[0, 500]}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
            labelStyle={{ color: '#94a3b8', fontSize: '10px', fontWeight: 'bold' }}
            itemStyle={{ color: '#fff', fontSize: '12px' }}
          />
          <Bar dataKey="avg_aqi" name="Average City AQI" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={getAqiColor(entry.avg_aqi)} 
                fillOpacity={0.8}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CityComparisonChart;

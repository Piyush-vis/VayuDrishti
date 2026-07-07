import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const PollutantBreakdown = ({ reading }) => {
  if (!reading) {
    return (
      <div className="h-44 flex items-center justify-center text-xs text-slate-500">
        Select a station to view pollutants.
      </div>
    );
  }

  // Define pollutants, concentrations, and CPCB limits
  const data = [
    { name: 'PM2.5', value: reading.pm25, limit: 60, unit: 'µg/m³' },
    { name: 'PM10', value: reading.pm10, limit: 100, unit: 'µg/m³' },
    { name: 'NO2', value: reading.no2, limit: 80, unit: 'µg/m³' },
    { name: 'SO2', value: reading.so2, limit: 80, unit: 'µg/m³' },
    { name: 'O3', value: reading.o3, limit: 180, unit: 'µg/m³' },
    { name: 'CO', value: reading.co * 100, limit: 200, unit: 'µg/m³ x100' } // scale CO for chart alignment
  ];

  // Colors based on whether it exceeds limits
  const getBarColor = (val, limit) => {
    return val > limit ? '#ef4444' : '#3b82f6';
  };

  return (
    <div className="w-full h-44">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
          <XAxis 
            dataKey="name" 
            stroke="#94a3b8" 
            fontSize={10} 
            tickLine={false}
          />
          <YAxis 
            stroke="#94a3b8" 
            fontSize={9}
            tickLine={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const dataItem = payload[0].payload;
                const valueDisp = dataItem.name === 'CO' ? (dataItem.value / 100).toFixed(2) : dataItem.value;
                const limitDisp = dataItem.name === 'CO' ? '2.0 mg/m³' : `${dataItem.limit} µg/m³`;
                const unitDisp = dataItem.name === 'CO' ? 'mg/m³' : dataItem.unit;
                
                const isExceeded = dataItem.value > dataItem.limit;
                
                return (
                  <div className="bg-slate-800 border border-slate-700 p-2 rounded-lg shadow-lg text-xs space-y-1 text-slate-200">
                    <p className="font-bold text-white">{dataItem.name}</p>
                    <p>Current: <span className="font-mono text-white font-semibold">{valueDisp} {unitDisp}</span></p>
                    <p>CPCB Limit: <span className="font-mono text-slate-400">{limitDisp}</span></p>
                    <p className={`font-semibold ${isExceeded ? 'text-red-400' : 'text-green-400'}`}>
                      {isExceeded ? '⚠️ Exceeds Limit' : '✓ Safe Range'}
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
                fillOpacity={0.8}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PollutantBreakdown;

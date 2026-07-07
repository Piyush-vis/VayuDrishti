import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const SourcePieChart = ({ attributions }) => {
  if (!attributions) {
    return (
      <div className="h-48 flex items-center justify-center text-xs text-slate-500">
        No attribution data available.
      </div>
    );
  }

  const data = [
    { name: 'Vehicular', value: Math.round(attributions.vehicular * 100), color: '#3b82f6' },
    { name: 'Industrial', value: Math.round(attributions.industrial * 100), color: '#ef4444' },
    { name: 'Construction', value: Math.round(attributions.construction * 100), color: '#f59e0b' },
    { name: 'Biomass Burning', value: Math.round(attributions.biomass_burning * 100), color: '#8b5cf6' },
    { name: 'Other', value: Math.round(attributions.other * 100), color: '#64748b' }
  ];

  return (
    <div className="w-full h-48 flex flex-col justify-center">
      <ResponsiveContainer width="100%" height="80%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={60}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value) => [`${value}%`, 'Contribution']}
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
            itemStyle={{ color: '#fff', fontSize: '11px' }}
          />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Custom Legend to fit small panels */}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2 text-[10px] font-semibold text-slate-300">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
            <span>{item.name}: {item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SourcePieChart;

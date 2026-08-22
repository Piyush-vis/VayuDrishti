import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useTheme } from '../../context/ThemeContext';

const SourcePieChart = ({ attributions }) => {
  const { isDark } = useTheme();

  if (!attributions) {
    return (
      <div className="h-44 flex items-center justify-center text-xs text-[var(--text-muted)] font-heading">
        No source attribution telemetry available.
      </div>
    );
  }

  const data = [
    { name: 'Vehicular', value: Math.round((attributions.vehicular || 0) * 100), color: isDark ? '#38BDF8' : '#0284C7' },
    { name: 'Industrial', value: Math.round((attributions.industrial || 0) * 100), color: isDark ? '#F87171' : '#DC2626' },
    { name: 'Construction', value: Math.round((attributions.construction || 0) * 100), color: isDark ? '#FBBF24' : '#D97706' },
    { name: 'Biomass Burning', value: Math.round((attributions.biomass_burning || 0) * 100), color: isDark ? '#A78BFA' : '#7C3AED' },
    { name: 'Secondary/Other', value: Math.round((attributions.other || 0) * 100), color: isDark ? '#64748B' : '#94A3B8' }
  ].filter(d => d.value > 0);

  return (
    <div className="w-full flex flex-col justify-center space-y-3">
      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={38}
              outerRadius={54}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value) => [`${value}%`, 'Contribution']}
              contentStyle={{
                backgroundColor: isDark ? '#131B2A' : '#FFFFFF',
                borderColor: isDark ? '#233044' : '#E2E8F0',
                borderRadius: '8px',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: isDark ? '#F8FAFC' : '#0F172A'
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      {/* Legend with clean badges */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs font-heading font-medium">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1.5 truncate">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
            <span className="truncate text-[var(--text-secondary)]">{item.name}:</span>
            <span className="font-mono font-bold text-[var(--text-primary)]">{item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SourcePieChart;

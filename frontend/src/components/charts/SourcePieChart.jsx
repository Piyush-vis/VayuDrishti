import React from 'react';
import { Box, Typography } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useTheme } from '@mui/material/styles';

const SourcePieChart = ({ attributions }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  if (!attributions) {
    return (
      <Box sx={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          No source attribution telemetry available.
        </Typography>
      </Box>
    );
  }

  const data = [
    { name: 'Vehicular', value: Math.round((attributions.vehicular || 0) * 100), color: isDark ? '#00B4D8' : '#0284C7' },
    { name: 'Industrial', value: Math.round((attributions.industrial || 0) * 100), color: isDark ? '#CF6679' : '#DC2626' },
    { name: 'Construction', value: Math.round((attributions.construction || 0) * 100), color: isDark ? '#FFB74D' : '#D97706' },
    { name: 'Biomass Burning', value: Math.round((attributions.biomass_burning || 0) * 100), color: isDark ? '#B388FF' : '#7C3AED' },
    { name: 'Secondary/Other', value: Math.round((attributions.other || 0) * 100), color: isDark ? '#78909C' : '#94A3B8' }
  ].filter(d => d.value > 0);

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
      <Box sx={{ height: 140, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={36}
              outerRadius={52}
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
                backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                borderColor: isDark ? '#333333' : '#E2E8F0',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '11px',
                color: isDark ? '#FFFFFF' : '#0F172A',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </Box>
      
      {/* Legend with clean badges */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, width: '100%' }}>
        {data.map((item, idx) => (
          <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden' }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: item.color, flexShrink: 0 }} />
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.name}:
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.6875rem' }}>
              {item.value}%
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default SourcePieChart;

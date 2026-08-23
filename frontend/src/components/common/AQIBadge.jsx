import React from 'react';
import { Chip, Box } from '@mui/material';
import { getAqiCategory } from '../../utils/constants';

const AQIBadge = ({ aqi, showLabel = true, size = 'small' }) => {
  const cat = getAqiCategory(aqi);
  if (!cat) return null;

  const muiColorMap = {
    Good: 'success',
    Satisfactory: 'success',
    Moderate: 'warning',
    Poor: 'warning',
    'Very Poor': 'error',
    Severe: 'error',
    'Severe+': 'error',
  };

  const colorKey = muiColorMap[cat.label] || 'default';

  return (
    <Chip
      size={size === 'lg' ? 'medium' : 'small'}
      color={colorKey}
      variant="filled"
      label={
        showLabel ? (
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            <span>{cat.label}</span>
            <Box component="span" sx={{ opacity: 0.85, fontWeight: 700, fontFamily: 'monospace' }}>
              ({Math.round(aqi)})
            </Box>
          </Box>
        ) : (
          Math.round(aqi)
        )
      }
      sx={{
        borderRadius: 1, // Strict M2 4px radius
        fontWeight: 600,
        fontSize: size === 'lg' ? '0.875rem' : '0.75rem',
      }}
    />
  );
};

export default AQIBadge;

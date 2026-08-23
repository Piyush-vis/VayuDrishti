import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const ShapWaterfall = ({ explanation }) => {
  if (!explanation || !explanation.available) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          Explainability telemetry unavailable for this forecast.
        </Typography>
      </Box>
    );
  }
  const { base_value, predicted_aqi, top_factors, horizon_hours } = explanation;
  const maxAbs = Math.max(...top_factors.map((f) => Math.abs(f.contribution)), 1);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {/* Header baseline vs forecast */}
      <Paper variant="outlined" sx={{ p: 1, display: 'flex', justifyContent: 'space-between', borderRadius: 1, bgcolor: 'background.default' }}>
        <Typography variant="caption" color="text.secondary">
          Base: <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>{base_value}</Box>
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main' }}>
          → H+{horizon_hours}h Forecast: <Box component="span" sx={{ color: 'text.primary' }}>{predicted_aqi}</Box>
        </Typography>
      </Paper>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {top_factors.map((f, i) => {
          const pos = f.contribution >= 0;
          const widthPct = Math.min((Math.abs(f.contribution) / maxAbs) * 45, 45);

          return (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ width: 110, textAlign: 'right', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                title={`${f.label} = ${f.value}`}
              >
                {f.label}
              </Typography>
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', height: 16, position: 'relative', bgcolor: 'action.hover', borderRadius: 0.5 }}>
                <Box sx={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', bgcolor: 'divider' }} />
                {pos ? (
                  <Box
                    sx={{
                      position: 'absolute',
                      left: '50%',
                      height: 10,
                      borderRadius: '0 2px 2px 0',
                      bgcolor: 'error.main',
                      width: `${widthPct}%`,
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      position: 'absolute',
                      right: '50%',
                      height: 10,
                      borderRadius: '2px 0 0 2px',
                      bgcolor: 'success.main',
                      width: `${widthPct}%`,
                    }}
                  />
                )}
              </Box>
              <Typography
                variant="caption"
                sx={{
                  width: 42,
                  textAlign: 'right',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  color: pos ? 'error.main' : 'success.main',
                }}
              >
                {pos ? '+' : ''}{f.contribution}
              </Typography>
            </Box>
          );
        })}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, borderTop: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main' }} />
          <Typography variant="caption" sx={{ fontSize: '0.625rem', color: 'text.secondary' }}>
            Increases AQI (Worsens)
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
          <Typography variant="caption" sx={{ fontSize: '0.625rem', color: 'text.secondary' }}>
            Decreases AQI (Improves)
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default ShapWaterfall;

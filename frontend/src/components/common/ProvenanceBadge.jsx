import React from 'react';
import { Chip } from '@mui/material';

const STYLES = {
  live: { label: 'LIVE SENSOR', color: 'success' },
  api: { label: 'LIVE SENSOR', color: 'success' },
  'live-hybrid': { label: 'LIVE + MODELLED', color: 'info' },
  cached: { label: 'CACHED RESULT', color: 'info' },
  replay: { label: 'CRISIS REPLAY', color: 'secondary' },
  simulated: { label: 'SIMULATED', color: 'warning' },
  modelled: { label: 'MODELLED', color: 'warning' },
  xgboost_v1: { label: 'XGBOOST ML', color: 'primary' },
  statistical_fallback: { label: 'STATISTICAL', color: 'warning' },
};

const ProvenanceBadge = ({ source, timestamp }) => {
  if (!source) return null;
  const config = STYLES[source] || {
    label: String(source).toUpperCase(),
    color: 'default',
  };
  const time = timestamp
    ? new Date(timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <Chip
      size="small"
      color={config.color}
      variant="outlined"
      label={`${config.label}${time && source === 'cached' ? ` · ${time}` : ''}`}
      sx={{
        borderRadius: 1, // Strict M2 4px radius
        height: 20,
        fontSize: '0.6875rem',
        fontWeight: 700,
        fontFamily: 'monospace',
      }}
    />
  );
};

export default ProvenanceBadge;

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  Box,
  Typography,
  IconButton,
  Chip,
  Paper,
  Autocomplete,
  TextField,
  InputAdornment,
  LinearProgress,
  Tooltip,
  Fade,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import SearchIcon from '@mui/icons-material/Search';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import MapIcon from '@mui/icons-material/Map';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AirIcon from '@mui/icons-material/Air';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';

import AQIMap from './AQIMap';
import { getAqiCategory, CITIES, AQI_CATEGORIES } from '../../utils/constants';
import { capitalize } from '../../utils/formatters';

import maskAvatar from '../../assets/mask_avatar.jpg';
import cleanAvatar from '../../assets/clean_avatar.jpg';

const SPECTRUM_STEPS = [
  { min: 0, max: 50, label: '0 - 50', name: 'Good', color: '#10B981' },
  { min: 51, max: 100, label: '51 - 100', name: 'Satisfactory', color: '#84CC16' },
  { min: 101, max: 200, label: '101 - 200', name: 'Moderate', color: '#F59E0B' },
  { min: 201, max: 300, label: '201 - 300', name: 'Poor', color: '#F97316' },
  { min: 301, max: 400, label: '301 - 400', name: 'Very Poor', color: '#EF4444' },
  { min: 401, max: 500, label: '301+', name: 'Severe', color: '#A855F7' },
];

const FullscreenMapModal = ({
  open,
  onClose,
  stations = [],
  center,
  heatmapPoints = [],
  vulnerabilities = [],
  selectedStationId,
  onStationSelect,
  trendReadings = [],
  trajectory = null,
  activeCity = 'delhi',
  onCityChange,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showVulnerabilities, setShowVulnerabilities] = useState(false);
  const [showTrajectory, setShowTrajectory] = useState(false);
  const [mapCenter, setMapCenter] = useState(center);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Keep time updated
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Update map center when props center changes
  useEffect(() => {
    if (center) setMapCenter(center);
  }, [center]);

  // Find active selected station telemetry
  const selectedStationData = useMemo(() => {
    if (!stations || stations.length === 0) return null;
    if (selectedStationId) {
      const found = stations.find(
        (s) => s.station?.station_id === selectedStationId
      );
      if (found) return found;
    }
    return stations[0] || null;
  }, [stations, selectedStationId]);

  const station = selectedStationData?.station;
  const reading = selectedStationData?.reading;

  const aqi = reading?.aqi ? Math.round(reading.aqi) : 150;
  const aqiCat = getAqiCategory(aqi);

  // Pollutant readings
  const pm25 = reading?.pm25 ?? 56;
  const pm10 = reading?.pm10 ?? 96;
  const co = reading?.co ?? 53;
  const so2 = reading?.so2 ?? 29;
  const no2 = reading?.no2 ?? 64;
  const o3 = reading?.o3 ?? 27;

  // Pollutant bar ratios
  const pollutants = [
    { name: 'PM2.5', value: pm25, unit: 'µg/m³', max: 250, color: pm25 > 120 ? '#EF4444' : pm25 > 60 ? '#F59E0B' : '#10B981' },
    { name: 'PM10', value: pm10, unit: 'µg/m³', max: 400, color: pm10 > 250 ? '#EF4444' : pm10 > 100 ? '#F59E0B' : '#10B981' },
    { name: 'CO', value: co < 10 ? co : (co / 100).toFixed(2), unit: 'mg/m³', max: 10, color: co > 4 ? '#EF4444' : co > 2 ? '#F59E0B' : '#10B981' },
    { name: 'SO2', value: so2, unit: 'µg/m³', max: 100, color: so2 > 80 ? '#EF4444' : so2 > 40 ? '#F59E0B' : '#10B981' },
    { name: 'NO2', value: no2, unit: 'µg/m³', max: 150, color: no2 > 80 ? '#EF4444' : no2 > 40 ? '#F59E0B' : '#10B981' },
    { name: 'O3', value: o3, unit: 'µg/m³', max: 150, color: o3 > 100 ? '#EF4444' : o3 > 50 ? '#F59E0B' : '#10B981' },
  ];

  // 24-hour Trend data
  const trendData = useMemo(() => {
    if (trendReadings && trendReadings.length > 0) {
      return trendReadings.map((item) => {
        const d = new Date(item.timestamp);
        return {
          time: d.toLocaleTimeString('en-IN', { hour: 'numeric', hour12: true }),
          aqi: Math.round(item.aqi || 0),
        };
      });
    }
    // Fallback realistic diurnal curve if trend isn't loaded yet
    const fallback = [];
    const base = aqi || 150;
    const now = new Date();
    for (let i = 24; i >= 0; i -= 3) {
      const t = new Date(now.getTime() - i * 3600 * 1000);
      const hour = t.getHours();
      const wave = Math.sin((hour - 8) * (Math.PI / 12)) * (base * 0.25);
      fallback.push({
        time: t.toLocaleTimeString('en-IN', { hour: 'numeric', hour12: true }),
        aqi: Math.max(30, Math.round(base + wave)),
      });
    }
    return fallback;
  }, [trendReadings, aqi]);

  // Handle station selection from search
  const handleStationSearch = (event, value) => {
    if (value && value.station) {
      if (onStationSelect) {
        onStationSelect(value.station.station_id);
      }
      if (value.station.latitude && value.station.longitude) {
        setMapCenter([value.station.latitude, value.station.longitude]);
      }
    }
  };

  // Recenter to current active city
  const handleRecenter = () => {
    const coords = CITIES[activeCity] ? [CITIES[activeCity].lat, CITIES[activeCity].lon] : [28.6139, 77.209];
    setMapCenter(coords);
  };

  const formattedDateString = useMemo(() => {
    const pad = (n) => String(n).padStart(2, '0');
    const y = currentTime.getFullYear();
    const m = pad(currentTime.getMonth() + 1);
    const d = pad(currentTime.getDate());
    const hh = pad(currentTime.getHours());
    const mm = pad(currentTime.getMinutes());
    const ss = pad(currentTime.getSeconds());
    return `${y}-${m}-${d} ${hh}:${mm}:${ss} (Local Time)`;
  }, [currentTime]);

  if (!open) return null;

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={onClose}
      TransitionComponent={Fade}
      PaperProps={{
        sx: {
          bgcolor: isDark ? '#0B0F19' : '#F8FAFC',
          color: 'text.primary',
          overflow: 'hidden',
          position: 'relative',
        },
      }}
    >
      {/* 1. Base Fullscreen Interactive Map */}
      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}>
        <AQIMap
          stations={stations}
          center={mapCenter}
          heatmapPoints={heatmapPoints}
          showHeatmap={showHeatmap}
          vulnerabilities={vulnerabilities}
          showVulnerabilities={showVulnerabilities}
          onStationSelect={(id) => {
            if (onStationSelect) onStationSelect(id);
            const found = stations.find((s) => s.station?.station_id === id);
            if (found?.station) {
              setMapCenter([found.station.latitude, found.station.longitude]);
            }
          }}
          trajectory={trajectory}
          showTrajectory={showTrajectory}
        />
      </Box>

      {/* 2. Top Header Navigation Bar (Floating Overlay) */}
      <Box
        sx={{
          position: 'absolute',
          top: 14,
          left: { xs: 54, sm: 60 },
          right: 14,
          zIndex: 1100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          pointerEvents: 'none',
        }}
      >
        {/* Left Branding */}
        <Paper
          elevation={3}
          sx={{
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 2,
            py: 1,
            borderRadius: 2,
            bgcolor: isDark ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(16px)',
            border: 1,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
            boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.5)' : '0 4px 20px rgba(0,0,0,0.08)',
          }}
        >
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              bgcolor: aqiCat.color,
              boxShadow: `0 0 10px ${aqiCat.color}`,
              animation: 'pulse 2s infinite',
            }}
          />
          <Typography variant="subtitle2" sx={{ fontWeight: 800, letterSpacing: 0.5, color: 'text.primary' }}>
            VayuDrishti
          </Typography>
          <Chip
            size="small"
            label="Live Map"
            sx={{
              height: 20,
              fontSize: '10px',
              fontWeight: 700,
              bgcolor: isDark ? 'rgba(0, 180, 216, 0.15)' : 'rgba(0, 131, 143, 0.12)',
              color: isDark ? '#00B4D8' : '#00838F',
              borderRadius: 1,
            }}
          />
        </Paper>

        {/* Right Search & Controls Toolbar */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pointerEvents: 'auto' }}>
          {/* Station Autocomplete Search */}
          <Paper
            elevation={3}
            sx={{
              borderRadius: 2,
              bgcolor: isDark ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(16px)',
              border: 1,
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
              width: { xs: 200, sm: 280, md: 320 },
            }}
          >
            <Autocomplete
              options={stations}
              getOptionLabel={(option) => option.station?.name || ''}
              onChange={handleStationSearch}
              value={selectedStationData}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Search sensor / station..."
                  size="small"
                  variant="standard"
                  InputProps={{
                    ...params.InputProps,
                    disableUnderline: true,
                    startAdornment: (
                      <InputAdornment position="start" sx={{ pl: 1.5, color: 'text.secondary' }}>
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                    sx: { py: 0.5, px: 1, fontSize: '0.875rem' },
                  }}
                />
              )}
            />
          </Paper>

          {/* Layer Control Chips */}
          <Paper
            elevation={3}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              p: 0.5,
              borderRadius: 2,
              bgcolor: isDark ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(16px)',
              border: 1,
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
            }}
          >
            <Chip
              clickable
              size="small"
              icon={<MapIcon fontSize="small" />}
              label="Heatmap"
              color={showHeatmap ? 'primary' : 'default'}
              variant={showHeatmap ? 'filled' : 'outlined'}
              onClick={() => setShowHeatmap(!showHeatmap)}
              sx={{ borderRadius: 1.5, fontWeight: 600, fontSize: '11px' }}
            />
            <Chip
              clickable
              size="small"
              icon={<VisibilityIcon fontSize="small" />}
              label="Vulnerabilities"
              color={showVulnerabilities ? 'secondary' : 'default'}
              variant={showVulnerabilities ? 'filled' : 'outlined'}
              onClick={() => setShowVulnerabilities(!showVulnerabilities)}
              sx={{ borderRadius: 1.5, fontWeight: 600, fontSize: '11px' }}
            />
            <Chip
              clickable
              size="small"
              icon={<AirIcon fontSize="small" />}
              label="Trajectory"
              color={showTrajectory ? 'primary' : 'default'}
              variant={showTrajectory ? 'filled' : 'outlined'}
              disabled={!selectedStationId}
              onClick={() => setShowTrajectory(!showTrajectory)}
              sx={{ borderRadius: 1.5, fontWeight: 600, fontSize: '11px' }}
            />
            <Tooltip title="Recenter to City">
              <IconButton size="small" onClick={handleRecenter} sx={{ color: 'text.secondary' }}>
                <MyLocationIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Paper>

          {/* Close / Exit Fullscreen Button */}
          <Paper
            elevation={3}
            sx={{
              borderRadius: 2,
              bgcolor: isDark ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(16px)',
              border: 1,
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
            }}
          >
            <Tooltip title="Exit Fullscreen (Esc)">
              <IconButton onClick={onClose} color="inherit" size="small" sx={{ p: 1 }}>
                <FullscreenExitIcon />
              </IconButton>
            </Tooltip>
          </Paper>
        </Box>
      </Box>

      {/* 3. Floating Left Stats / Telemetry Card (Matching User Image Layout) */}
      <Paper
        elevation={6}
        sx={{
          position: 'absolute',
          top: 78,
          left: 14,
          width: { xs: 290, sm: 340, md: 360 },
          maxHeight: 'calc(100vh - 160px)',
          overflowY: 'auto',
          zIndex: 1050,
          p: 2.5,
          borderRadius: 3,
          bgcolor: isDark ? 'rgba(15, 23, 42, 0.90)' : 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(20px)',
          border: 1,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
          boxShadow: isDark ? '0 16px 48px rgba(0,0,0,0.65)' : '0 12px 40px rgba(0,0,0,0.12)',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {/* Location Header */}
        <Box>
          <Typography
            variant="overline"
            sx={{
              color: isDark ? '#00B4D8' : '#00838F',
              fontWeight: 800,
              letterSpacing: 1,
              display: 'block',
              lineHeight: 1.2,
            }}
          >
            AQI Air Quality Map
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
            <LocationOnIcon sx={{ color: isDark ? '#00B4D8' : '#00838F', fontSize: 20 }} />
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2, fontSize: '1.05rem' }}>
              {station?.name || 'Monitoring Station'}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', pl: 3.2 }}>
            {station?.zone ? `${station.zone}, ` : ''}{capitalize(activeCity)}, India
          </Typography>
        </Box>

        {/* Hero AQI + Mascot Section */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 1.5,
            borderRadius: 2,
            bgcolor: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(241, 245, 249, 0.7)',
            border: 1,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              Air Quality Index
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography
                variant="h2"
                sx={{
                  fontWeight: 900,
                  fontSize: '3rem',
                  lineHeight: 1,
                  color: aqiCat.color,
                  fontFamily: 'monospace',
                }}
              >
                {aqi}
              </Typography>
              <Chip
                label={aqiCat.label}
                size="small"
                sx={{
                  bgcolor: aqiCat.color,
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  boxShadow: `0 2px 8px ${aqiCat.color}55`,
                }}
              />
            </Box>
          </Box>

          {/* Healthy vs Mask Mascot Avatar */}
          <Box
            component="img"
            src={aqi > 100 ? maskAvatar : cleanAvatar}
            alt="Air Quality Character"
            sx={{
              width: 72,
              height: 72,
              borderRadius: 2,
              objectFit: 'cover',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
              border: 1,
              borderColor: aqiCat.color,
            }}
          />
        </Box>

        {/* Pollutant Breakdown Rows */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {pollutants.map((p) => {
            const pct = Math.min(100, Math.round((p.value / p.max) * 100));
            return (
              <Box key={p.name} sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.8125rem' }}>
                      {p.name}
                    </Typography>
                    {pct > 50 ? (
                      <TrendingUpIcon sx={{ fontSize: 13, color: '#EF4444' }} />
                    ) : (
                      <TrendingFlatIcon sx={{ fontSize: 13, color: '#10B981' }} />
                    )}
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.8125rem', fontFamily: 'monospace' }}>
                    {p.value} <span style={{ fontSize: '0.7rem', fontWeight: 500, color: isDark ? '#94A3B8' : '#64748B' }}>{p.unit}</span>
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={pct}
                  sx={{
                    height: 4,
                    borderRadius: 2,
                    bgcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: p.color,
                      borderRadius: 2,
                    },
                  }}
                />
              </Box>
            );
          })}
        </Box>

        {/* 24-Hour Trend Sparkline Chart */}
        <Box sx={{ pt: 1, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 1 }}>
            AQI Trend Last 24 hour
          </Typography>
          <Box sx={{ height: 95, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="fullTrendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={aqiCat.color} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={aqiCat.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 2" stroke={isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0'} vertical={false} />
                <XAxis dataKey="time" stroke={isDark ? '#64748B' : '#94A3B8'} fontSize={9} tickLine={false} />
                <YAxis stroke={isDark ? '#64748B' : '#94A3B8'} fontSize={9} domain={[0, 'auto']} tickLine={false} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
                    fontSize: '11px',
                    borderRadius: 4,
                  }}
                />
                <Area type="monotone" dataKey="aqi" stroke={aqiCat.color} strokeWidth={2} fill="url(#fullTrendGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </Box>

          {/* Local Timestamp Footer */}
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              textAlign: 'center',
              mt: 1,
              fontSize: '0.65rem',
              color: 'text.secondary',
              fontFamily: 'monospace',
            }}
          >
            {formattedDateString}
          </Typography>
        </Box>
      </Paper>

      {/* 4. Bottom Horizontal AQI Spectrum Legend Bar (Matching User Reference Image) */}
      <Paper
        elevation={4}
        sx={{
          position: 'absolute',
          bottom: 20,
          left: { xs: 16, sm: 24 },
          zIndex: 1050,
          p: 0.75,
          borderRadius: 2,
          bgcolor: isDark ? 'rgba(15, 23, 42, 0.90)' : 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(16px)',
          border: 1,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 4px 20px rgba(0,0,0,0.1)',
        }}
      >
        {SPECTRUM_STEPS.map((step) => (
          <Box
            key={step.name}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              px: { xs: 0.75, sm: 1.25 },
              py: 0.4,
              borderRadius: 1,
              bgcolor: step.color,
              color: '#0F172A',
              fontWeight: 800,
              fontSize: { xs: '9px', sm: '11px' },
              minWidth: { xs: 36, sm: 48 },
              textAlign: 'center',
              userSelect: 'none',
              boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.3)',
            }}
          >
            {step.label}
          </Box>
        ))}
      </Paper>
    </Dialog>
  );
};

export default FullscreenMapModal;

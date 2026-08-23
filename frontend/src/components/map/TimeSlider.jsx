import React, { useState, useEffect, useRef } from 'react';
import {
  Paper,
  Box,
  Typography,
  IconButton,
  Slider,
  Chip
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useTheme } from '@mui/material/styles';

const TimeSlider = ({ onChange, startHour = -24, endHour = 0 }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [value, setValue] = useState(endHour);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let interval = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setValue((prev) => {
          if (prev >= endHour) {
            return startHour; // loop back
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, startHour, endHour]);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onChangeRef.current(value);
  }, [value]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const resetSlider = () => {
    setIsPlaying(false);
    setValue(endHour);
  };

  const getLabel = (val) => {
    if (val === 0) return 'Live / Current';
    // Show the exact UTC date+time the slider points to (IST-aware)
    const target = new Date(Date.now() + val * 60 * 60 * 1000);
    return target.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <Paper
      elevation={4}
      sx={{
        p: 1.5,
        borderRadius: 1,
        bgcolor: isDark ? 'rgba(30, 30, 30, 0.92)' : 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(12px)',
        border: 1,
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        width: '100%',
        boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.12)',
      }}
    >
      <IconButton
        size="small"
        color="primary"
        onClick={togglePlay}
        title={isPlaying ? 'Pause Timelapse' : 'Play Timelapse'}
        sx={{
          bgcolor: 'primary.main',
          color: '#FFF',
          '&:hover': { bgcolor: 'primary.dark' },
          borderRadius: 1,
          width: 32,
          height: 32,
        }}
      >
        {isPlaying ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
      </IconButton>

      <IconButton
        size="small"
        onClick={resetSlider}
        title="Reset to Live"
        sx={{
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          width: 32,
          height: 32,
          color: 'text.secondary',
          '&:hover': { color: 'text.primary' },
        }}
      >
        <RestartAltIcon fontSize="small" />
      </IconButton>

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.25 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.6875rem' }}>
            {startHour}H (Past)
          </Typography>
          <Chip
            label={getLabel(value)}
            size="small"
            color="primary"
            variant="outlined"
            sx={{
              height: 20,
              fontSize: '0.6875rem',
              fontFamily: 'monospace',
              fontWeight: 700,
              borderRadius: 1,
              bgcolor: isDark ? 'rgba(0, 180, 216, 0.12)' : 'rgba(0, 180, 216, 0.08)',
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.6875rem' }}>
            Live
          </Typography>
        </Box>
        <Slider
          min={startHour}
          max={endHour}
          value={value}
          onChange={(_, val) => {
            setIsPlaying(false);
            setValue(val);
          }}
          size="small"
          color="primary"
          sx={{ py: 0.5 }}
        />
      </Box>
    </Paper>
  );
};

export default TimeSlider;

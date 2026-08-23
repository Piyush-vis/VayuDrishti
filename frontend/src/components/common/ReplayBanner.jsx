import React from 'react';
import {
  Paper,
  Box,
  Typography,
  IconButton,
  Button,
  Slider,
  Chip
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import CloseIcon from '@mui/icons-material/Close';
import HistoryIcon from '@mui/icons-material/History';
import { useReplay } from '../../context/ReplayContext';

const HOUR_MS = 3600 * 1000;
const toDate = (iso) => new Date(iso + 'Z');
const toNaiveIso = (date) => date.toISOString().slice(0, 19);

const ReplayBanner = () => {
  const { episode, replayAt, setReplayAt, exitReplay, playing, setPlaying } = useReplay();
  if (!episode || !replayAt) return null;

  const start = toDate(episode.start);
  const end = toDate(episode.end);
  const totalHours = Math.round((end - start) / HOUR_MS);
  const currentHour = Math.round((toDate(replayAt) - start) / HOUR_MS);

  const istLabel = toDate(replayAt).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <Paper
      square
      elevation={2}
      sx={{
        bgcolor: 'rgba(139, 92, 246, 0.12)',
        borderBottom: 1,
        borderColor: 'rgba(139, 92, 246, 0.3)',
        px: 3,
        py: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        flexWrap: 'wrap',
        zIndex: 1100,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <HistoryIcon sx={{ color: 'secondary.main', fontSize: 20 }} />
        <Typography variant="caption" sx={{ fontWeight: 800, color: 'secondary.main', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          CRISIS REPLAY
        </Typography>
        <Chip label={episode.label} size="small" color="secondary" variant="outlined" sx={{ height: 20, fontSize: '0.6875rem' }} />
      </Box>

      <IconButton
        size="small"
        onClick={() => setPlaying(!playing)}
        sx={{ bgcolor: 'secondary.main', color: '#000', '&:hover': { bgcolor: 'secondary.light' } }}
      >
        {playing ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
      </IconButton>

      <Box sx={{ flexGrow: 1, minWidth: 160, display: 'flex', alignItems: 'center', px: 1 }}>
        <Slider
          size="small"
          min={0}
          max={totalHours}
          value={Math.min(Math.max(currentHour, 0), totalHours)}
          onChange={(_, val) => {
            const next = new Date(start.getTime() + Number(val) * HOUR_MS);
            setReplayAt(toNaiveIso(next));
          }}
          color="secondary"
        />
      </Box>

      <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700, px: 1.5, py: 0.5, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
        {istLabel} IST
      </Typography>

      <Button
        size="small"
        variant="outlined"
        color="inherit"
        startIcon={<CloseIcon />}
        onClick={exitReplay}
        sx={{ height: 28, fontSize: '0.75rem' }}
      >
        Exit Replay
      </Button>
    </Paper>
  );
};

export default ReplayBanner;

import React, { useEffect, useState } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Button, 
  Collapse, 
  Divider, 
  Paper 
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import PeopleIcon from '@mui/icons-material/People';
import SpeedIcon from '@mui/icons-material/Speed';
import SecurityIcon from '@mui/icons-material/Security';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { healthApi } from '../../services/api';
import { useReplay } from '../../context/ReplayContext';
import ProvenanceBadge from '../common/ProvenanceBadge';

const fmt = (n) => (n == null ? '–' : Number(n).toLocaleString('en-IN'));

const HealthImpactPanel = ({ city }) => {
  const { replayAtDebounced } = useReplay();
  const [data, setData] = useState(null);
  const [action, setAction] = useState(null);
  const [showAssumptions, setShowAssumptions] = useState(false);

  useEffect(() => {
    if (!city) return;
    let cancelled = false;
    Promise.all([healthApi.city(city), healthApi.action(city, 30)])
      .then(([c, a]) => { if (!cancelled) { setData(c); setAction(a); } })
      .catch((e) => console.error('Health impact failed:', e));
    return () => { cancelled = true; };
  }, [city, replayAtDebounced]);

  if (!data || !data.available) return null;
  const aqli = data.lenses.aqli;
  const who = data.lenses.who_mortality;

  return (
    <Card elevation={1} sx={{ borderRadius: 1 }}>
      <CardContent sx={{ p: 2.5 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FavoriteIcon fontSize="small" sx={{ color: 'error.main' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: '0.02em' }}>
              PUBLIC HEALTH & DEMOGRAPHIC IMPACT
            </Typography>
          </Box>
          <ProvenanceBadge source={data.provenance === 'replay' ? 'replay' : 'live'} />
        </Box>

        {/* 3 Metric Cards - Symmetrically Stacked and Centered */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
            gap: 2,
            mb: 2,
          }}
        >
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              borderRadius: 1,
              bgcolor: 'background.default',
              minHeight: 105,
            }}
          >
            <PeopleIcon fontSize="small" sx={{ color: 'primary.main', mb: 0.5 }} />
            <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: 'monospace', lineHeight: 1.1, my: 0.5 }}>
              {fmt(data.exposed_population)}
            </Typography>
            <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.05em', lineHeight: 1 }}>
              POPULATION EXPOSED
            </Typography>
          </Paper>

          <Paper
            variant="outlined"
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              borderRadius: 1,
              bgcolor: 'background.default',
              minHeight: 105,
            }}
          >
            <SpeedIcon fontSize="small" sx={{ color: 'warning.main', mb: 0.5 }} />
            <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: 'monospace', lineHeight: 1.1, my: 0.5 }}>
              {aqli.life_years_lost_per_resident}
            </Typography>
            <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.05em', lineHeight: 1 }}>
              LIFE YRS LOST / RESIDENT
            </Typography>
          </Paper>

          <Paper
            variant="outlined"
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              borderRadius: 1,
              bgcolor: 'background.default',
              minHeight: 105,
            }}
          >
            <FavoriteIcon fontSize="small" sx={{ color: 'error.main', mb: 0.5 }} />
            <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: 'monospace', lineHeight: 1.1, my: 0.5 }}>
              {who.excess_deaths_per_day}
            </Typography>
            <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.05em', lineHeight: 1 }}>
              EXCESS MORTALITY / DAY
            </Typography>
          </Paper>
        </Box>

        {/* Summary Description */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Population-weighted PM2.5:{' '}
          <Box component="span" sx={{ fontWeight: 700, color: 'text.primary', fontFamily: 'monospace' }}>
            {data.population_weighted_pm25} µg/m³
          </Box>
          . {aqli.headline}.
        </Typography>

        {/* 30% reduction scenario */}
        {action && (
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              mb: 2,
              borderRadius: 1,
              bgcolor: 'rgba(129, 199, 132, 0.08)',
              borderColor: 'rgba(129, 199, 132, 0.3)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <SecurityIcon fontSize="small" sx={{ color: 'success.main' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'success.main' }}>
                TARGETED ENFORCEMENT IMPACT (-30% PM2.5)
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              <Typography variant="body2" color="text.primary">
                Protects{' '}
                <Box component="span" sx={{ fontWeight: 700, color: 'success.main', fontFamily: 'monospace' }}>
                  {fmt(action.people_protected)}
                </Box>{' '}
                residents
              </Typography>
              <Typography variant="body2" color="text.primary">
                Averts{' '}
                <Box component="span" sx={{ fontWeight: 700, color: 'success.main', fontFamily: 'monospace' }}>
                  ~{action.deaths_averted_per_day}
                </Box>{' '}
                deaths/day
              </Typography>
            </Box>
          </Paper>
        )}

        {/* Methodological assumptions toggle */}
        <Button
          size="small"
          startIcon={<InfoOutlinedIcon />}
          onClick={() => setShowAssumptions(!showAssumptions)}
          sx={{ color: 'text.secondary', typography: 'caption', fontWeight: 600 }}
        >
          {showAssumptions ? 'Hide' : 'Show'} WHO / AQLI Model Parameters
        </Button>

        <Collapse in={showAssumptions}>
          <Divider sx={{ my: 1.5 }} />
          <Box sx={{ typography: 'caption', color: 'text.secondary', fontFamily: 'monospace' }}>
            {Object.entries(data.assumptions).map(([k, v]) => (
              <Box key={k} sx={{ mb: 0.5 }}>
                <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  {k}:
                </Box>{' '}
                {v}
              </Box>
            ))}
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default HealthImpactPanel;

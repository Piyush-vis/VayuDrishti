import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Chip,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  CircularProgress
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import DescriptionIcon from '@mui/icons-material/Description';

import { grapApi } from '../../services/api';
import { useReplay } from '../../context/ReplayContext';
import ProvenanceBadge from '../common/ProvenanceBadge';

const STAGE_COLORS = {
  0: { color: 'success' },
  1: { color: 'warning' },
  2: { color: 'warning' },
  3: { color: 'error' },
  4: { color: 'secondary' },
};

const SIGNAL_LABELS = {
  model_forecast: 'XGBoost multi-horizon forecast',
  trend_projection: 'Trend projection (24h regression)',
  observed: 'Observed threshold breach',
};

const GRAPPanel = ({ city }) => {
  const { replayAtDebounced } = useReplay();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!city) return;
    let cancelled = false;
    setLoading(true);
    grapApi.status(city)
      .then((d) => { if (!cancelled) setStatus(d); })
      .catch((e) => console.error('GRAP status failed:', e))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [city, replayAtDebounced]);

  if (loading && !status) {
    return (
      <Card elevation={1} sx={{ p: 4, textAlign: 'center', borderRadius: 1 }}>
        <CircularProgress size={24} color="primary" sx={{ mb: 1 }} />
        <Typography variant="body2" color="text.secondary">Evaluating GRAP statutory triggers...</Typography>
      </Card>
    );
  }
  if (!status) return null;

  const invoking = status.recommendation === 'INVOKE_IN_ADVANCE';
  const order = status.draft_order;

  return (
    <Card elevation={1} sx={{ borderRadius: 1 }}>
      <CardContent sx={{ p: 2.5 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AccountBalanceIcon sx={{ color: 'primary.main', fontSize: 20 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                GRAP Emergency Trigger Engine
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              {status.is_ncr_statutory
                ? 'Statutory CAQM instrument · Automated advance-invocation order generator'
                : 'Advisory mode (Statutory in Delhi-NCR) · Same threshold engine'}
            </Typography>
          </Box>
          <ProvenanceBadge source={status.provenance === 'replay' ? 'replay' : 'live'} />
        </Box>

        {/* Stage Ladder */}
        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={2.4}>
            <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', borderRadius: 1, bgcolor: 'background.default' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                {status.city_index?.current ?? '–'}
              </Typography>
              <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.625rem' }}>
                CITY INDEX
              </Typography>
            </Paper>
          </Grid>
          {[1, 2, 3, 4].map((s) => {
            const isCurrent = status.current_stage === s;
            const isProjected = invoking && status.projected_stage === s;
            return (
              <Grid item xs={6} sm={2.4} key={s}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    textAlign: 'center',
                    borderRadius: 1,
                    borderColor: isCurrent ? 'error.main' : isProjected ? 'warning.main' : 'divider',
                    bgcolor: isCurrent ? 'rgba(207, 102, 121, 0.12)' : isProjected ? 'rgba(255, 183, 77, 0.12)' : 'background.paper',
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Stage {['I', 'II', 'III', 'IV'][s - 1]}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {['Poor', 'V. Poor', 'Severe', 'Severe+'][s - 1]}
                  </Typography>
                  {isCurrent && <Chip label="ACTIVE" size="small" color="error" sx={{ height: 18, fontSize: '0.625rem', mt: 0.5, borderRadius: 1 }} />}
                  {isProjected && <Chip label="PROJECTED" size="small" color="warning" sx={{ height: 18, fontSize: '0.625rem', mt: 0.5, borderRadius: 1 }} />}
                </Paper>
              </Grid>
            );
          })}
        </Grid>

        {/* Advance Invocation Alert */}
        {invoking && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Forecast crosses {order?.basis?.threshold} in ~{status.crossing_eta_hours}h — Advance Invocation Drafted
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>{status.rationale}</Typography>
            <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
              <Chip icon={<HourglassEmptyIcon />} label={`Lead Time Gained: ${status.lead_time_hours}h`} size="small" color="warning" sx={{ borderRadius: 1 }} />
              <Chip label={`Trigger: ${SIGNAL_LABELS[status.triggered_by] || status.triggered_by}`} size="small" variant="outlined" sx={{ borderRadius: 1 }} />
            </Box>
          </Alert>
        )}

        {!invoking && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {status.rationale}
          </Typography>
        )}

        {/* Draft Order Accordion */}
        {order && (
          <Accordion elevation={1} sx={{ borderRadius: 1, '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <DescriptionIcon fontSize="small" sx={{ color: 'primary.main' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Statutory Draft Invocation Order · {order.order_id}
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={1} sx={{ mb: 2, typography: 'caption', color: 'text.secondary', fontFamily: 'monospace' }}>
                <Grid item xs={6}>Authority: <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>{order.authority}</Box></Grid>
                <Grid item xs={6}>Stage: <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>{order.stage_name}</Box></Grid>
                <Grid item xs={12}>Effective From: <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>{new Date(order.effective_from + 'Z').toLocaleString('en-IN')}</Box></Grid>
              </Grid>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {order.actions.map((a, i) => (
                  <Paper key={i} variant="outlined" sx={{ p: 1.5, borderRadius: 1, bgcolor: 'background.default' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{a.action}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 700 }}>
                      Enforcing Agency: {a.agency}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
};

export default GRAPPanel;

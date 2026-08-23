import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Paper,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert
} from '@mui/material';
import GavelIcon from '@mui/icons-material/Gavel';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { enforcementApi } from '../../services/api';
import { formatDateTime } from '../../utils/formatters';
import { useReplay } from '../../context/ReplayContext';

const EnforcementPanel = ({ city, onRefresh }) => {
  const { replayAtDebounced } = useReplay();
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [analyzingId, setAnalyzingId] = useState(null);
  const [analysisError, setAnalysisError] = useState({});

  const fetchActions = async () => {
    setLoading(true);
    try {
      const data = await enforcementApi.actions(city);
      setActions(data);
    } catch (e) {
      console.error('Failed to fetch enforcement actions: ', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (city) {
      fetchActions();
    }
  }, [city, replayAtDebounced]);

  const handleUpdateStatus = async (id, currentStatus) => {
    let nextStatus = 'assigned';
    if (currentStatus === 'assigned') nextStatus = 'resolved';

    try {
      await enforcementApi.update(id, nextStatus);
      fetchActions();
      if (onRefresh) onRefresh();
    } catch (e) {
      alert('Failed to update status: ' + e.message);
    }
  };

  const handleAnalyze = async (id) => {
    setAnalyzingId(id);
    setAnalysisError((prev) => ({ ...prev, [id]: null }));
    try {
      const updated = await enforcementApi.analyze(id);
      setActions((prev) => prev.map((a) => (a._id === id ? updated : a)));
    } catch (e) {
      setAnalysisError((prev) => ({ ...prev, [id]: e.response?.data?.detail || 'AI analysis unavailable.' }));
    } finally {
      setAnalyzingId(null);
    }
  };

  return (
    <Card elevation={1} sx={{ borderRadius: 1 }}>
      <CardContent sx={{ p: 2.5 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <GavelIcon sx={{ color: 'primary.main', fontSize: 20 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
            Enforcement & Inspection Desk
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Automated CPCB compliance anomaly detection and field patrol directives
        </Typography>

        {loading && actions.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress size={24} color="primary" sx={{ mb: 1 }} />
            <Typography variant="body2" color="text.secondary">Scanning telemetry exceedances...</Typography>
          </Box>
        ) : actions.length === 0 ? (
          <Alert severity="success" sx={{ borderRadius: 1 }}>
            All monitors within normal operating bounds. No active NAAQS breaches detected.
          </Alert>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {actions.map((action) => (
              <Paper key={action._id} variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip
                      label={action.priority === 1 ? 'Critical' : action.priority === 2 ? 'High' : 'Medium'}
                      size="small"
                      color={action.priority === 1 ? 'error' : action.priority === 2 ? 'warning' : 'info'}
                      sx={{ borderRadius: 1, fontWeight: 700 }}
                    />
                    <Chip
                      label={action.status === 'assigned' ? 'Patrol Dispatched' : action.status === 'resolved' ? 'Resolved' : 'Pending Action'}
                      size="small"
                      variant="outlined"
                      color={action.status === 'resolved' ? 'success' : action.status === 'assigned' ? 'primary' : 'default'}
                      sx={{ borderRadius: 1, fontWeight: 700 }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                    {formatDateTime(action.generated_at)}
                  </Typography>
                </Box>

                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  {action.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  {action.description}
                </Typography>

                {/* Evidence Trail */}
                <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5, borderRadius: 1, bgcolor: 'background.default' }}>
                  <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace' }}>
                    Pollutant: <Box component="span" sx={{ fontWeight: 700 }}>{action.evidence.pollutant}</Box> · Recorded: <Box component="span" sx={{ fontWeight: 700, color: 'error.main' }}>{action.evidence.current_level} µg/m³</Box> (Threshold: {action.evidence.threshold})
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', color: 'text.secondary', mt: 0.5 }}>
                    Duration: {action.evidence.duration_hours} consecutive hours · Attribution: {action.evidence.nearby_sources.join(', ')}
                  </Typography>
                </Paper>

                {/* AI Compound Risk Analysis */}
                {action.ai_analysis ? (
                  <Alert severity={action.ai_analysis.compound_risk ? 'error' : 'info'} sx={{ mb: 1.5, borderRadius: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                      AI COMPOUND RISK: {action.ai_analysis.compound_risk ? 'CONFIRMED SEVERE BREACH' : 'ISOLATED ANOMALY'} ({Math.round((action.ai_analysis.confidence || 0) * 100)}% confidence)
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>{action.ai_analysis.rationale}</Typography>
                    {action.ai_analysis.recommended_escalation && (
                      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mt: 0.5, color: 'primary.main' }}>
                        → {action.ai_analysis.recommended_escalation}
                      </Typography>
                    )}
                  </Alert>
                ) : (
                  <Box sx={{ mb: 1.5 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      color="primary"
                      startIcon={analyzingId === action._id ? <CircularProgress size={14} /> : <AutoAwesomeIcon />}
                      onClick={() => handleAnalyze(action._id)}
                      disabled={analyzingId === action._id}
                      sx={{ borderRadius: 1 }}
                    >
                      {analyzingId === action._id ? 'Analyzing with AI...' : 'Inspect Compound Risk (AI)'}
                    </Button>
                  </Box>
                )}

                {/* Action Buttons */}
                {action.status !== 'resolved' && (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      size="small"
                      variant="contained"
                      color={action.status === 'pending' ? 'primary' : 'success'}
                      startIcon={action.status === 'pending' ? <PlayArrowIcon /> : <CheckCircleIcon />}
                      onClick={() => handleUpdateStatus(action._id, action.status)}
                      sx={{ borderRadius: 1 }}
                    >
                      {action.status === 'pending' ? 'Dispatch Field Patrols' : 'Mark Action Resolved'}
                    </Button>
                  </Box>
                )}
              </Paper>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default EnforcementPanel;
